import { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

/**
 * Web Page bridge connector: fetches one or more web pages server-side and
 * returns their extracted content over MCP / REST. Lets tools that can only
 * consume a URL (e.g. the Salesforce web crawler) reach pages through a stable
 * mcpify URL — including a single get_all_pages endpoint that returns every
 * configured page at once.
 *
 * Purely additive — dispatched by connector_type === 'web' in the runtime,
 * alongside the existing HTTP / database / knowledge executors.
 */

export interface WebResult {
	content: Array<{ type: 'text'; text: string }>;
	isError: boolean;
}

// Default upstream fetch timeout per page.
const FETCH_TIMEOUT_MS = 20_000;
// Cap on how much text we return per page so responses stay reasonable.
const MAX_TEXT = 100_000;
// Safety cap on how many pages get_all_pages will fetch in one call.
const MAX_PAGES = 25;
// A browser-like UA so pages behind basic bot filters still respond.
const BROWSER_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

const FORMAT_PROP = {
	type: 'string',
	enum: ['json', 'text', 'markdown', 'html'],
	description: 'Response format: json (default), text, markdown, or raw html.',
};

export const WEB_TOOLS: GeneratedTool[] = [
	{
		name: 'get_all_pages',
		description:
			'Fetch every page configured on this connection and return their extracted content (title, description, text, links) as one array. One call returns all pages.',
		input_schema: {
			type: 'object',
			properties: { format: FORMAT_PROP },
		},
		http_method: 'GET',
		path_template: '/',
		param_map: [],
	},
	{
		name: 'get_page',
		description:
			'Fetch a single page and return its extracted content. Defaults to the first configured page; pass index to pick another configured page, or url to fetch an arbitrary one.',
		input_schema: {
			type: 'object',
			properties: {
				url: { type: 'string', description: 'An explicit page URL to fetch (overrides index).' },
				index: { type: 'integer', description: 'Zero-based index into the configured pages (default 0).' },
				format: FORMAT_PROP,
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

/** The list of pages configured on a web connection (falls back to base_url). */
export function connectionPages(connection: any): string[] {
	const pages = (connection?.config || {}).pages;
	if (Array.isArray(pages) && pages.length) return pages.map((p: any) => String(p)).filter(Boolean);
	return connection?.base_url ? [String(connection.base_url)] : [];
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
		.replace(/<!--[\s\S]*?-->/g, ' ');

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
		bodyHtml.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)\s*>/gi, '\n').replace(/<[^>]+>/g, ' ')
	)
		.replace(/[ \t\f\v]+/g, ' ')
		.replace(/\n\s*\n\s*\n+/g, '\n\n')
		.replace(/^\s+|\s+$/gm, '')
		.trim()
		.slice(0, MAX_TEXT);

	return { title, description, text, links };
}

interface PageResult {
	url: string;
	status: number;
	contentType: string | null;
	title: string;
	description: string;
	text: string;
	links: Array<{ href: string; text: string }>;
	raw?: string;
	error?: string;
}

/** Fetch a single page and extract it, never throwing — errors land in `error`. */
async function fetchAndExtract(url: string, headers: Record<string, string>, wantRaw: boolean): Promise<PageResult> {
	const safe = isSafeHttpUrl(url);
	if (!safe.ok) return blankPage(url, `Refused to fetch: ${safe.reason}`);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const resp = await fetch(url, { headers, redirect: 'follow', signal: controller.signal });
		const raw = await resp.text();
		const ex = extractPage(raw, url);
		return {
			url,
			status: resp.status,
			contentType: resp.headers.get('content-type'),
			...ex,
			...(wantRaw ? { raw: raw.slice(0, MAX_TEXT) } : {}),
			...(resp.ok ? {} : { error: `HTTP ${resp.status}` }),
		};
	} catch (err: any) {
		return blankPage(url, err?.name === 'AbortError' ? 'Timed out' : err?.message || 'Fetch failed');
	} finally {
		clearTimeout(timer);
	}
}

function blankPage(url: string, error: string): PageResult {
	return { url, status: 0, contentType: null, title: '', description: '', text: '', links: [], error };
}

function renderPage(p: PageResult, format: string): string {
	if (format === 'html') return `<!-- ${p.url} (HTTP ${p.status}) -->\n${p.raw || ''}`;
	if (format === 'text') return p.error ? `[${p.url}] Error: ${p.error}` : p.text;
	if (format === 'markdown') {
		if (p.error) return `## ${p.url}\n\n> Error: ${p.error}`;
		return [
			p.title ? `# ${p.title}` : `# ${p.url}`,
			p.description ? `> ${p.description}` : '',
			p.text,
			p.links.length ? '## Links\n' + p.links.map((l) => `- [${l.text || l.href}](${l.href})`).join('\n') : '',
		]
			.filter(Boolean)
			.join('\n\n');
	}
	return JSON.stringify(p, null, 2); // json
}

/** Executes a web bridge tool: get_all_pages (every configured page) or get_page (one). */
export async function executeWebTool(
	connection: any,
	tool: { name: string },
	args: Record<string, any>
): Promise<WebResult> {
	const format = ['json', 'text', 'markdown', 'html'].includes(String(args?.format)) ? String(args.format) : 'json';
	const wantRaw = format === 'html';

	// Custom headers configured on the connection (e.g. a cookie, auth header),
	// plus browser-like defaults so basic bot filters still respond.
	const headers: Record<string, string> = {
		'User-Agent': BROWSER_UA,
		Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'en-US,en;q=0.9',
	};
	const staticHeaders = (connection.config || {}).static_headers;
	if (staticHeaders && typeof staticHeaders === 'object') {
		for (const [k, v] of Object.entries(staticHeaders)) headers[k] = String(v);
	}

	const pages = connectionPages(connection);

	if (tool.name === 'get_all_pages') {
		if (!pages.length) return errorResult('No pages configured on this connection.');
		const targets = pages.slice(0, MAX_PAGES);
		const results = await Promise.all(targets.map((p) => fetchAndExtract(p, headers, wantRaw)));
		const truncated = pages.length > MAX_PAGES;

		let text: string;
		if (format === 'json') {
			text = JSON.stringify({ count: results.length, truncated, pages: results }, null, 2);
		} else {
			const sep = format === 'markdown' ? '\n\n---\n\n' : '\n\n========================================\n\n';
			text = results.map((r) => renderPage(r, format)).join(sep);
			if (truncated) text += `\n\n[Only the first ${MAX_PAGES} of ${pages.length} pages were fetched.]`;
		}
		return { content: [{ type: 'text', text }], isError: results.every((r) => !!r.error) };
	}

	// get_page — an explicit url, or the page at `index` (default 0).
	let target = args?.url && String(args.url).trim();
	if (!target) {
		const idx = Number.isInteger(args?.index) ? Number(args.index) : 0;
		target = pages[idx] || pages[0];
	}
	if (!target) return errorResult('No page URL configured or provided.');

	const result = await fetchAndExtract(target, headers, wantRaw);
	if (result.error && result.status === 0) return errorResult(`Failed to fetch ${target}: ${result.error}.`);
	return { content: [{ type: 'text', text: renderPage(result, format) }], isError: !!result.error };
}

function errorResult(message: string): WebResult {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
