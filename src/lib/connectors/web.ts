import { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

/**
 * Web Page bridge connector: fetches a web page server-side and returns its
 * extracted content over MCP / REST. Lets tools that can only consume a URL
 * (e.g. the Salesforce web crawler) reach a page through a stable mcpify URL.
 *
 * Purely additive — dispatched by connector_type === 'web' in the runtime,
 * alongside the existing HTTP / database / knowledge executors.
 */

export interface WebResult {
	content: Array<{ type: 'text'; text: string }>;
	isError: boolean;
}

// Default upstream fetch timeout for a page.
const FETCH_TIMEOUT_MS = 20_000;
// Cap on how much text we return so responses stay reasonable.
const MAX_TEXT = 100_000;
// A browser-like UA so pages behind basic bot filters still respond.
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export const WEB_TOOLS: GeneratedTool[] = [
	{
		name: 'get_page',
		description:
			'Fetch a web page and return its extracted content — title, meta description, cleaned text, and links. Defaults to the connection’s configured page; pass a url to fetch a different one.',
		input_schema: {
			type: 'object',
			properties: {
				url: {
					type: 'string',
					description: 'The page URL to fetch. Defaults to the connection’s configured page.',
				},
				format: {
					type: 'string',
					enum: ['json', 'text', 'markdown', 'html'],
					description: 'Response format: json (default), text, markdown, or raw html.',
				},
			},
		},
		http_method: 'GET',
		path_template: '/',
		param_map: [],
	},
];

/** Blocks obvious SSRF targets (localhost, private ranges, cloud metadata). */
export function isSafeHttpUrl(raw: string): { ok: boolean; reason?: string } {
	let u: URL;
	try {
		u = new URL(raw);
	} catch {
		return { ok: false, reason: 'Not a valid URL' };
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') {
		return { ok: false, reason: 'Only http and https URLs are allowed' };
	}
	const host = u.hostname.toLowerCase();
	if (
		host === 'localhost' ||
		host === '0.0.0.0' ||
		host === '::1' ||
		host.endsWith('.localhost') ||
		host.endsWith('.internal') ||
		host === '169.254.169.254' || // cloud metadata
		host === 'metadata.google.internal' ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^169\.254\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host)
	) {
		return { ok: false, reason: 'This host is not allowed' };
	}
	return { ok: true };
}

const decodeEntities = (s: string): string =>
	s
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, d) => {
			try {
				return String.fromCodePoint(Number(d));
			} catch {
				return '';
			}
		})
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => {
			try {
				return String.fromCodePoint(parseInt(h, 16));
			} catch {
				return '';
			}
		});

interface Extracted {
	title: string;
	description: string;
	text: string;
	links: Array<{ href: string; text: string }>;
}

/** Regex-based HTML extraction — no external deps, mirrors the KB ingestion style. */
export function extractPage(html: string, pageUrl: string): Extracted {
	// Drop non-content elements entirely.
	const stripped = html
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
		.replace(/<!--[\s\S]*?-->/g, ' ')
		.replace(/<head[\s\S]*?<\/head>/gi, (m) => m); // keep head for title/meta extraction below

	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	const title = titleMatch ? decodeEntities(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';

	const descMatch =
		html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
		html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i) ||
		html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
	const description = descMatch ? decodeEntities(descMatch[1]).replace(/\s+/g, ' ').trim() : '';

	// Links: resolve relative hrefs against the page URL.
	const links: Array<{ href: string; text: string }> = [];
	const seen = new Set<string>();
	const linkRe = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
	let lm: RegExpExecArray | null;
	while ((lm = linkRe.exec(stripped)) && links.length < 500) {
		let href = lm[1].trim();
		if (!href || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
		try {
			href = new URL(href, pageUrl).toString();
		} catch {
			continue;
		}
		if (seen.has(href)) continue;
		seen.add(href);
		const text = decodeEntities(lm[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
		links.push({ href, text });
	}

	// Body text: strip all remaining tags, decode entities, collapse whitespace.
	const bodyMatch = stripped.match(/<body[\s\S]*?<\/body>/i);
	const bodyHtml = bodyMatch ? bodyMatch[0] : stripped;
	const text = decodeEntities(
		bodyHtml
			.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, '\n')
			.replace(/<[^>]+>/g, ' ')
	)
		.replace(/[ \t\f\v]+/g, ' ')
		.replace(/\n\s*\n\s*\n+/g, '\n\n')
		.replace(/^\s+|\s+$/gm, '')
		.trim()
		.slice(0, MAX_TEXT);

	return { title, description, text, links };
}

/** Executes the web bridge tool: fetch the page and format the result. */
export async function executeWebTool(
	connection: any,
	_tool: { name: string },
	args: Record<string, any>
): Promise<WebResult> {
	const target = (args?.url && String(args.url).trim()) || connection.base_url;
	if (!target) return errorResult('No page URL configured or provided.');

	const safe = isSafeHttpUrl(target);
	if (!safe.ok) return errorResult(`Refused to fetch ${target}: ${safe.reason}.`);

	const format = ['json', 'text', 'markdown', 'html'].includes(String(args?.format))
		? String(args.format)
		: 'json';

	// Custom headers configured on the connection (e.g. a cookie, auth header).
	const headers: Record<string, string> = {
		'User-Agent': BROWSER_UA,
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9',
	};
	const staticHeaders = (connection.config || {}).static_headers;
	if (staticHeaders && typeof staticHeaders === 'object') {
		for (const [k, v] of Object.entries(staticHeaders)) headers[k] = String(v);
	}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	let resp: Response;
	try {
		resp = await fetch(target, { headers, redirect: 'follow', signal: controller.signal });
	} catch (err: any) {
		clearTimeout(timer);
		return errorResult(err?.name === 'AbortError' ? `Timed out fetching ${target}.` : err?.message || 'Fetch failed');
	}
	clearTimeout(timer);

	const raw = await resp.text();

	if (format === 'html') {
		return {
			content: [{ type: 'text', text: `HTTP ${resp.status} ${target}\n\n${raw.slice(0, MAX_TEXT)}` }],
			isError: !resp.ok,
		};
	}

	const ex = extractPage(raw, target);

	if (format === 'text') {
		return { content: [{ type: 'text', text: ex.text }], isError: !resp.ok };
	}
	if (format === 'markdown') {
		const md = [
			ex.title ? `# ${ex.title}` : '',
			ex.description ? `> ${ex.description}` : '',
			ex.text,
			ex.links.length ? '\n## Links\n' + ex.links.map((l) => `- [${l.text || l.href}](${l.href})`).join('\n') : '',
		]
			.filter(Boolean)
			.join('\n\n');
		return { content: [{ type: 'text', text: md }], isError: !resp.ok };
	}

	// json (default)
	const payload = {
		url: target,
		status: resp.status,
		contentType: resp.headers.get('content-type') || null,
		title: ex.title,
		description: ex.description,
		text: ex.text,
		links: ex.links,
	};
	return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: !resp.ok };
}

function errorResult(message: string): WebResult {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
