import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { decryptCredentials } from '@/lib/encryption';
import { executeTool } from '@/lib/proxy';
import { DEFAULT_MODELS, LLM_SLUGS } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_STEPS = 6;
const DEFAULT_MAX_TOKENS = 1024;
const DAILY_RUN_CAP = Number(process.env.PLAYGROUND_DAILY_CAP || 300);

// In-memory per-user daily run counter (single-instance; resets on the date roll).
const runCounter = new Map<string, { day: string; count: number }>();
function underDailyCap(userId: string): boolean {
	const day = new Date().toISOString().slice(0, 10);
	const cur = runCounter.get(userId);
	if (!cur || cur.day !== day) {
		runCounter.set(userId, { day, count: 1 });
		return true;
	}
	if (cur.count >= DAILY_RUN_CAP) return false;
	cur.count++;
	return true;
}

/**
 * POST /api/servers/:id/playground — run a tool-calling chat loop against the
 * server's tools, using one of the user's own connected LLMs as the brain.
 * Body: { messages: [{role, content}], model? }. Returns the appended turns.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	// Ownership check via RLS.
	const { data: ownedServer } = await supabase.from('mcp_servers').select('id, name').eq('id', id).maybeSingle();
	if (!ownedServer) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	// Cost guard: cap playground runs per user per day.
	if (!underDailyCap(user.id)) {
		return NextResponse.json({ error: `Daily Playground limit reached (${DAILY_RUN_CAP} runs). Try again tomorrow.` }, { status: 429 });
	}

	const body = await request.json().catch(() => ({}));
	const inputMessages: any[] = Array.isArray(body.messages) ? body.messages : [];
	if (!inputMessages.length) return NextResponse.json({ error: 'No messages' }, { status: 400 });

	const admin = createAdminClient();

	// Find an OpenAI-compatible LLM connection (active, has credentials).
	const { data: defs } = await admin.from('app_definitions').select('id, slug').in('slug', LLM_SLUGS);
	const slugById = new Map((defs || []).map((d: any) => [d.id, d.slug]));
	const orgId = (await admin.from('mcp_servers').select('org_id').eq('id', id).single()).data?.org_id;
	const { data: conns } = await admin
		.from('app_connections')
		.select('id, app_def_id, base_url, credentials, auth_type, config')
		.eq('org_id', orgId)
		.eq('is_active', true);
	const candidates = (conns || []).filter((c: any) => slugById.has(c.app_def_id) && c.credentials);
	// Prefer the explicitly chosen connection (from Settings), else the first.
	const llm = (body.connectionId && candidates.find((c: any) => c.id === body.connectionId)) || candidates[0];
	if (!llm) {
		return NextResponse.json(
			{ error: 'No connected LLM. Connect one under Settings → AI to use the playground.' },
			{ status: 400 }
		);
	}
	const slug = slugById.get(llm.app_def_id)!;
	const model = body.model || DEFAULT_MODELS[slug];
	let apiKey = '';
	try {
		apiKey = decryptCredentials(llm.credentials).value || '';
	} catch {
		/* ignore */
	}
	if (!apiKey) return NextResponse.json({ error: 'LLM connection has no usable API key' }, { status: 400 });

	// Load the server's enabled tools and resolve their connections.
	const { data: tools } = await admin
		.from('mcp_tools')
		.select('name, description, input_schema, http_method, path_template, param_map, app_connection_id')
		.eq('mcp_server_id', id)
		.eq('enabled', true);
	const toolList = tools || [];

	const { data: serverRow } = await admin.from('mcp_servers').select('app_connection_id').eq('id', id).single();
	const connCache = new Map<string, any>();
	const connFor = async (cid: string | null) => {
		const key = cid || serverRow?.app_connection_id;
		if (!key) return null;
		if (connCache.has(key)) return connCache.get(key);
		const { data } = await admin.from('app_connections').select('*').eq('id', key).maybeSingle();
		connCache.set(key, data);
		return data;
	};

	const openaiTools = toolList.map((t: any) => ({
		type: 'function',
		function: { name: t.name, description: (t.description || '').slice(0, 1024), parameters: t.input_schema || { type: 'object', properties: {} } },
	}));

	const messages: any[] = [
		{ role: 'system', content: `You are testing the "${ownedServer.name}" MCP server. Use its tools to answer. Be concise.` },
		...inputMessages.map((m) => ({ role: m.role, content: m.content })),
	];
	const appended: any[] = [];
	const chatUrl = `${(llm.base_url || '').replace(/\/$/, '')}/chat/completions`;

	try {
		for (let step = 0; step < MAX_STEPS; step++) {
			const resp = await fetch(chatUrl, {
				method: 'POST',
				headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model,
					messages,
					tools: openaiTools.length ? openaiTools : undefined,
					tool_choice: openaiTools.length ? 'auto' : undefined,
					max_tokens: Number(body.maxTokens) || DEFAULT_MAX_TOKENS,
				}),
			});
			const data = await resp.json();
			if (!resp.ok) {
				return NextResponse.json({ error: data?.error?.message || `LLM error (HTTP ${resp.status})` }, { status: 400 });
			}
			const msg = data.choices?.[0]?.message;
			if (!msg) return NextResponse.json({ error: 'Empty LLM response' }, { status: 400 });
			messages.push(msg);
			appended.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls || null });

			if (!msg.tool_calls?.length) break;

			for (const call of msg.tool_calls) {
				const tool = toolList.find((t: any) => t.name === call.function?.name);
				let resultText: string;
				if (!tool) {
					resultText = `Error: unknown tool ${call.function?.name}`;
				} else {
					let args: any = {};
					try {
						args = JSON.parse(call.function.arguments || '{}');
					} catch {
						/* ignore */
					}
					const connection = await connFor(tool.app_connection_id);
					if (!connection) resultText = 'Error: no connection for tool';
					else {
						const r = await executeTool(connection, tool, args);
						resultText = r.content?.map((c: any) => c.text).join('\n').slice(0, 6000) || '';
					}
					appended.push({ role: 'tool', name: tool.name, content: resultText, tool_call_id: call.id });
				}
				messages.push({ role: 'tool', tool_call_id: call.id, content: resultText });
			}
		}
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Playground run failed' }, { status: 500 });
	}

	return NextResponse.json({ provider: slug, model, messages: appended });
}
