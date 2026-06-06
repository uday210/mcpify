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

// In-memory sliding-window rate limiter (per server). Matches the single-instance
// deployment assumption already used for SSE sessions.
const rateWindows = new Map<string, number[]>();

/** Returns true if this call is allowed; records it. limit<=0 means unlimited. */
function allowRequest(serverId: string, limit: number): boolean {
	if (!limit || limit <= 0) return true;
	const now = Date.now();
	const cutoff = now - 60_000;
	const hits = (rateWindows.get(serverId) || []).filter((t) => t > cutoff);
	if (hits.length >= limit) {
		rateWindows.set(serverId, hits);
		return false;
	}
	hits.push(now);
	rateWindows.set(serverId, hits);
	return true;
}

/** Fire a webhook alert when a call errors, if the org has alerts enabled. */
async function maybeAlert(server: any, resource: string | null, statusCode: number, errorMessage?: string) {
	if (statusCode < 400) return;
	try {
		const admin = createAdminClient();
		const { data: org } = await admin
			.from('organizations')
			.select('notification_config')
			.eq('id', server.org_id)
			.maybeSingle();
		const cfg = (org as any)?.notification_config || {};
		if (!cfg.alert_on_error || !cfg.webhook_url) return;
		// Fire-and-forget; never block the response on the webhook.
		void fetch(cfg.webhook_url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'mcpify.tool_error',
				server: server.slug,
				server_name: server.name,
				tool: resource,
				status_code: statusCode,
				error: errorMessage || null,
				at: new Date().toISOString(),
			}),
		}).catch(() => {});
	} catch {
		/* best-effort */
	}
}

interface ToolRow {
	name: string;
	description: string | null;
	input_schema: Record<string, any>;
	http_method: string;
	path_template: string;
	param_map: Array<Record<string, any>>;
	app_connection_id: string | null;
}

async function loadTools(serverId: string): Promise<ToolRow[]> {
	const admin = createAdminClient();
	const { data } = await admin
		.from('mcp_tools')
		.select('name, description, input_schema, http_method, path_template, param_map, app_connection_id')
		.eq('mcp_server_id', serverId)
		.eq('enabled', true)
		.order('name');
	return (data as ToolRow[]) || [];
}

async function loadConnection(id: string): Promise<any> {
	const admin = createAdminClient();
	const { data } = await admin.from('app_connections').select('*').eq('id', id).maybeSingle();
	return data;
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
	let reqBody: any = null;
	let respText: string | null = null;

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
				// Per-server rate limit (calls/min).
				if (!allowRequest(server.id, server.rate_limit_per_min || 0)) {
					statusCode = 429;
					errorMessage = `Rate limit exceeded (${server.rate_limit_per_min}/min)`;
					response = rpcError(id, -32000, errorMessage);
					break;
				}
				const tools = await loadTools(server.id);
				const tool = tools.find((t) => t.name === toolName);
				if (!tool) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `Unknown tool: ${toolName}`);
					break;
				}
				// Aggregate servers route each tool to its own connection.
				const connection = tool.app_connection_id
					? await loadConnection(tool.app_connection_id)
					: authed.connection;
				if (!connection) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `No connection for tool: ${toolName}`);
					break;
				}
				const result = await executeTool(connection, tool, args);
				statusCode = result.isError ? 502 : 200;
				reqBody = args;
				respText = result.content?.map((c: any) => c.text).join('\n').slice(0, 8000) || null;
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
		await logAccess(server, req.method, resource, statusCode, Date.now() - started, errorMessage, meta, reqBody, respText);
		if (req.method === 'tools/call') await maybeAlert(server, resource, statusCode, errorMessage);
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
	meta: RequestMeta = {},
	requestBody: any = null,
	responseBody: string | null = null
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
			request_body: requestBody || null,
			response_body: responseBody || null,
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
