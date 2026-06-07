import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCatalogConnector } from '@/lib/connectors/catalog';

/**
 * POST /api/servers/:id/resync — refresh a server's tools from the latest
 * catalog (single-mode servers). New tools are added; existing tools keep their
 * enabled state, custom name/description and approval flag; composite tools are
 * left untouched. Nothing is deleted.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: server } = await supabase.from('mcp_servers').select('id, mode, app_connection_id').eq('id', id).maybeSingle();
	if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	if (server.mode === 'aggregate') {
		return NextResponse.json({ error: 'Resync is available for single-connection servers only.' }, { status: 400 });
	}
	if (!server.app_connection_id) {
		return NextResponse.json({ error: 'Server has no bound connection.' }, { status: 400 });
	}

	const admin = createAdminClient();
	const { data: conn } = await admin
		.from('app_connections')
		.select('id, connector_type, config, app_definitions(slug)')
		.eq('id', server.app_connection_id)
		.maybeSingle();
	if (!conn) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });

	// Freshest tools: catalog connectors pull live from the catalog; others use
	// the connection's stored config.tools.
	const slug = (conn as any).app_definitions?.slug;
	const catalog = slug ? getCatalogConnector(slug) : null;
	const fresh: any[] = catalog?.tools || (conn as any).config?.tools || [];
	if (!fresh.length) return NextResponse.json({ error: 'No catalog tools available to resync from.' }, { status: 400 });

	// Keep the connection's snapshot current too (helps new servers).
	if (catalog) {
		await admin.from('app_connections').update({ config: { ...((conn as any).config || {}), tools: fresh } }).eq('id', conn.id);
	}

	const { data: existingRows } = await admin
		.from('mcp_tools')
		.select('id, name, enabled, description, requires_approval, composite_steps')
		.eq('mcp_server_id', id);
	const existing = new Map((existingRows || []).map((t: any) => [t.name, t]));

	let added = 0;
	let updated = 0;
	for (const t of fresh) {
		const prev: any = existing.get(t.name);
		const baseRow = {
			http_method: t.http_method || 'GET',
			path_template: t.path_template || '/',
			param_map: t.param_map || [],
			input_schema: t.input_schema || { type: 'object', properties: {} },
		};
		if (prev) {
			if (prev.composite_steps) continue; // never overwrite a composite tool
			await admin
				.from('mcp_tools')
				.update({ ...baseRow, description: prev.description || t.description || null })
				.eq('id', prev.id);
			updated++;
		} else {
			await admin.from('mcp_tools').insert({
				mcp_server_id: id,
				name: t.name,
				description: t.description || null,
				enabled: true,
				...baseRow,
			});
			added++;
		}
	}

	// Refresh enabled_tools for display/counts.
	const { data: enabled } = await admin.from('mcp_tools').select('name').eq('mcp_server_id', id).eq('enabled', true);
	await admin.from('mcp_servers').update({ enabled_tools: (enabled || []).map((e: any) => e.name) }).eq('id', id);

	return NextResponse.json({ added, updated, total: fresh.length });
}
