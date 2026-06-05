import { NextRequest, NextResponse } from 'next/server';
import { appBaseUrl } from '@/lib/mcp-oauth';

const CORS = { 'Access-Control-Allow-Origin': '*' };

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/** OAuth 2.0 Protected Resource Metadata (RFC 9728) pointing at our AS. */
export async function GET(request: NextRequest) {
	const base = appBaseUrl(request.url);
	return NextResponse.json(
		{
			resource: base,
			authorization_servers: [base],
			bearer_methods_supported: ['header'],
			scopes_supported: ['mcp'],
		},
		{ headers: CORS }
	);
}
