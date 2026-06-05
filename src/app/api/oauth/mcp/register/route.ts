import { NextRequest, NextResponse } from 'next/server';
import { generateApiKey } from '@/lib/encryption';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' };

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/**
 * Dynamic Client Registration (RFC 7591) — minimal. We register public PKCE
 * clients; no client secret is issued (security comes from PKCE + redirect_uri
 * binding + owner consent). Echoes back the client's metadata.
 */
export async function POST(request: NextRequest) {
	let body: any = {};
	try {
		body = await request.json();
	} catch {
		/* ignore */
	}
	const clientId = `mcpc_${generateApiKey().slice(0, 24)}`;
	return NextResponse.json(
		{
			client_id: clientId,
			client_id_issued_at: 0,
			token_endpoint_auth_method: 'none',
			grant_types: ['authorization_code', 'refresh_token'],
			response_types: ['code'],
			redirect_uris: body.redirect_uris || [],
			client_name: body.client_name || 'MCP Client',
		},
		{ status: 201, headers: CORS }
	);
}
