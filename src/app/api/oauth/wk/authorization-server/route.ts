import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl } from '@/lib/mcp-oauth';

const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/** OAuth 2.0 Authorization Server Metadata (RFC 8414) for MCP clients. */
export async function GET(request: NextRequest) {
	const base = appBaseUrl(request.url);
	return NextResponse.json(
		{
			issuer: base,
			authorization_endpoint: `${base}/api/oauth/mcp/authorize`,
			token_endpoint: `${base}/api/oauth/mcp/token`,
			registration_endpoint: `${base}/api/oauth/mcp/register`,
			response_types_supported: ['code'],
			grant_types_supported: ['authorization_code', 'refresh_token'],
			code_challenge_methods_supported: ['S256'],
			token_endpoint_auth_methods_supported: ['none', 'client_secret_post'],
			scopes_supported: ['mcp'],
		},
		{ headers: CORS }
	);
}
