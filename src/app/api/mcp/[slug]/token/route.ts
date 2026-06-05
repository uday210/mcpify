import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { signToken } from '@/lib/oauth';

export const runtime = 'nodejs';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/**
 * OAuth 2.0 token endpoint for a server in `oauth` access mode.
 * Accepts the client_credentials grant — client_id/client_secret may be sent in
 * the body (JSON or form-encoded) or via HTTP Basic auth. Returns a bearer
 * access token the caller then sends to the MCP endpoint.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;

	let clientId = '';
	let clientSecret = '';

	// HTTP Basic: Authorization: Basic base64(client_id:client_secret)
	const auth = request.headers.get('authorization');
	if (auth?.toLowerCase().startsWith('basic ')) {
		try {
			const [id, secret] = Buffer.from(auth.slice(6), 'base64').toString('utf8').split(':');
			clientId = id || '';
			clientSecret = secret || '';
		} catch {
			/* ignore */
		}
	}

	// Body: form-encoded or JSON
	if (!clientId) {
		const ct = request.headers.get('content-type') || '';
		try {
			if (ct.includes('application/json')) {
				const b = await request.json();
				clientId = b.client_id || '';
				clientSecret = b.client_secret || '';
			} else {
				const form = await request.formData();
				clientId = String(form.get('client_id') || '');
				clientSecret = String(form.get('client_secret') || '');
			}
		} catch {
			/* ignore */
		}
	}

	if (!clientId || !clientSecret) {
		return err('invalid_request', 'Missing client credentials', 400);
	}

	const admin = createAdminClient();
	const { data: server } = await admin
		.from('mcp_servers')
		.select('id, slug, auth_mode, oauth_client_id, oauth_client_secret, is_active')
		.eq('slug', slug)
		.eq('is_active', true)
		.maybeSingle();

	if (
		!server ||
		server.auth_mode !== 'oauth' ||
		server.oauth_client_id !== clientId ||
		server.oauth_client_secret !== clientSecret
	) {
		return err('invalid_client', 'Invalid client credentials', 401);
	}

	const access_token = signToken({ slug, cid: clientId });
	return new Response(
		JSON.stringify({ access_token, token_type: 'Bearer', expires_in: 3600 }),
		{ status: 200, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
	);
}

function err(error: string, description: string, status: number) {
	return new Response(JSON.stringify({ error, error_description: description }), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' },
	});
}
