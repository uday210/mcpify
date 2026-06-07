import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * POST /api/servers/:id/tools — create a composite tool (a sequence of other
 * tools). Body: { name, description?, arguments?, steps: [{tool, args}] }.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { data: owned } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const name = String(body.name || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
	if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
	const steps = Array.isArray(body.steps) ? body.steps.filter((s: any) => s && s.tool) : [];
	if (!steps.length) return NextResponse.json({ error: 'Add at least one step' }, { status: 400 });

	// arguments -> JSON schema
	let argList: any[] = [];
	if (typeof body.arguments === 'string') argList = body.arguments.split(',').map((s: string) => ({ name: s.trim() }));
	else if (Array.isArray(body.arguments)) argList = body.arguments;
	const properties: Record<string, any> = {};
	const required: string[] = [];
	for (const a of argList) {
		const n = (typeof a === 'string' ? a : a?.name || '').trim();
		if (!n) continue;
		properties[n] = { type: 'string' };
		if (a?.required !== false) required.push(n);
	}

	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_tools')
		.insert({
			mcp_server_id: id,
			name,
			description: (body.description || '').slice(0, 500) || null,
			input_schema: { type: 'object', properties, ...(required.length ? { required } : {}) },
			http_method: 'POST',
			path_template: '/',
			param_map: [],
			enabled: true,
			composite_steps: steps.map((s: any) => ({ tool: String(s.tool), args: s.args && typeof s.args === 'object' ? s.args : {} })),
		})
		.select('id, name')
		.single();

	if (error) {
		const msg = /composite_steps/.test(error.message)
			? 'Composite tools need migration 023. Run it in your Supabase SQL editor.'
			: error.message;
		return NextResponse.json({ error: msg }, { status: 400 });
	}

	// keep enabled_tools in sync
	const { data: enabled } = await admin.from('mcp_tools').select('name').eq('mcp_server_id', id).eq('enabled', true);
	await admin.from('mcp_servers').update({ enabled_tools: (enabled || []).map((e: any) => e.name) }).eq('id', id);

	return NextResponse.json(data, { status: 201 });
}

/** GET /api/servers/:id/tools — full tool list (with ids) for curation. */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data, error } = await supabase
		.from('mcp_tools')
		.select('*')
		.eq('mcp_server_id', id)
		.order('name');

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data || []);
}

/**
 * PATCH /api/servers/:id/tools — bulk enable/disable + rename tools.
 * Body: { tools: [{ id, enabled?, name? }] }. RLS scopes writes to the owner.
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const tools: any[] = Array.isArray(body.tools) ? body.tools : [];

	for (const t of tools) {
		if (!t.id) continue;
		const update: Record<string, any> = {};
		if (typeof t.enabled === 'boolean') update.enabled = t.enabled;
		if (typeof t.name === 'string' && t.name.trim()) {
			update.name = t.name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
		}
		if (typeof t.description === 'string') update.description = t.description.slice(0, 500);
		if (typeof t.requires_approval === 'boolean') update.requires_approval = t.requires_approval;
		if (Object.keys(update).length === 0) continue;
		await supabase.from('mcp_tools').update(update).eq('id', t.id).eq('mcp_server_id', id);
	}

	// Keep enabled_tools on the server in sync (used for display/counts).
	const { data: enabled } = await supabase
		.from('mcp_tools')
		.select('name')
		.eq('mcp_server_id', id)
		.eq('enabled', true);
	await supabase
		.from('mcp_servers')
		.update({ enabled_tools: (enabled || []).map((e: any) => e.name) })
		.eq('id', id);

	return NextResponse.json({ ok: true });
}
