import { createAdminClient } from '@/lib/supabase/admin';
import { executeTool } from '@/lib/proxy';
import { redactObject, redactText } from '@/lib/mcp/redact';
import { buildStepArgs, type CompositeCtx } from '@/lib/mcp/composite';
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
const PAGE_SIZE = 100;

/** Opaque-cursor pagination over an array (MCP tools/list, resources/list). */
function paginate<T>(items: T[], cursor?: string): { page: T[]; nextCursor?: string } {
	let offset = 0;
	if (cursor) {
		const n = parseInt(Buffer.from(cursor, 'base64').toString('utf8'), 10);
		if (Number.isFinite(n) && n > 0) offset = n;
	}
	const page = items.slice(offset, offset + PAGE_SIZE);
	const next = offset + PAGE_SIZE;
	return { page, nextCursor: next < items.length ? Buffer.from(String(next)).toString('base64') : undefined };
}

/** Built-in prompt templates generated from the server + its tools. */
function buildPrompts(server: any, tools: ToolRow[]) {
	return [
		{
			name: 'getting_started',
			description: `Orient an assistant to the ${server.name || server.slug} MCP server and its tools.`,
		},
		{
			name: 'run_tool',
			description: 'Guidance for calling a specific tool on this server.',
			arguments: [{ name: 'tool', description: 'The tool name to use', required: true }],
		},
	];
}

function renderPrompt(name: string, server: any, tools: ToolRow[], args: Record<string, any>) {
	const label = server.name || server.slug;
	if (name === 'getting_started') {
		const list = tools.map((t) => `- ${t.name}: ${t.description || ''}`).join('\n') || '(no tools enabled)';
		return [
			{
				role: 'user',
				content: {
					type: 'text',
					text: `You can act on ${label} through these MCP tools:\n\n${list}\n\nPick the tool that fits my request, fill in its required arguments, and call it. Ask me for anything required that you don't have.`,
				},
			},
		];
	}
	if (name === 'run_tool') {
		const wanted = String(args.tool || '');
		const tool = tools.find((t) => t.name === wanted);
		const detail = tool
			? `Tool "${tool.name}" — ${tool.description || ''}\nInput schema:\n${JSON.stringify(tool.input_schema || {}, null, 2)}`
			: `Tool "${wanted}" was not found. Available: ${tools.map((t) => t.name).join(', ')}`;
		return [
			{
				role: 'user',
				content: { type: 'text', text: `Help me call this ${label} tool correctly.\n\n${detail}` },
			},
		];
	}
	return null;
}

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
	requires_approval?: boolean;
	composite_steps?: Array<{ tool: string; args: Record<string, any> }> | null;
}

async function loadTools(serverId: string): Promise<ToolRow[]> {
	const admin = createAdminClient();
	// select('*') keeps this resilient to optional columns (requires_approval)
	// that may not exist until migration 022 is applied.
	const { data } = await admin
		.from('mcp_tools')
		.select('*')
		.eq('mcp_server_id', serverId)
		.eq('enabled', true)
		.order('name');
	return (data as ToolRow[]) || [];
}

/**
 * Human-in-the-loop gate: create a pending approval and wait (polling) for a
 * dashboard decision. Returns 'approved' | 'denied' | 'timeout'. Fails open
 * only if the approvals table doesn't exist yet (feature not migrated).
 */
async function requestApproval(serverId: string, toolName: string, args: any, clientIp?: string | null): Promise<string> {
	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_approvals')
		.insert({ mcp_server_id: serverId, tool_name: toolName, args, client_ip: clientIp || null, status: 'pending' })
		.select('id')
		.single();
	if (error || !data) return 'approved'; // table missing → feature inactive
	const id = data.id;
	const deadline = Date.now() + 55_000;
	while (Date.now() < deadline) {
		await new Promise((r) => setTimeout(r, 2000));
		const { data: row } = await admin.from('mcp_approvals').select('status').eq('id', id).maybeSingle();
		if (row && row.status !== 'pending') return row.status;
	}
	await admin.from('mcp_approvals').update({ status: 'expired', decided_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
	return 'timeout';
}

async function loadConnection(id: string): Promise<any> {
	const admin = createAdminClient();
	const { data } = await admin.from('app_connections').select('*').eq('id', id).maybeSingle();
	return data;
}

interface CustomPrompt {
	name: string;
	description: string | null;
	arguments: Array<{ name: string; description?: string; required?: boolean }>;
	template: string;
}

/** User-authored prompts for a server (empty if the table doesn't exist yet). */
async function loadCustomPrompts(serverId: string): Promise<CustomPrompt[]> {
	try {
		const admin = createAdminClient();
		const { data, error } = await admin
			.from('mcp_prompts')
			.select('name, description, arguments, template')
			.eq('mcp_server_id', serverId)
			.eq('enabled', true)
			.order('name');
		if (error) return [];
		return (data as CustomPrompt[]) || [];
	} catch {
		return [];
	}
}

/** Run a composite tool: each step calls another tool, piping outputs forward. */
async function executeComposite(tool: ToolRow, args: Record<string, any>, tools: ToolRow[], authed: AuthedServer) {
	const ctx: CompositeCtx = { input: args || {}, steps: [] };
	const parts: string[] = [];
	let isError = false;

	const steps = tool.composite_steps || [];
	for (let i = 0; i < steps.length; i++) {
		const step = steps[i];
		const stepTool = tools.find((t) => t.name === step.tool);
		if (!stepTool) {
			parts.push(`Step ${i + 1} (${step.tool}): error — tool not found`);
			isError = true;
			break;
		}
		const connection = stepTool.app_connection_id ? await loadConnection(stepTool.app_connection_id) : authed.connection;
		if (!connection) {
			parts.push(`Step ${i + 1} (${step.tool}): error — no connection`);
			isError = true;
			break;
		}
		const stepArgs = buildStepArgs(step.args || {}, ctx);
		const r = await executeTool(connection, stepTool, stepArgs);
		const text = r.content?.map((c: any) => c.text).join('\n') || '';
		let json: any = undefined;
		// The proxy prefixes a status line; try to parse the JSON body that follows.
		const body = text.includes('\n\n') ? text.slice(text.indexOf('\n\n') + 2) : text;
		try {
			json = JSON.parse(body);
		} catch {
			/* not JSON */
		}
		ctx.steps.push({ text, json });
		parts.push(`Step ${i + 1} (${step.tool}):\n${text}`);
		if (r.isError) {
			isError = true;
			break; // stop the chain on failure
		}
	}

	return { content: [{ type: 'text' as const, text: parts.join('\n\n') }], isError };
}

/** Substitute {{arg}} placeholders in a custom prompt template. */
function renderCustomPrompt(p: CustomPrompt, args: Record<string, any>) {
	let text = p.template || '';
	for (const [k, v] of Object.entries(args)) {
		text = text.split(`{{${k}}}`).join(String(v ?? ''));
	}
	// Drop any unfilled placeholders.
	text = text.replace(/\{\{\s*[\w-]+\s*\}\}/g, '');
	return [{ role: 'user', content: { type: 'text', text } }];
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
					capabilities: {
						tools: { listChanged: false },
						resources: { listChanged: false },
						prompts: { listChanged: false },
					},
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
				const { page, nextCursor } = paginate(tools, req.params?.cursor);
				response = rpcResult(id, {
					tools: page.map((t) => ({
						name: t.name,
						description: t.description || '',
						inputSchema: t.input_schema || { type: 'object', properties: {} },
					})),
					...(nextCursor ? { nextCursor } : {}),
				});
				break;
			}

			case 'resources/list': {
				// Expose read-only (GET, no required input) tools as resources.
				const tools = await loadTools(server.id);
				const readable = tools.filter(
					(t) =>
						(t.http_method || 'GET').toUpperCase() === 'GET' &&
						!(Array.isArray(t.param_map) && t.param_map.some((p: any) => p.required))
				);
				const { page, nextCursor } = paginate(readable, req.params?.cursor);
				response = rpcResult(id, {
					resources: page.map((t) => ({
						uri: `tool://${t.name}`,
						name: t.name,
						description: t.description || '',
						mimeType: 'application/json',
					})),
					...(nextCursor ? { nextCursor } : {}),
				});
				break;
			}

			case 'resources/read': {
				const uri: string = req.params?.uri || '';
				const toolName = uri.startsWith('tool://') ? uri.slice('tool://'.length) : '';
				resource = toolName || uri;
				if (!toolName) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `Unsupported resource URI: ${uri}`);
					break;
				}
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
					response = rpcError(id, INVALID_PARAMS, `Unknown resource: ${toolName}`);
					break;
				}
				const connection = tool.app_connection_id ? await loadConnection(tool.app_connection_id) : authed.connection;
				if (!connection) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `No connection for resource: ${toolName}`);
					break;
				}
				const result = await executeTool(connection, tool, {});
				statusCode = result.isError ? 502 : 200;
				const text = result.content?.map((c: any) => c.text).join('\n') || '';
				respText = text.slice(0, 8000) || null;
				response = rpcResult(id, {
					contents: [{ uri, mimeType: 'application/json', text }],
				});
				break;
			}

			case 'prompts/list': {
				const tools = await loadTools(server.id);
				const custom = await loadCustomPrompts(server.id);
				const customNames = new Set(custom.map((p) => p.name));
				const generated = buildPrompts(server, tools).filter((p) => !customNames.has(p.name));
				const customList = custom.map((p) => ({
					name: p.name,
					description: p.description || '',
					...(Array.isArray(p.arguments) && p.arguments.length ? { arguments: p.arguments } : {}),
				}));
				response = rpcResult(id, { prompts: [...customList, ...generated] });
				break;
			}

			case 'prompts/get': {
				const name: string = req.params?.name || '';
				const args = req.params?.arguments || {};
				const custom = (await loadCustomPrompts(server.id)).find((p) => p.name === name);
				let messages = custom ? renderCustomPrompt(custom, args) : null;
				if (!messages) {
					const tools = await loadTools(server.id);
					messages = renderPrompt(name, server, tools, args);
				}
				if (!messages) {
					statusCode = 400;
					response = rpcError(id, INVALID_PARAMS, `Unknown prompt: ${name}`);
					break;
				}
				response = rpcResult(id, { messages });
				break;
			}

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
				// Human-in-the-loop: pause for dashboard approval if flagged.
				if (tool.requires_approval) {
					const decision = await requestApproval(server.id, toolName, args, meta.clientIp);
					if (decision !== 'approved') {
						statusCode = decision === 'denied' ? 403 : 408;
						reqBody = args;
						errorMessage = decision === 'denied' ? 'Call denied by an approver' : 'Approval timed out';
						response = rpcResult(id, {
							content: [{ type: 'text', text: `⛔ ${errorMessage}. (Tool "${toolName}" requires human approval.)` }],
							isError: true,
						});
						break;
					}
				}

				reqBody = args;
				let result;
				if (Array.isArray(tool.composite_steps) && tool.composite_steps.length) {
					// Composite tool: run its steps in sequence.
					result = await executeComposite(tool, args, tools, authed);
				} else {
					// Aggregate servers route each tool to its own connection.
					const connection = tool.app_connection_id ? await loadConnection(tool.app_connection_id) : authed.connection;
					if (!connection) {
						statusCode = 400;
						response = rpcError(id, INVALID_PARAMS, `No connection for tool: ${toolName}`);
						break;
					}
					result = await executeTool(connection, tool, args);
				}
				statusCode = result.isError ? 502 : 200;
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
	if (req.method === 'tools/call' || req.method === 'tools/list' || req.method === 'resources/read') {
		await logAccess(server, req.method, resource, statusCode, Date.now() - started, errorMessage, meta, reqBody, respText);
		if (req.method === 'tools/call' || req.method === 'resources/read') {
			await maybeAlert(server, resource, statusCode, errorMessage);
		}
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
			// Redact secrets before persisting either body.
			request_body: requestBody ? redactObject(requestBody) : null,
			response_body: redactText(responseBody),
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

		// Opportunistic retention: occasionally prune logs past the retention window
		// (no cron required). Disable with MCP_LOG_RETENTION_DAYS=0.
		const retentionDays = Number(process.env.MCP_LOG_RETENTION_DAYS ?? 30);
		if (retentionDays > 0 && Math.random() < 0.02) {
			const cutoff = new Date(Date.now() - retentionDays * 86_400_000).toISOString();
			await admin.from('mcp_access_logs').delete().lt('created_at', cutoff);
		}
	} catch {
		// best-effort logging; never fail the request because logging failed
	}
}
