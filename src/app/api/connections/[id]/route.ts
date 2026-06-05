import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { faviconFor } from '@/lib/favicon';

/** GET /api/connections/:id — connection detail, tools, and servers using it. */
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
		.from('app_connections')
		.select('id, name, auth_type, connector_type, base_url, is_active, last_verified_at, error_message, config, created_at')
		.eq('id', id)
		.maybeSingle();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	// Servers using this connection: directly bound (single) + via aggregate tools.
	const { data: direct } = await supabase
		.from('mcp_servers')
		.select('id, name, slug, mode, is_active, access_count')
		.eq('app_connection_id', id);

	const { data: viaTools } = await supabase
		.from('mcp_tools')
		.select('mcp_servers(id, name, slug, mode, is_active, access_count)')
		.eq('app_connection_id', id);

	const byId = new Map<string, any>();
	for (const s of direct || []) byId.set(s.id, s);
	for (const row of viaTools || []) {
		const s = (row as any).mcp_servers;
		if (s && !byId.has(s.id)) byId.set(s.id, s);
	}

	const tools = Array.isArray((data as any).config?.tools) ? (data as any).config.tools : [];
	return NextResponse.json({
		...data,
		logo_url: faviconFor((data as any).base_url),
		tools,
		servers: Array.from(byId.values()),
		config: undefined,
	});
}

/** PATCH /api/connections/:id — rename / toggle active. */
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
	const update: Record<string, any> = {};
	if (typeof body.name === 'string') update.name = body.name;
	if (typeof body.is_active === 'boolean') update.is_active = body.is_active;

	const { data, error } = await supabase
		.from('app_connections')
		.update(update)
		.eq('id', id)
		.select('id, name, is_active')
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}

/** DELETE /api/connections/:id */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { error } = await supabase.from('app_connections').delete().eq('id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
