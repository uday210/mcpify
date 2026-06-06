import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
		.select('id, name, description, http_method, path_template, enabled, input_schema, param_map')
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
