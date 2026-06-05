import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApiKey } from '@/lib/encryption';
import { getOrgId, slugify } from '@/lib/api-helpers';

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
		.select('*')
		.order('created_at', { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data || []);
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
	if (!connectionId || !name || !transportType) {
		return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
	}

	// Verify the connection belongs to the user (RLS-scoped query).
	const { data: connection } = await supabase
		.from('app_connections')
		.select('*')
		.eq('id', connectionId)
		.maybeSingle();
	if (!connection) {
		return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
	const slug = await uniqueSlug(supabase, body.slug || name);
	const apiKey = generateApiKey();

	const { data: server, error: serverError } = await supabase
		.from('mcp_servers')
		.insert({
			org_id: orgId,
			app_connection_id: connectionId,
			name,
			slug,
			description: description || null,
			transport_type: transportType,
			base_url: `${appUrl}/api/mcp/${slug}`,
			api_key: apiKey,
			enabled_tools: toolNames || [],
		})
		.select()
		.single();

	if (serverError) {
		return NextResponse.json({ error: serverError.message }, { status: 400 });
	}

	// Copy selected tools from the connection catalog into mcp_tools.
	const catalog: any[] = connection.config?.tools || [];
	const selected = Array.isArray(toolNames) && toolNames.length
		? catalog.filter((t) => toolNames.includes(t.name))
		: catalog;

	if (selected.length) {
		const admin = createAdminClient();
		await admin.from('mcp_tools').insert(
			selected.map((t) => ({
				mcp_server_id: server.id,
				name: t.name,
				description: t.description || null,
				input_schema: t.input_schema || { type: 'object', properties: {} },
				http_method: t.http_method || 'GET',
				path_template: t.path_template || '/',
				param_map: t.param_map || [],
			}))
		);
	}

	return NextResponse.json({ ...server, apiKey, toolCount: selected.length }, { status: 201 });
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
