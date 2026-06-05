import { NextRequest } from 'next/server';
import { authenticateServer, extractKey } from '@/lib/mcp/auth';
import { handleRpc } from '@/lib/mcp/runtime';
import { pushToSession } from '@/lib/mcp/sessions';
import { JsonRpcRequest } from '@/lib/mcp/jsonrpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/**
 * Message channel for the legacy HTTP+SSE transport. The client POSTs a
 * JSON-RPC request here; we handle it and push the response over the matching
 * open SSE stream (by sessionId), returning 202 Accepted immediately.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;
	const url = new URL(request.url);
	const sessionId = url.searchParams.get('sessionId');

	const authed = await authenticateServer(slug, extractKey(request));
	if (!authed) {
		return new Response('Unauthorized', { status: 401, headers: CORS });
	}
	if (!sessionId) {
		return new Response('Missing sessionId', { status: 400, headers: CORS });
	}

	let req: JsonRpcRequest;
	try {
		req = await request.json();
	} catch {
		return new Response('Parse error', { status: 400, headers: CORS });
	}

	const meta = {
		clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	};
	const res = await handleRpc(authed, req, meta);
	if (res) {
		const delivered = pushToSession(sessionId, res);
		if (!delivered) {
			return new Response('Session not found', { status: 404, headers: CORS });
		}
	}

	return new Response(null, { status: 202, headers: CORS });
}
