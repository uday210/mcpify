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
export interface RequestMeta {
	clientIp?: string | null;
	userAgent?: string | null;
}

export async function handleRpc(
	authed: AuthedServer,
	req: JsonRpcRequest,
	meta: RequestMeta = {}
): Promise<JsonRpcResponse | null> {
	const { server } = authed;
	const id = req.id ?? null;
	const started = Date.now();
	let resource: string | null = null;
	let statusCode = 200;
	let errorMessage: string | undefined;
	let response: JsonRpcResponse | null;

	try {
		switch (req.method) {
			case 'initialize': {
				const requested = req.params?.protocolVersion;
				response = rpcResult(id, {
					protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL,
					capabilities: { tools: { listChanged: false } },
					serverInfo: { name: server.name || server.slug, version: SERVER_VERSION },
					instructions: server.description || undefined,
				});
				break;
			}

			case 'notifications/initialized':
			case 'notifications/cancelled':
				return null; // notification, no response, not logged

			case 'ping':
				return rpcResult(id, {}); // health check, not logged

			case 'tools/list': {
				const tools = await loadTools(server.id);
				response = rpcResult(id, {
					tools: tools.map((t) => ({
						name: t.name,
						description: t.description || '',
						inputSchema: t.input_schema || { type: 'object', properties: {} },
					})),
				});
				break;
			}

			case 'resources/list':
				response = rpcResult(id, { resources: [] });
				break;

			case 'prompts/list':
				response = rpcResult(id, { prompts: [] });
				break;

			case 'tools/call': {
				const toolName = req.params?.name;
				resource = toolName || null;
				const args = req.params?.arguments || {};
				if (!toolName) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, 'Missing tool name');
					break;
				}
				const tools = await loadTools(server.id);
				const tool = tools.find((t) => t.name === toolName);
				if (!tool) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `Unknown tool: ${toolName}`);
					break;
				}
				const result = await executeTool(authed.connection, tool, args);
				statusCode = result.isError ? 502 : 200;
				response = rpcResult(id, { content: result.content, isError: result.isError });
				break;
			}

			default:
				statusCode = 404;
				response = rpcError(id, METHOD_NOT_FOUND, `Method not found: ${req.method}`);
		}
	} catch (err: any) {
		statusCode = 500;
		errorMessage = err?.message || 'Internal error';
		response = isNotification(req) ? null : rpcError(id, INTERNAL_ERROR, errorMessage || 'Internal error');
	}

	// Log meaningful calls (skip the chatty initialize/ping health traffic).
	if (req.method === 'tools/call' || req.method === 'tools/list') {
		await logAccess(server, req.method, resource, statusCode, Date.now() - started, errorMessage, meta);
	}

	return response;
}

async function logAccess(
	server: any,
	method: string,
	resource: string | null,
	statusCode: number,
	durationMs: number,
	errorMessage?: string,
	meta: RequestMeta = {}
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
			client_ip: meta.clientIp || null,
			user_agent: meta.userAgent || null,
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
