// Parse a cURL command into a connection + tool draft. Best-effort: handles the
// common flags people copy from API docs / browser devtools.

export interface ParsedCurl {
	method: string;
	baseUrl: string; // origin
	path: string; // pathname with {placeholders} left as-is
	authType: 'none' | 'bearer' | 'basic' | 'custom';
	authValue?: string; // bearer token / custom header value
	authHeaderName?: string; // for custom
	basicUser?: string;
	basicPass?: string;
	staticHeaders: Record<string, string>;
	query: string[]; // query param names
	bodyKeys: string[]; // top-level JSON body keys (or ['body'] for raw)
	rawBody: boolean;
	suggestedName: string;
}

// Tokenize respecting single/double quotes and line continuations.
function tokenize(input: string): string[] {
	const s = input.replace(/\\\r?\n/g, ' ').trim();
	const out: string[] = [];
	let i = 0;
	while (i < s.length) {
		while (i < s.length && /\s/.test(s[i])) i++;
		if (i >= s.length) break;
		const q = s[i];
		if (q === '"' || q === "'") {
			i++;
			let buf = '';
			while (i < s.length && s[i] !== q) buf += s[i++];
			i++; // closing quote
			out.push(buf);
		} else {
			let buf = '';
			while (i < s.length && !/\s/.test(s[i])) buf += s[i++];
			out.push(buf);
		}
	}
	return out;
}

export function parseCurl(cmd: string): ParsedCurl {
	const toks = tokenize(cmd);
	let method = '';
	let url = '';
	const headers: Record<string, string> = {};
	let dataRaw: string | undefined;
	let basic: string | undefined;

	for (let i = 0; i < toks.length; i++) {
		const t = toks[i];
		if (t === 'curl') continue;
		if (t === '-X' || t === '--request') {
			method = (toks[++i] || '').toUpperCase();
		} else if (t === '-H' || t === '--header') {
			const h = toks[++i] || '';
			const idx = h.indexOf(':');
			if (idx > 0) headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
		} else if (t === '-u' || t === '--user') {
			basic = toks[++i];
		} else if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary' || t === '--data-ascii') {
			dataRaw = (dataRaw ? dataRaw + '&' : '') + (toks[++i] || '');
		} else if (t === '--url') {
			url = toks[++i] || '';
		} else if (t === '--compressed' || t === '-s' || t === '-L' || t === '-k' || t === '-i' || t === '-v' || t === '--silent' || t === '--location') {
			// ignore flags without values
		} else if (t.startsWith('-')) {
			// unknown flag: skip its value if it doesn't look like the next flag/url
			if (toks[i + 1] && !toks[i + 1].startsWith('-') && !/^https?:\/\//.test(toks[i + 1])) i++;
		} else if (/^https?:\/\//.test(t) && !url) {
			url = t;
		}
	}

	if (!method) method = dataRaw ? 'POST' : 'GET';

	let baseUrl = '';
	let path = '/';
	const query: string[] = [];
	try {
		const u = new URL(url);
		baseUrl = u.origin;
		path = u.pathname || '/';
		u.searchParams.forEach((_, k) => query.push(k));
	} catch {
		baseUrl = url;
	}

	// Auth detection
	let authType: ParsedCurl['authType'] = 'none';
	let authValue: string | undefined;
	let authHeaderName: string | undefined;
	let basicUser: string | undefined;
	let basicPass: string | undefined;
	const staticHeaders: Record<string, string> = {};

	for (const [k, v] of Object.entries(headers)) {
		if (k.toLowerCase() === 'authorization') {
			if (/^bearer\s+/i.test(v)) {
				authType = 'bearer';
				authValue = v.replace(/^bearer\s+/i, '');
			} else if (/^basic\s+/i.test(v)) {
				authType = 'basic';
			} else {
				authType = 'custom';
				authHeaderName = 'Authorization';
				authValue = v;
			}
		} else if (/api[-_]?key|token/i.test(k)) {
			authType = 'custom';
			authHeaderName = k;
			authValue = v;
		} else if (k.toLowerCase() !== 'content-type' && k.toLowerCase() !== 'accept' && k.toLowerCase() !== 'content-length') {
			staticHeaders[k] = v;
		}
	}
	if (basic) {
		authType = 'basic';
		const [bu, ...rest] = basic.split(':');
		basicUser = bu;
		basicPass = rest.join(':');
	}

	// Body keys
	let bodyKeys: string[] = [];
	let rawBody = false;
	if (dataRaw) {
		const trimmed = dataRaw.trim();
		if (trimmed.startsWith('{')) {
			try {
				bodyKeys = Object.keys(JSON.parse(trimmed));
			} catch {
				rawBody = true;
			}
		} else if (trimmed.includes('=')) {
			// form-style a=1&b=2
			bodyKeys = trimmed.split('&').map((p) => p.split('=')[0]).filter(Boolean);
		} else {
			rawBody = true;
		}
	}

	const seg = path.split('/').filter(Boolean).pop() || 'request';
	const suggestedName = `${method.toLowerCase()}_${seg}`.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);

	return {
		method,
		baseUrl,
		path,
		authType,
		authValue,
		authHeaderName,
		basicUser,
		basicPass,
		staticHeaders,
		query,
		bodyKeys,
		rawBody,
		suggestedName,
	};
}
