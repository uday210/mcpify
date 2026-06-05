import { createAdminClient } from '@/lib/supabase/admin';
import { hashApiKey } from '@/lib/encryption';

export interface AuthedServer {
	server: any; // mcp_servers row (+ joined app_connections)
	connection: any; // app_connections row
}

/**
 * Authenticates an incoming MCP request: looks up the server by slug, then
 * validates the presented bearer key against either the server's primary
 * api_key or a hashed entry in mcp_api_keys. Returns the server + its
 * connection on success, or null on any failure.
 */
export async function authenticateServer(
	slug: string,
	presentedKey: string | null
): Promise<AuthedServer | null> {
	const admin = createAdminClient();

	const { data: server } = await admin
		.from('mcp_servers')
		.select('*, app_connections(*)')
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle();

	if (!server) return null;

	// Public servers skip key validation entirely.
	if (server.auth_required === false) {
		return { server, connection: (server as any).app_connections };
	}

	if (!presentedKey) return null;

	let authorized = false;

	// Primary key stored in plaintext on the server row.
	if (server.api_key && server.api_key === presentedKey) {
		authorized = true;
	} else {
		// Additional keys are stored hashed in mcp_api_keys.
		const keyHash = hashApiKey(presentedKey);
		const { data: keyRow } = await admin
			.from('mcp_api_keys')
			.select('id')
			.eq('mcp_server_id', server.id)
			.eq('key_hash', keyHash)
			.eq('is_active', true)
			.maybeSingle();
		if (keyRow) {
			authorized = true;
			await admin
				.from('mcp_api_keys')
				.update({ last_used_at: new Date().toISOString() })
				.eq('id', keyRow.id);
		}
	}

	if (!authorized) return null;

	return { server, connection: (server as any).app_connections };
}

/** Extracts a bearer token from the Authorization header or ?key= query param. */
export function extractKey(request: Request): string | null {
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('bearer ')) {
		return auth.slice(7).trim();
	}
	const url = new URL(request.url);
	return url.searchParams.get('key');
}
