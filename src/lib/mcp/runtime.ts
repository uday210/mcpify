import { createAdminClient } from '@/lib/supabase/admin';
import { executeTool } from '@/lib/proxy';
import type { AuthedServer } from '@/lib/mcp/auth';
import {
	JsonRpcRequest,
	JsonRpcResponse,
	rpcResult,
	rpcError,
	isNotification,
	METHOD_NOT_FOUND,
	INVALID_PARAMS,
	INTERNAL_ERROR,
} from '@/lib/mcp/jsonrpc';

const SERVER_VERSION = '0.1.0';
const DEFAULT_PROTOCOL = '2024-11-05';

interface ToolRow {
	name: string;
	description: string | null;
	input_schema: Record<string, any>;
	http_method: string;
	path_template: string;
	param_map: Array<Record<string, any>>;
}

async function loadTools(serverId: string): Promise<ToolRow[]> {
	const admin = createAdminClient();
	const { data } = await admin
		.from('mcp_tools')
		.select('name, description, input_schema, http_method, path_template, param_map')
		.eq('mcp_server_id', serverId)
		.eq('enabled', true)
		.order('name');
	return (data as ToolRow[]) || [];
}

/**
 * Handles a single JSON-RPC request against an authenticated MCP server.
 * Returns the response, or null for notifications (which get no reply).
 */
export async function handleRpc(
	authed: AuthedServer,
	req: JsonRpcRequest
): Promise<JsonRpcResponse | null> {
	const { server } = authed;
	const id = req.id ?? null;
	const started = Date.now();

	try {
		switch (req.method) {
			case 'initialize': {
				const requested = req.params?.protocolVersion;
				return rpcResult(id, {
					protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL,
					capabilities: { tools: { listChanged: false } },
					serverInfo: { name: server.name || server.slug, version: SERVER_VERSION },
					instructions: server.description || undefined,
				});
			}

			case 'notifications/initialized':
			case 'notifications/cancelled':
				return null; // notification, no response

			case 'ping':
				return rpcResult(id, {});

			case 'tools/list': {
				const tools = await loadTools(server.id);
				return rpcResult(id, {
					tools: tools.map((t) => ({
						name: t.name,
						description: t.description || '',
						inputSchema: t.input_schema || { type: 'object', properties: {} },
					})),
				});
			}

			case 'resources/list':
				return rpcResult(id, { resources: [] });

			case 'prompts/list':
				return rpcResult(id, { prompts: [] });

			case 'tools/call': {
				const toolName = req.params?.name;
				const args = req.params?.arguments || {};
				if (!toolName) {
					return rpcError(id, INVALID_PARAMS, 'Missing tool name');
				}

				const tools = await loadTools(server.id);
				const tool = tools.find((t) => t.name === toolName);
				if (!tool) {
					return rpcError(id, INVALID_PARAMS, `Unknown tool: ${toolName}`);
				}

				const result = await executeTool(authed.connection, tool, args);
				await logAccess(server, 'tools/call', toolName, result.isError ? 500 : 200, Date.now() - started);

				return rpcResult(id, {
					content: result.content,
					isError: result.isError,
				});
			}

			default:
				return rpcError(id, METHOD_NOT_FOUND, `Method not found: ${req.method}`);
		}
	} catch (err: any) {
		await logAccess(server, req.method, null, 500, Date.now() - started, err?.message);
		if (isNotification(req)) return null;
		return rpcError(id, INTERNAL_ERROR, err?.message || 'Internal error');
	}
}

async function logAccess(
	server: any,
	method: string,
	resource: string | null,
	statusCode: number,
	durationMs: number,
	errorMessage?: string
) {
	try {
		const admin = createAdminClient();
		await admin.from('mcp_access_logs').insert({
			mcp_server_id: server.id,
			method,
			resource,
			status_code: statusCode,
			duration_ms: durationMs,
			error_message: errorMessage || null,
		});
		await admin
			.from('mcp_servers')
			.update({
				last_accessed_at: new Date().toISOString(),
				access_count: (server.access_count || 0) + 1,
				...(statusCode >= 400
					? { error_count: (server.error_count || 0) + 1, last_error: errorMessage || null }
					: {}),
			})
			.eq('id', server.id);
	} catch {
		// best-effort logging; never fail the request because logging failed
	}
}
