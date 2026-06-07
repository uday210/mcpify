import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getCatalogConnector } from '@/lib/connectors/catalog';
import { parseSpecString } from '@/lib/connectors/openapi-to-mcp';

/**
 * POST /api/connections/:id/resync — refresh a connection's tool snapshot.
 * Catalog connectors pull the latest tools from the catalog; OpenAPI connectors
 * re-fetch their spec URL. Affects servers created afterwards (use a server's
 * Resync to update an existing server's live tools).
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: conn } = await supabase
		.from('app_connections')
		.select('id, connector_type, config, openapi_spec, app_definitions(slug, config)')
		.eq('id', id)
		.maybeSingle();
	if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	// Carry forward catalog-level flags that may post-date this connection.
	const defConfig = (conn as any).app_definitions?.config || {};
	const extraFlags: Record<string, any> = {};
	if (defConfig.body_encoding) extraFlags.body_encoding = defConfig.body_encoding;
	if (defConfig.static_headers) extraFlags.static_headers = defConfig.static_headers;

	let tools: any[] | null = null;
	if (conn.connector_type === 'catalog') {
		const slug = (conn as any).app_definitions?.slug;
		tools = slug ? getCatalogConnector(slug)?.tools || null : null;
	} else if (conn.connector_type === 'openapi') {
		const src = (conn as any).openapi_spec?.source;
		if (src && /^https?:\/\//.test(src)) {
			try {
				const text = await (await fetch(src)).text();
				tools = parseSpecString(text).tools;
			} catch {
				return NextResponse.json({ error: 'Could not re-fetch the OpenAPI spec.' }, { status: 400 });
			}
		} else {
			return NextResponse.json({ error: 'This OpenAPI connection was created from a pasted spec, so it can’t be auto-resynced.' }, { status: 400 });
		}
	} else {
		return NextResponse.json({ error: 'Manual connections are edited directly, not resynced.' }, { status: 400 });
	}

	if (!tools || !tools.length) return NextResponse.json({ error: 'No tools available to resync.' }, { status: 400 });

	const { error } = await supabase
		.from('app_connections')
		.update({ config: { ...((conn as any).config || {}), ...extraFlags, tools } })
		.eq('id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	return NextResponse.json({ toolCount: tools.length });
}
