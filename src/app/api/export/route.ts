import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/export — a portable, secret-free snapshot of the user's connections
 * and servers, rich enough for /api/import to recreate them. Credentials, OAuth
 * tokens and client secrets are deliberately excluded.
 */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: conns } = await supabase
		.from('app_connections')
		.select('id, name, connector_type, auth_type, base_url, config, app_definitions(slug)')
		.order('created_at');

	const { data: servers } = await supabase
		.from('mcp_servers')
		.select('name, transport_type, mode, auth_mode, enabled_tools, app_connections(name)')
		.order('created_at');

	const connections = (conns || []).map((c: any) => ({
		name: c.name,
		connector_type: c.connector_type,
		auth_type: c.auth_type,
		base_url: c.base_url,
		app_slug: c.app_definitions?.slug || null,
		config: safeConfig(c.config),
	}));

	const serverDefs = (servers || []).map((s: any) => ({
		name: s.name,
		transport_type: s.transport_type,
		mode: s.mode || 'single',
		auth_mode: s.auth_mode || 'api_key',
		connection_name: s.app_connections?.name || null,
		tool_names: Array.isArray(s.enabled_tools) ? s.enabled_tools : [],
	}));

	return NextResponse.json({
		version: 1,
		kind: 'mcpify-export',
		exported_at: new Date().toISOString(),
		connections,
		servers: serverDefs,
	});
}

/** Strip secrets from a connection config, keeping everything needed to rebuild. */
function safeConfig(config: any): any {
	if (!config || typeof config !== 'object') return {};
	const { oauth, ...rest } = config;
	const out: any = { ...rest };
	if (oauth && typeof oauth === 'object') {
		const { client_secret, pkce_verifier, ...safeOauth } = oauth;
		out.oauth = safeOauth;
	}
	return out;
}
