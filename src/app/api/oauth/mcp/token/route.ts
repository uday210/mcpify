import { NextRequest } from 'next/server';
import { signToken, verifyToken } from '@/lib/oauth';
import { verifyPkce } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

const CODE_TTL = 10 * 60 * 1000; // 10 min
const REFRESH_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/**
 * Token endpoint for the MCP authorization-code + PKCE flow (and refresh).
 * Issues access tokens signed with the same scheme the runtime validates, so
 * tokens from here work against oauth-mode MCP servers.
 */
export async function POST(request: NextRequest) {
	let params: Record<string, string> = {};
	const ct = request.headers.get('content-type') || '';
	try {
		if (ct.includes('application/json')) {
			params = await request.json();
		} else {
			const form = await request.formData();
			form.forEach((v, k) => (params[k] = String(v)));
		}
	} catch {
		/* ignore */
	}

	const grant = params.grant_type;

	if (grant === 'authorization_code') {
		const payload = verifyToken(params.code || '', CODE_TTL);
		if (!payload?.slug) return err('invalid_grant', 'Invalid or expired code');
		if (params.redirect_uri && params.redirect_uri !== payload.ru) {
			return err('invalid_grant', 'redirect_uri mismatch');
		}
		if (!verifyPkce(payload.cc, params.code_verifier)) {
			return err('invalid_grant', 'PKCE verification failed');
		}
		return tokens(payload.slug);
	}

	if (grant === 'refresh_token') {
		const payload = verifyToken(params.refresh_token || '', REFRESH_TTL);
		if (!payload?.slug || payload.typ !== 'refresh') return err('invalid_grant', 'Invalid refresh token');
		return tokens(payload.slug);
	}

	return err('unsupported_grant_type', `Unsupported grant_type: ${grant}`);
}

function tokens(slug: string) {
	const access_token = signToken({ slug });
	const refresh_token = signToken({ slug, typ: 'refresh' });
	return new Response(
		JSON.stringify({ access_token, token_type: 'Bearer', expires_in: 3600, refresh_token, scope: 'mcp' }),
		{ status: 200, headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
	);
}

function err(error: string, description: string) {
	return new Response(JSON.stringify({ error, error_description: description }), {
		status: 400,
		headers: { ...CORS, 'Content-Type': 'application/json' },
	});
}
