import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { authenticateServer, extractKey } from '@/lib/mcp/auth';
import { handleRpc } from '@/lib/mcp/runtime';
import { registerSession, removeSession } from '@/lib/mcp/sessions';
import { JsonRpcRequest } from '@/lib/mcp/jsonrpc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Last-Event-ID',
};

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: CORS });
}

/**
 * Streamable HTTP transport (modern): client POSTs a JSON-RPC request (or
 * batch) and receives the JSON-RPC response(s) as a single JSON body.
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;
	const authed = await authenticateServer(slug, extractKey(request));
	if (!authed) {
		const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
		return new Response(
			JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }),
			{
				status: 401,
				headers: {
					...CORS,
					'Content-Type': 'application/json',
					'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
				},
			}
		);
	}

	let payload: any;
	try {
		payload = await request.json();
	} catch {
		return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
	}

	const meta = {
		clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent'),
	};
	const batch = Array.isArray(payload);
	const requests: JsonRpcRequest[] = batch ? payload : [payload];
	const responses = [];
	for (const req of requests) {
		const res = await handleRpc(authed, req, meta);
		if (res) responses.push(res);
	}

	if (responses.length === 0) {
		return new Response(null, { status: 202, headers: CORS });
	}
	return json(batch ? responses : responses[0], 200);
}

/**
 * Legacy HTTP+SSE transport: client opens this GET stream, receives an
 * `endpoint` event pointing at the /messages channel, then POSTs JSON-RPC
 * there. Responses are pushed back over this stream.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	const { slug } = await params;
	const key = extractKey(request);
	const authed = await authenticateServer(slug, key);
	if (!authed) {
		return new Response('Unauthorized', { status: 401, headers: CORS });
	}

	const sessionId = uuidv4();
	const encoder = new TextEncoder();
	const origin = new URL(request.url).origin;
	const endpoint = `${origin}/api/mcp/${slug}/messages?sessionId=${sessionId}&key=${encodeURIComponent(key!)}`;

	let keepAlive: ReturnType<typeof setInterval>;

	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			registerSession(sessionId, { controller, encoder, slug });
			controller.enqueue(encoder.encode(`event: endpoint\ndata: ${endpoint}\n\n`));
			keepAlive = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(': keep-alive\n\n'));
				} catch {
					clearInterval(keepAlive);
				}
			}, 25_000);
		},
		cancel() {
			clearInterval(keepAlive);
			removeSession(sessionId);
		},
	});

	return new Response(stream, {
		headers: {
			...CORS,
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
		},
	});
}

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS, 'Content-Type': 'application/json' },
	});
}
