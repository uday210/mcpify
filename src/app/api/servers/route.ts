import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApiKey } from '@/lib/encryption';
import { getOrgId, slugify } from '@/lib/api-helpers';
import { faviconFor } from '@/lib/favicon';

/** GET /api/servers — list the current user's MCP servers. */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	// RLS scopes this to the user's org automatically.
	const { data, error } = await supabase
		.from('mcp_servers')
		.select('*, app_connections(base_url)')
		.order('created_at', { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	const rows = (data || []).map((s: any) => ({
		...s,
		logo_url: s.mode === 'aggregate' ? null : faviconFor(s.app_connections?.base_url),
		app_connections: undefined,
	}));
	return NextResponse.json(rows);
}

/**
 * POST /api/servers — create an MCP server from a connection.
 * Body: { connectionId, name, slug?, description?, transportType, toolNames[] }
 * Copies the selected tools from the connection's catalog (config.tools) into
 * the mcp_tools table, and returns the server with its (one-time) API key.
 */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const orgId = await getOrgId(supabase, user.id);
	if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

	const body = await request.json();
	const { connectionId, name, description, transportType, toolNames } = body;
	const mode = body.mode === 'aggregate' ? 'aggregate' : 'single';
	// Default to requiring auth unless the client explicitly opts out.
	const authRequired = body.authRequired !== false;
	if (!name || !transportType) {
		return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
	}

	// Resolve the tool rows to create + (for single) the bound connection.
	let toolRows: any[] = [];
	let boundConnectionId: string | null = null;

	if (mode === 'aggregate') {
		// Gather tools from every connection in the org, namespaced by connection.
		const { data: conns } = await supabase
			.from('app_connections')
			.select('id, name, config, is_active')
			.eq('is_active', true);
		if (!conns || conns.length === 0) {
			return NextResponse.json({ error: 'No active connections to aggregate' }, { status: 400 });
		}
		const used = new Set<string>();
		for (const c of conns) {
			const prefix = slugify(c.name).replace(/-/g, '_').slice(0, 20);
			const tools: any[] = c.config?.tools || [];
			for (const t of tools) {
				let n = `${prefix}_${t.name}`.slice(0, 60);
				let i = 2;
				while (used.has(n)) n = `${prefix}_${t.name}_${i++}`.slice(0, 60);
				used.add(n);
				toolRows.push({
					app_connection_id: c.id,
					name: n,
					description: `[${c.name}] ${t.description || ''}`.trim(),
					input_schema: t.input_schema || { type: 'object', properties: {} },
					http_method: t.http_method || 'GET',
					path_template: t.path_template || '/',
					param_map: t.param_map || [],
				});
			}
		}
	} else {
		if (!connectionId) {
			return NextResponse.json({ error: 'Missing connection' }, { status: 400 });
		}
		const { data: connection } = await supabase
			.from('app_connections')
			.select('*')
			.eq('id', connectionId)
			.maybeSingle();
		if (!connection) {
			return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
		}
		boundConnectionId = connectionId;
		const catalog: any[] = connection.config?.tools || [];
		const selected =
			Array.isArray(toolNames) && toolNames.length ? catalog.filter((t) => toolNames.includes(t.name)) : catalog;
		toolRows = selected.map((t) => ({
			app_connection_id: null,
			name: t.name,
			description: t.description || null,
			input_schema: t.input_schema || { type: 'object', properties: {} },
			http_method: t.http_method || 'GET',
			path_template: t.path_template || '/',
			param_map: t.param_map || [],
		}));
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
	const slug = await uniqueSlug(supabase, body.slug || name);
	const apiKey = generateApiKey();

	const { data: server, error: serverError } = await supabase
		.from('mcp_servers')
		.insert({
			org_id: orgId,
			app_connection_id: boundConnectionId,
			name,
			slug,
			description: description || null,
			transport_type: transportType,
			base_url: `${appUrl}/api/mcp/${slug}`,
			api_key: apiKey,
			auth_required: authRequired,
			mode,
			enabled_tools: toolRows.map((t) => t.name),
		})
		.select()
		.single();

	if (serverError) {
		return NextResponse.json({ error: serverError.message }, { status: 400 });
	}

	if (toolRows.length) {
		const admin = createAdminClient();
		await admin.from('mcp_tools').insert(toolRows.map((t) => ({ ...t, mcp_server_id: server.id })));
	}

	return NextResponse.json({ ...server, apiKey, toolCount: toolRows.length }, { status: 201 });
}

async function uniqueSlug(supabase: any, raw: string): Promise<string> {
	const base = slugify(raw);
	let candidate = base;
	for (let i = 0; i < 5; i++) {
		const { data } = await supabase.from('mcp_servers').select('id').eq('slug', candidate).maybeSingle();
		if (!data) return candidate;
		candidate = `${base}-${Math.floor(1000 + Math.random() * 9000)}`;
	}
	return `${base}-${Date.now().toString(36)}`;
}
