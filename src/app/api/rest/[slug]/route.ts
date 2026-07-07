import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appBaseUrl } from '@/lib/mcp-oauth';
import { serverHasInterface } from '@/lib/mcp/interfaces';

export const runtime = 'nodejs';

/**
 * GET /api/rest/:slug — a friendly index for the REST facade base URL. The base
 * itself isn't a callable endpoint (tools live at POST /api/rest/:slug/:tool),
 * so instead of a bare 404 we describe how to use it and link the OpenAPI spec.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const admin = createAdminClient();
	const { data: server } = await admin.from('mcp_servers').select('*').eq('slug', slug).maybeSingle();
	if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	if (!serverHasInterface(server, 'rest')) {
		return NextResponse.json({ error: 'REST interface disabled for this server' }, { status: 404 });
	}

	const { data: tools } = await admin
		.from('mcp_tools')
		.select('name, description, http_method')
		.eq('mcp_server_id', server.id)
		.eq('enabled', true)
		.order('name');

	const base = `${appBaseUrl(request.url)}/api/rest/${slug}`;
	return NextResponse.json({
		name: server.name,
		description: server.description || undefined,
		openapi: `${base}/openapi.json`,
		usage: 'Each tool is POST /api/rest/{slug}/{tool} with a JSON body of its arguments. Send your bearer/API key in the Authorization header.',
		endpoints: (tools || []).map((t: any) => ({
			method: 'POST',
			url: `${base}/${t.name}`,
			tool: t.name,
			description: t.description || undefined,
		})),
	});
}
