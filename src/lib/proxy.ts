import { decryptCredentials, encryptCredentials } from '@/lib/encryption';
import { createAdminClient } from '@/lib/supabase/admin';

interface ToolDef {
	name: string;
	http_method: string;
	path_template: string;
	param_map: Array<Record<string, any>>;
}

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

		// --- Inject auth.
		await applyAuth(connection, headers, query);

		const qs = query.toString();
		const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}${qs ? '?' + qs : ''}`;

		const init: RequestInit = { method, headers };
		if (rawBody !== undefined && writeMethod) {
			headers['Content-Type'] = headers['Content-Type'] || 'application/json';
			init.body = JSON.stringify(rawBody);
		} else if (hasBody && writeMethod) {
			headers['Content-Type'] = headers['Content-Type'] || 'application/json';
			init.body = JSON.stringify(body);
		}

		const resp = await fetch(url, init);
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
): Promise<{ ok: boolean; status: number; message: string }> {
	const baseUrl: string = (connection.base_url || '').replace(/\/$/, '');
	if (!baseUrl) return { ok: false, status: 0, message: 'No base URL configured' };

	const headers: Record<string, string> = { Accept: 'application/json' };
	const query = new URLSearchParams();
	try {
		const staticHeaders = (connection.config || {}).static_headers;
		if (staticHeaders && typeof staticHeaders === 'object') {
			for (const [k, v] of Object.entries(staticHeaders)) headers[k] = String(v);
		}
		await applyAuth(connection, headers, query);
		const qs = query.toString();
		const resp = await fetch(`${baseUrl}/${qs ? '?' + qs : ''}`, { method: 'GET', headers });
		if (resp.status === 401 || resp.status === 403) {
			return { ok: false, status: resp.status, message: 'Credentials were rejected (auth error)' };
		}
		return { ok: true, status: resp.status, message: `Reachable (HTTP ${resp.status})` };
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
	}
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
	if (!oauth.token_url || !oauth.client_id) return null;
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
	if (!resp.ok) return null;
	const tok = await resp.json();
	if (!tok.access_token) return null;
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
async function getOAuthAccessToken(connection: any): Promise<string | null> {
	const access = connection.oauth_token ? safeDecrypt(connection.oauth_token).value : null;
	const expiresAt = connection.oauth_expires_at ? new Date(connection.oauth_expires_at).getTime() : 0;
	const stillValid = access && (!expiresAt || expiresAt - Date.now() > 60_000);
	if (stillValid) return access;

	const refresh = connection.oauth_refresh_token ? safeDecrypt(connection.oauth_refresh_token).value : null;
	const oauth = (connection.config || {}).oauth || {};
	if (!refresh || !oauth.token_url) return access; // nothing to refresh with

	const clientSecret = oauth.client_secret ? safeDecrypt(oauth.client_secret).value : undefined;
	const params = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refresh,
		client_id: oauth.client_id || '',
	});
	if (clientSecret) params.set('client_secret', clientSecret);

	const resp = await fetch(oauth.token_url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
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
