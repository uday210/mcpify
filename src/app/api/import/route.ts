import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrgId, slugify } from '@/lib/api-helpers';
import { generateApiKey } from '@/lib/encryption';
import { appBaseUrl } from '@/lib/mcp-oauth';

/**
 * POST /api/import — recreate connections + servers from an /api/export payload.
 * Connections are created inactive (no credentials are carried), so the user
 * re-enters secrets / re-authorizes afterwards. Existing names are reused, not
 * duplicated.
 */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const orgId = await getOrgId(supabase, user.id);
	if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

	let payload: any;
	try {
		payload = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	if (payload?.kind !== 'mcpify-export' || !Array.isArray(payload.connections)) {
		return NextResponse.json({ error: 'Not a valid mcpify export file' }, { status: 400 });
	}

	const result = { connectionsCreated: 0, connectionsSkipped: 0, serversCreated: 0, serversSkipped: 0 };

	// Map connection name -> id (existing + newly created).
	const { data: existing } = await supabase.from('app_connections').select('id, name');
	const byName = new Map<string, string>((existing || []).map((c: any) => [c.name, c.id]));

	for (const c of payload.connections) {
		if (!c?.name) continue;
		if (byName.has(c.name)) {
			result.connectionsSkipped++;
			continue;
		}
		let appDefId: string | null = null;
		if (c.app_slug) {
			const { data: def } = await supabase.from('app_definitions').select('id').eq('slug', c.app_slug).maybeSingle();
			appDefId = def?.id || null;
		}
		const { data: inserted, error } = await supabase
			.from('app_connections')
			.insert({
				org_id: orgId,
				app_def_id: appDefId,
				name: c.name,
				connector_type: c.connector_type || 'catalog',
				auth_type: c.auth_type || 'api_key',
				base_url: c.base_url || '',
				config: c.config || {},
				credentials: null,
				is_active: false, // no secrets imported — needs setup
			})
			.select('id')
			.single();
		if (error || !inserted) {
			result.connectionsSkipped++;
			continue;
		}
		byName.set(c.name, inserted.id);
		result.connectionsCreated++;
	}

	// Recreate single-mode servers bound to their named connection.
	const appUrl = appBaseUrl(request.url);
	const admin = createAdminClient();
	for (const s of payload.servers || []) {
		if (!s?.name || s.mode === 'aggregate') {
			result.serversSkipped++;
			continue;
		}
		const connId = s.connection_name ? byName.get(s.connection_name) : null;
		if (!connId) {
			result.serversSkipped++;
			continue;
		}
		const { data: conn } = await supabase.from('app_connections').select('config').eq('id', connId).maybeSingle();
		const catalog: any[] = conn?.config?.tools || [];
		const names: string[] = Array.isArray(s.tool_names) && s.tool_names.length ? s.tool_names : catalog.map((t) => t.name);
		const selected = catalog.filter((t) => names.includes(t.name));

		const slug = await uniqueSlug(supabase, s.name);
		const authMode = ['none', 'api_key', 'oauth'].includes(s.auth_mode) ? s.auth_mode : 'api_key';
		const { data: server, error } = await supabase
			.from('mcp_servers')
			.insert({
				org_id: orgId,
				app_connection_id: connId,
				name: s.name,
				slug,
				transport_type: s.transport_type || 'http_stream',
				base_url: `${appUrl}/api/mcp/${slug}`,
				api_key: generateApiKey(),
				auth_required: authMode !== 'none',
				auth_mode: authMode,
				mode: 'single',
				enabled_tools: selected.map((t) => t.name),
			})
			.select('id')
			.single();
		if (error || !server) {
			result.serversSkipped++;
			continue;
		}
		if (selected.length) {
			await admin.from('mcp_tools').insert(
				selected.map((t) => ({
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
		result.serversCreated++;
	}

	return NextResponse.json(result);
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
