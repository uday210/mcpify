import crypto from 'crypto';

// Helpers for the MCP server OAuth 2.1 authorization-code + PKCE flow.
// Reuses the HMAC token signer in lib/oauth.ts for codes and access tokens.

/** Extract a server slug from an MCP resource URL (…/api/mcp/<slug>). */
export function slugFromResource(resource: string | null): string | null {
	if (!resource) return null;
	const m = resource.match(/\/api\/mcp\/([a-zA-Z0-9-]+)/);
	return m ? m[1] : null;
}

/** Verify a PKCE S256 challenge against a verifier. */
export function verifyPkce(codeChallenge: string | undefined, codeVerifier: string | undefined): boolean {
	if (!codeChallenge || !codeVerifier) return false;
	const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
	return hash === codeChallenge;
}

export function appBaseUrl(reqUrl: string): string {
	let u = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
	if (!u) u = new URL(reqUrl).origin;
	u = u.replace(/\/+$/, ''); // strip trailing slash(es)
	if (!/^https?:\/\//i.test(u)) u = 'https://' + u; // tolerate a missing scheme
	return u;
}
