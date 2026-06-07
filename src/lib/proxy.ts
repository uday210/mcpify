import { decryptCredentials, encryptCredentials } from '@/lib/encryption';
import { createAdminClient } from '@/lib/supabase/admin';
import { formEncode } from '@/lib/connectors/formencode';

interface ToolDef {
	name: string;
	http_method: string;
	path_template: string;
	param_map: Array<Record<string, any>>;
	input_schema?: { required?: string[]; [k: string]: any };
}

// Default upstream timeout; overridable per connection via config.timeout_ms.
const DEFAULT_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS = new Set([429, 502, 503, 504]);

export interface ToolResult {
	content: Array<{ type: 'text'; text: string }>;
	isError: boolean;
}

/**
 * Executes one MCP tool call by proxying to the connection's upstream API.
 * Builds the request from the tool's param_map, injects credentials per the
 * connection's auth_type (refreshing OAuth tokens when expired), and returns
 * the upstream response as MCP text content.
 */
export async function executeTool(
	connection: any,
	tool: ToolDef,
	args: Record<string, any>
): Promise<ToolResult> {
	try {
		const baseUrl: string = (connection.base_url || '').replace(/\/$/, '');
		if (!baseUrl) {
			return errorResult('Connection has no base URL configured.');
		}

		// --- Validate required inputs up front for a clear error (vs an opaque
		//     upstream 400). Required fields come from the tool's JSON schema.
		const required: string[] = Array.isArray(tool.input_schema?.required) ? tool.input_schema!.required : [];
		const missing = required.filter((k) => args[k] === undefined || args[k] === null || args[k] === '');
		if (missing.length) {
			return errorResult(`Missing required argument(s): ${missing.join(', ')}.`);
		}

		// --- Distribute args into path / query / header / body per param_map.
		let path = tool.path_template || '/';
		const query = new URLSearchParams();
		const headers: Record<string, string> = { Accept: 'application/json' };
		const body: Record<string, any> = {};
		let hasBody = false;

		const map = Array.isArray(tool.param_map) ? tool.param_map : [];
		// A single body param named "body" (or flagged whole) is sent as the
		// entire JSON request body — lets tools call APIs with nested payloads.
		const hasRawBody = map.some((p) => p.in === 'body' && (p.name === 'body' || p.whole));
		let rawBody: any = undefined;
		for (const p of map) {
			const name = p.name;
			if (!(name in args) || args[name] === undefined || args[name] === null) continue;
			const value = args[name];
			switch (p.in) {
				case 'path':
					// Replace every occurrence of the placeholder (some paths repeat it).
					path = path.split(`{${name}}`).join(encodeURIComponent(String(value)));
					break;
				case 'query':
					query.set(name, typeof value === 'object' ? JSON.stringify(value) : String(value));
					break;
				case 'header':
					headers[name] = String(value);
					break;
				case 'body':
					if (hasRawBody && (name === 'body' || p.whole)) {
						rawBody = typeof value === 'string' ? safeJson(value) : value;
					} else {
						body[name] = value;
						hasBody = true;
					}
					break;
				default:
					query.set(name, String(value));
			}
		}

		// Any arg not declared in param_map: treat as body for write methods,
		// else as a query param. Keeps manual/loose tools usable.
		const method = (tool.http_method || 'GET').toUpperCase();
		const writeMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
		const declared = new Set(map.map((p) => p.name));
		for (const [k, v] of Object.entries(args)) {
			if (declared.has(k) || v === undefined || v === null) continue;
			if (writeMethod) {
				body[k] = v;
				hasBody = true;
			} else {
				query.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
			}
		}

		// --- Static headers configured on the connection (e.g. Notion-Version).
		const staticHeaders = (connection.config || {}).static_headers;
		if (staticHeaders && typeof staticHeaders === 'object') {
			for (const [k, v] of Object.entries(staticHeaders)) headers[k] = String(v);
		}

		// --- Token-in-path auth (e.g. Telegram /bot<token>/...).
		if (connection.auth_type === 'token_path') {
			const tmpl = (connection.config || {}).token_path_template || '/bot{token}';
			const tok = connection.credentials ? safeDecrypt(connection.credentials).value : '';
			path = tmpl.replace('{token}', String(tok)) + (path.startsWith('/') ? path : '/' + path);
		}

		// --- Inject auth.
		await applyAuth(connection, headers, query);

		const qs = query.toString();
		const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}${qs ? '?' + qs : ''}`;

		// Some APIs (Stripe, Twilio, Mailgun) require form-encoded bodies.
		const useForm = (connection.config || {}).body_encoding === 'form';
		const init: RequestInit = { method, headers };
		const payload = rawBody !== undefined ? rawBody : hasBody ? body : undefined;
		if (payload !== undefined && writeMethod) {
			if (useForm) {
				headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded';
				init.body = formEncode(payload);
			} else {
				headers['Content-Type'] = headers['Content-Type'] || 'application/json';
				init.body = JSON.stringify(payload);
			}
		}

		const timeoutMs = Number((connection.config || {}).timeout_ms) || DEFAULT_TIMEOUT_MS;
		const isWrite = writeMethod;

		const doFetch = () => fetchWithTimeout(url, init, timeoutMs);

		let resp = await doFetch();

		// On a 401 for an OAuth connection, force a token refresh and retry once —
		// covers tokens revoked before their stated expiry.
		if (resp.status === 401 && connection.auth_type === 'oauth') {
			const fresh = await getOAuthAccessToken(connection, true).catch(() => null);
			if (fresh) {
				headers['Authorization'] = `Bearer ${fresh}`;
				resp = await doFetch();
			}
		}

		// Transient upstream errors: retry idempotent (non-write) calls with backoff.
		for (let attempt = 0; attempt < 2 && RETRYABLE_STATUS.has(resp.status) && !isWrite; attempt++) {
			await sleep(250 * (attempt + 1));
			resp = await doFetch();
		}

		const text = await resp.text();
		let pretty = text;
		try {
			pretty = JSON.stringify(JSON.parse(text), null, 2);
		} catch {
			/* not JSON, leave as-is */
		}

		const summary = `HTTP ${resp.status} ${resp.statusText} ${method} ${url}\n\n${pretty}`;
		return {
			content: [{ type: 'text', text: summary }],
			isError: !resp.ok,
		};
	} catch (err: any) {
		return errorResult(err?.message || 'Tool execution failed');
	}
}

function errorResult(message: string): ToolResult {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch() with an abort-based timeout that yields a clear error message. */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} catch (err: any) {
		if (err?.name === 'AbortError') {
			throw new Error(`Upstream request timed out after ${Math.round(timeoutMs / 1000)}s`);
		}
		throw err;
	} finally {
		clearTimeout(timer);
	}
}

function safeJson(s: string): any {
	try {
		return JSON.parse(s);
	} catch {
		return s;
	}
}

/**
 * Best-effort credential check: issues a GET to the connection's base URL with
 * auth injected and reports whether the upstream is reachable and not rejecting
 * the credentials (401/403).
 */
export async function pingConnection(
	connection: any
): Promise<{ ok: boolean; warn?: boolean; status: number; message: string }> {
	if (connection.connector_type === 'database') {
		const { pingDatabase } = await import('@/lib/connectors/database');
		return pingDatabase(connection);
	}
	const baseUrl: string = (connection.base_url || '').replace(/\/$/, '');
	if (!baseUrl) return { ok: false, status: 0, message: 'No base URL configured' };

	// Prefer a real read-only tool with no required inputs — a 2xx from it is a
	// genuine signal that the credentials work. Fall back to the API root.
	const tools: any[] = Array.isArray((connection.config || {}).tools) ? connection.config.tools : [];
	const probe = tools.find(
		(t) =>
			(t.http_method || 'GET').toUpperCase() === 'GET' &&
			!String(t.path_template || '').includes('{') &&
			!(Array.isArray(t.param_map) && t.param_map.some((p: any) => p.required))
	);
	const pingedRoot = !probe;
	const path = probe ? String(probe.path_template || '/') : '/';

	const headers: Record<string, string> = { Accept: 'application/json' };
	const query = new URLSearchParams();
	try {
		const staticHeaders = (connection.config || {}).static_headers;
		if (staticHeaders && typeof staticHeaders === 'object') {
			for (const [k, v] of Object.entries(staticHeaders)) headers[k] = String(v);
		}
		await applyAuth(connection, headers, query);
		const qs = query.toString();
		const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}${qs ? '?' + qs : ''}`;
		const resp = await fetch(url, { method: 'GET', headers });
		const s = resp.status;

		if (s >= 200 && s < 300) {
			return { ok: true, status: s, message: `Verified — credentials accepted (HTTP ${s})` };
		}
		if (s === 401 || s === 403) {
			return { ok: false, status: s, message: `Credentials were rejected (HTTP ${s})` };
		}
		if (s === 429) {
			return { ok: true, status: s, message: 'Reachable — rate limited (HTTP 429), credentials likely OK' };
		}
		if (s >= 500) {
			return { ok: false, warn: true, status: s, message: `Upstream is returning errors (HTTP ${s})` };
		}
		// Other 4xx (404/400/405/422…): host answered but we couldn't confirm auth.
		return {
			ok: false,
			warn: true,
			status: s,
			message: pingedRoot
				? `Host reachable, but credentials weren’t confirmed (root returned HTTP ${s}). Try a tool call.`
				: `Host reachable, but the test endpoint returned HTTP ${s} — credentials not confirmed.`,
		};
	} catch (err: any) {
		return { ok: false, status: 0, message: err?.message || 'Connection failed' };
	}
}

/** Mutates headers/query to add auth based on the connection's auth_type. */
async function applyAuth(
	connection: any,
	headers: Record<string, string>,
	query: URLSearchParams
): Promise<void> {
	const authType = connection.auth_type;
	const config = connection.config || {};
	const creds = connection.credentials ? safeDecrypt(connection.credentials) : {};

	switch (authType) {
		case 'api_key': {
			const value = creds.value || creds.api_key;
			if (!value) return;
			const where = config.api_key_in || 'header';
			const keyName = config.api_key_name || 'X-API-Key';
			if (where === 'query') query.set(keyName, value);
			else headers[keyName] = value;
			break;
		}
		case 'bearer': {
			const value = creds.value || creds.token;
			if (value) headers['Authorization'] = `Bearer ${value}`;
			break;
		}
		case 'basic': {
			if (creds.username != null) {
				const enc = Buffer.from(`${creds.username}:${creds.password || ''}`).toString('base64');
				headers['Authorization'] = `Basic ${enc}`;
			}
			break;
		}
		case 'custom': {
			if (creds.headers && typeof creds.headers === 'object') {
				for (const [k, v] of Object.entries(creds.headers)) headers[k] = String(v);
			} else if (creds.value) {
				headers[config.header_name || 'Authorization'] = creds.value;
			}
			break;
		}
		case 'oauth': {
			const token = await getOAuthAccessToken(connection);
			if (token) headers['Authorization'] = `Bearer ${token}`;
			break;
		}
		case 'oauth2_cc': {
			const token = await getClientCredentialsToken(connection);
			if (token) headers['Authorization'] = `Bearer ${token}`;
			break;
		}
		case 'oauth2_account': {
			const token = await getAccountCredentialsToken(connection);
			if (token) headers['Authorization'] = `Bearer ${token}`;
			break;
		}
		// token_path is handled when building the URL path, not via headers.
	}
}

/**
 * Zoom-style Server-to-Server OAuth: account_credentials grant with HTTP Basic
 * (client_id:client_secret) and an account_id. Cached like client-credentials.
 */
async function getAccountCredentialsToken(connection: any): Promise<string | null> {
	const cached = ccTokenCache.get(connection.id);
	if (cached && cached.exp - Date.now() > 60_000) return cached.token;
	const oauth = (connection.config || {}).oauth || {};
	if (!oauth.token_url || !oauth.client_id || !oauth.account_id) {
		throw new Error('Account-credentials OAuth not configured (token URL, client ID, account ID).');
	}
	const clientSecret = oauth.client_secret ? safeDecrypt(oauth.client_secret).value : '';
	const basic = Buffer.from(`${oauth.client_id}:${clientSecret}`).toString('base64');
	const params = new URLSearchParams({ grant_type: 'account_credentials', account_id: oauth.account_id });
	const resp = await fetch(oauth.token_url, {
		method: 'POST',
		headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
		body: params.toString(),
	});
	const text = await resp.text();
	if (!resp.ok) throw new Error(`OAuth token request failed (HTTP ${resp.status}). Check client ID/secret/account ID. ${text.slice(0, 160)}`);
	let tok: any = {};
	try {
		tok = JSON.parse(text);
	} catch {
		/* ignore */
	}
	if (!tok.access_token) throw new Error('OAuth token response had no access_token.');
	ccTokenCache.set(connection.id, { token: tok.access_token, exp: Date.now() + (Number(tok.expires_in) || 3600) * 1000 });
	return tok.access_token;
}

// In-memory client-credentials token cache (per connection). Single-instance.
const ccTokenCache = new Map<string, { token: string; exp: number }>();

/**
 * Fetches (and caches) an OAuth2 client_credentials access token for the
 * connection — used by enterprise APIs like FedEx that issue a token from a
 * client id + secret. Credentials are sent in the form body.
 */
async function getClientCredentialsToken(connection: any): Promise<string | null> {
	const cached = ccTokenCache.get(connection.id);
	if (cached && cached.exp - Date.now() > 60_000) return cached.token;

	const oauth = (connection.config || {}).oauth || {};
	if (!oauth.token_url || !oauth.client_id) {
		throw new Error('OAuth2 client-credentials not configured (missing token URL or client ID).');
	}
	const clientSecret = oauth.client_secret ? safeDecrypt(oauth.client_secret).value : '';

	const params = new URLSearchParams({
		grant_type: 'client_credentials',
		client_id: oauth.client_id,
		client_secret: clientSecret || '',
	});
	if (oauth.scope) params.set('scope', oauth.scope);

	const resp = await fetch(oauth.token_url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
		body: params.toString(),
	});
	const text = await resp.text();
	if (!resp.ok) {
		throw new Error(`OAuth token request failed (HTTP ${resp.status}). Check your client ID/secret. ${text.slice(0, 200)}`);
	}
	let tok: any = {};
	try {
		tok = JSON.parse(text);
	} catch {
		/* ignore */
	}
	if (!tok.access_token) throw new Error('OAuth token response had no access_token.');
	ccTokenCache.set(connection.id, {
		token: tok.access_token,
		exp: Date.now() + (Number(tok.expires_in) || 3600) * 1000,
	});
	return tok.access_token;
}

function safeDecrypt(hex: string): Record<string, any> {
	try {
		return decryptCredentials(hex);
	} catch {
		return {};
	}
}

/**
 * Returns a valid OAuth access token for the connection, refreshing it via the
 * provider token endpoint if it has expired and a refresh token is available.
 */
async function getOAuthAccessToken(connection: any, force = false): Promise<string | null> {
	const access = connection.oauth_token ? safeDecrypt(connection.oauth_token).value : null;
	const expiresAt = connection.oauth_expires_at ? new Date(connection.oauth_expires_at).getTime() : 0;
	const stillValid = access && (!expiresAt || expiresAt - Date.now() > 60_000);
	if (stillValid && !force) return access;

	const refresh = connection.oauth_refresh_token ? safeDecrypt(connection.oauth_refresh_token).value : null;
	const oauth = (connection.config || {}).oauth || {};
	if (!refresh || !oauth.token_url) return access; // nothing to refresh with

	const clientSecret = oauth.client_secret ? safeDecrypt(oauth.client_secret).value : undefined;
	const useBasic = oauth.token_auth === 'basic';
	const params = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refresh,
	});
	if (!useBasic) {
		params.set('client_id', oauth.client_id || '');
		if (clientSecret) params.set('client_secret', clientSecret);
	}

	const refreshHeaders: Record<string, string> = {
		'Content-Type': 'application/x-www-form-urlencoded',
		Accept: 'application/json',
		'User-Agent': ((connection.config || {}).static_headers || {})['User-Agent'] || 'mcpify/1.0',
	};
	if (useBasic) {
		refreshHeaders['Authorization'] =
			'Basic ' + Buffer.from(`${oauth.client_id || ''}:${clientSecret || ''}`).toString('base64');
	}

	const resp = await fetch(oauth.token_url, {
		method: 'POST',
		headers: refreshHeaders,
		body: params.toString(),
	});
	if (!resp.ok) return access;
	const tokens = await resp.json();
	const newAccess = tokens.access_token;
	if (!newAccess) return access;

	// Persist the refreshed tokens (encrypted).
	const admin = createAdminClient();
	const update: Record<string, any> = {
		oauth_token: encryptCredentials({ value: newAccess }),
	};
	if (tokens.refresh_token) update.oauth_refresh_token = encryptCredentials({ value: tokens.refresh_token });
	if (tokens.expires_in) {
		update.oauth_expires_at = new Date(Date.now() + Number(tokens.expires_in) * 1000).toISOString();
	}
	await admin.from('app_connections').update(update).eq('id', connection.id);

	return newAccess;
}
