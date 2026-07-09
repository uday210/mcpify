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
		.select('name, description, input_schema, http_method')
		.eq('mcp_server_id', server.id)
		.eq('enabled', true)
		.order('name');

	const base = `${appBaseUrl(request.url)}/api/rest/${slug}`;
	const paths: Record<string, any> = {};
	for (const t of tools || []) {
		// Advertise each tool under its configured HTTP method. GET takes its
		// arguments as query parameters (a request body on GET is discouraged);
		// every other method takes them as a JSON body.
		const method = (t.http_method || 'POST').toLowerCase();
		const schema = t.input_schema || { type: 'object', properties: {} };
		const op: Record<string, any> = {
			operationId: t.name,
			summary: (t.description || t.name).slice(0, 300),
			responses: {
				'200': { description: 'Tool result', content: { 'application/json': { schema: { type: 'object' } } } },
			},
			security: [{ bearerAuth: [] }],
		};
		if (method === 'get') {
			const props = schema.properties && typeof schema.properties === 'object' ? schema.properties : {};
			const required = new Set(Array.isArray(schema.required) ? schema.required : []);
			op.parameters = Object.entries(props).map(([name, s]: [string, any]) => ({
				name,
				in: 'query',
				required: required.has(name),
				schema: s && typeof s === 'object' ? s : { type: 'string' },
				...(s && typeof s === 'object' && s.description ? { description: s.description } : {}),
			}));
		} else {
			op.requestBody = { required: true, content: { 'application/json': { schema } } };
		}
		paths[`/${t.name}`] = { [method]: op };
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
