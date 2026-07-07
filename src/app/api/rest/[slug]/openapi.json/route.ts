import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { appBaseUrl } from '@/lib/mcp-oauth';
import { serverHasInterface } from '@/lib/mcp/interfaces';

export const runtime = 'nodejs';

/**
 * GET /api/rest/:slug/openapi.json — an OpenAPI 3 description of a server's
 * tools, each as POST /{tool}. Lets non-MCP clients (ChatGPT Custom GPT Actions,
 * Zapier, raw HTTP) call the same tools. The schema is public; calls require the
 * server's bearer key.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const admin = createAdminClient();
	// select('*') (not a named column list) so this keeps working before
	// migration 025 adds `interfaces` — naming a missing column errors the query.
	const { data: server } = await admin
		.from('mcp_servers')
		.select('*')
		.eq('slug', slug)
		.maybeSingle();
	if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	if (!serverHasInterface(server, 'rest')) {
		return NextResponse.json({ error: 'REST interface disabled for this server' }, { status: 404 });
	}

	const { data: tools } = await admin
		.from('mcp_tools')
		.select('name, description, input_schema')
		.eq('mcp_server_id', server.id)
		.eq('enabled', true)
		.order('name');

	const base = `${appBaseUrl(request.url)}/api/rest/${slug}`;
	const paths: Record<string, any> = {};
	for (const t of tools || []) {
		paths[`/${t.name}`] = {
			post: {
				operationId: t.name,
				summary: (t.description || t.name).slice(0, 300),
				requestBody: {
					required: true,
					content: { 'application/json': { schema: t.input_schema || { type: 'object', properties: {} } } },
				},
				responses: {
					'200': { description: 'Tool result', content: { 'application/json': { schema: { type: 'object' } } } },
				},
				security: [{ bearerAuth: [] }],
			},
		};
	}

	return NextResponse.json({
		openapi: '3.1.0',
		info: { title: `${server.name} (mcpify)`, description: server.description || 'Tools exposed by an mcpify server.', version: '1.0.0' },
		servers: [{ url: base }],
		paths,
		components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
		security: [{ bearerAuth: [] }],
	});
}
