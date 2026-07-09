import { NextRequest, NextResponse } from 'next/server';
import { authenticateServer } from '@/lib/mcp/auth';
import { handleRpc } from '@/lib/mcp/runtime';
import { serverHasInterface } from '@/lib/mcp/interfaces';

export const runtime = 'nodejs';
export const maxDuration = 60;

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function bearer(req: NextRequest): string | null {
	const h = req.headers.get('authorization') || '';
	if (/^bearer\s+/i.test(h)) return h.replace(/^bearer\s+/i, '').trim();
	return req.headers.get('x-api-key');
}

/**
 * /api/rest/:slug/:tool — call a tool over plain REST (ChatGPT Actions, Zapier,
 * raw HTTP). Any HTTP method is accepted so a tool can be exposed under its
 * configured method (GET/POST/PUT/PATCH/DELETE); the OpenAPI schema advertises
 * that method. Arguments are read from the query string and, for methods that
 * carry a body, merged with the JSON body (body wins). Delegates to the MCP
 * runtime so rate limits, approvals, composite tools and logging all apply.
 */
async function handle(request: NextRequest, { params }: { params: Promise<{ slug: string; tool: string }> }) {
	const { slug, tool } = await params;

	const authed = await authenticateServer(slug, bearer(request));
	if (!authed) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!serverHasInterface(authed.server, 'rest')) {
		return NextResponse.json({ error: 'REST interface disabled for this server' }, { status: 404 });
	}

	// Query params first, then merge any JSON body over them.
	const args: Record<string, any> = {};
	for (const [k, v] of new URL(request.url).searchParams) args[k] = v;

	if (METHODS_WITH_BODY.has(request.method)) {
		try {
			const text = await request.text();
			if (text) {
				const parsed = JSON.parse(text);
				if (parsed && typeof parsed === 'object') Object.assign(args, parsed);
			}
		} catch {
			return NextResponse.json({ error: 'Body must be JSON' }, { status: 400 });
		}
	}

	const meta = {
		clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
		userAgent: request.headers.get('user-agent') || null,
	};

	const resp = await handleRpc(authed, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args } }, meta);

	if (!resp) return NextResponse.json({ ok: true });
	if ((resp as any).error) {
		const code = (resp as any).error.code;
		const status = code === -32000 ? 429 : code === -32602 ? 400 : code === -32601 ? 404 : 500;
		return NextResponse.json({ error: (resp as any).error.message }, { status });
	}

	const result = (resp as any).result || {};
	const text = (result.content || []).map((c: any) => c.text).join('\n');
	// Return the parsed JSON body when possible, else the raw text.
	let data: any = text;
	const sep = text.indexOf('\n\n');
	const body = sep >= 0 ? text.slice(sep + 2) : text;
	try {
		data = JSON.parse(body);
	} catch {
		/* keep text */
	}
	return NextResponse.json({ isError: !!result.isError, data }, { status: result.isError ? 502 : 200 });
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
