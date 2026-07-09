import { describe, it, expect } from 'vitest';
import { extractPage, isSafeHttpUrl } from '@/lib/connectors/web';

const HTML = `<!doctype html>
<html>
<head>
  <title>Widget &amp; Co</title>
  <meta name="description" content="The best widgets around." />
  <style>.x{color:red}</style>
</head>
<body>
  <script>console.log('nope')</script>
  <h1>Welcome</h1>
  <p>Buy our widgets today.</p>
  <a href="/about">About us</a>
  <a href="https://other.example.com/x">External</a>
  <a href="mailto:a@b.com">Mail</a>
</body>
</html>`;

describe('extractPage', () => {
	const ex = extractPage(HTML, 'https://shop.example.com/home');

	it('decodes and extracts the title', () => {
		expect(ex.title).toBe('Widget & Co');
	});
	it('extracts the meta description', () => {
		expect(ex.description).toBe('The best widgets around.');
	});
	it('strips scripts and styles from text', () => {
		expect(ex.text).toContain('Welcome');
		expect(ex.text).toContain('Buy our widgets today.');
		expect(ex.text).not.toContain('console.log');
		expect(ex.text).not.toContain('color:red');
	});
	it('resolves relative links and skips mailto', () => {
		const hrefs = ex.links.map((l) => l.href);
		expect(hrefs).toContain('https://shop.example.com/about');
		expect(hrefs).toContain('https://other.example.com/x');
		expect(hrefs.some((h) => h.startsWith('mailto:'))).toBe(false);
	});
});

describe('isSafeHttpUrl', () => {
	it('allows public https URLs', () => {
		expect(isSafeHttpUrl('https://example.com/page').ok).toBe(true);
	});
	it('blocks localhost and private ranges', () => {
		expect(isSafeHttpUrl('http://localhost:8080').ok).toBe(false);
		expect(isSafeHttpUrl('http://127.0.0.1/').ok).toBe(false);
		expect(isSafeHttpUrl('http://10.0.0.5/').ok).toBe(false);
		expect(isSafeHttpUrl('http://192.168.1.1/').ok).toBe(false);
		expect(isSafeHttpUrl('http://169.254.169.254/latest/meta-data').ok).toBe(false);
	});
	it('blocks non-http schemes', () => {
		expect(isSafeHttpUrl('file:///etc/passwd').ok).toBe(false);
		expect(isSafeHttpUrl('ftp://example.com').ok).toBe(false);
	});
});
