import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/encryption';

/** GET /api/servers/:id — server detail with tools + recent access logs. */
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

	const { data: server } = await supabase
		.from('mcp_servers')
		.select('*, app_connections(name, connector_type, base_url)')
		.eq('id', id)
		.maybeSingle();
	if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const { data: tools } = await supabase
		.from('mcp_tools')
		.select('name, description, http_method, path_template, enabled')
		.eq('mcp_server_id', id)
		.order('name');

	const { data: logs } = await supabase
		.from('mcp_access_logs')
		.select('method, resource, status_code, duration_ms, error_message, client_ip, user_agent, request_body, response_body, created_at')
		.eq('mcp_server_id', id)
		.order('created_at', { ascending: false })
		.limit(200);

	return NextResponse.json({ ...server, tools: tools || [], logs: logs || [] });
}

/** PATCH /api/servers/:id — rename, toggle active, or regenerate the API key. */
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
	if (typeof body.description === 'string') update.description = body.description;
	if (typeof body.is_active === 'boolean') update.is_active = body.is_active;
	if (typeof body.auth_required === 'boolean') update.auth_required = body.auth_required;

	// Switch inbound auth mode (none | api_key | oauth).
	if (['none', 'api_key', 'oauth'].includes(body.authMode)) {
		update.auth_mode = body.authMode;
		update.auth_required = body.authMode !== 'none';
		if (body.authMode === 'oauth') {
			// Ensure client credentials exist when enabling OAuth.
			const { data: cur } = await supabase
				.from('mcp_servers')
				.select('oauth_client_id')
				.eq('id', id)
				.maybeSingle();
			if (!cur?.oauth_client_id) {
				update.oauth_client_id = `mcpify_${generateApiKey().slice(0, 24)}`;
				update.oauth_client_secret = generateApiKey();
			}
		}
	}

	let newKey: string | undefined;
	if (body.regenerateKey) {
		newKey = generateApiKey();
		update.api_key = newKey;
	}
	if (body.regenerateSecret) {
		update.oauth_client_secret = generateApiKey();
	}

	const { data, error } = await supabase
		.from('mcp_servers')
		.update(update)
		.eq('id', id)
		.select('id, name, is_active')
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ...data, ...(newKey ? { apiKey: newKey } : {}) });
}

/** DELETE /api/servers/:id */
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

	const { error } = await supabase.from('mcp_servers').delete().eq('id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
