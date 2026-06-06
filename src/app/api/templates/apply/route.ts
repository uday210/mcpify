import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgId, slugify } from '@/lib/api-helpers';
import { generateApiKey } from '@/lib/encryption';
import { appBaseUrl } from '@/lib/mcp-oauth';
import { buildConnectionInsert } from '@/lib/connectors/build';
import { getTemplate } from '@/lib/templates';

/**
 * POST /api/templates/apply — create a connection + server from a template.
 * The connection is created without credentials, so the user adds their key /
 * authorizes afterwards (we return the connection id to send them there).
 */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const orgId = await getOrgId(supabase, user.id);
	if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const template = getTemplate(body.templateId);
	if (!template) return NextResponse.json({ error: 'Unknown template' }, { status: 400 });

	const { data: def } = await supabase.from('app_definitions').select('auth_type').eq('slug', template.appSlug).maybeSingle();
	if (!def) return NextResponse.json({ error: `App ${template.appSlug} is not available` }, { status: 400 });

	// 1) Build the connection (no credentials — needs setup afterwards).
	let built;
	try {
		built = await buildConnectionInsert(supabase, orgId, {
			connectorType: 'catalog',
			appSlug: template.appSlug,
			name: template.name,
			authType: def.auth_type,
			credentials: {},
			config: {},
		});
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Could not build connection' }, { status: 400 });
	}

	const { data: connection, error: connErr } = await supabase
		.from('app_connections')
		.insert({ ...built.insert, is_active: false })
		.select('id')
		.single();
	if (connErr || !connection) {
		return NextResponse.json({ error: connErr?.message || 'Could not create connection' }, { status: 400 });
	}

	// 2) Create a server exposing the connection's tools.
	const tools: any[] = built.insert.config?.tools || [];
	const slug = await uniqueSlug(supabase, template.name);
	const appUrl = appBaseUrl(request.url);
	const { data: server, error: srvErr } = await supabase
		.from('mcp_servers')
		.insert({
			org_id: orgId,
			app_connection_id: connection.id,
			name: template.name,
			slug,
			transport_type: template.transport,
			base_url: `${appUrl}/api/mcp/${slug}`,
			api_key: generateApiKey(),
			auth_required: true,
			auth_mode: 'api_key',
			mode: 'single',
			enabled_tools: tools.map((t) => t.name),
		})
		.select('id')
		.single();
	if (srvErr || !server) {
		return NextResponse.json({ error: srvErr?.message || 'Could not create server' }, { status: 400 });
	}

	if (tools.length) {
		const admin = createAdminClient();
		await admin.from('mcp_tools').insert(
			tools.map((t) => ({
				mcp_server_id: server.id,
				app_connection_id: null,
				name: t.name,
				description: t.description || null,
				input_schema: t.input_schema || { type: 'object', properties: {} },
				http_method: t.http_method || 'GET',
				path_template: t.path_template || '/',
				param_map: t.param_map || [],
			}))
		);
	}

	return NextResponse.json({ connectionId: connection.id, serverId: server.id }, { status: 201 });
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
