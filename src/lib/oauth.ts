import crypto from 'crypto';

// Signed, stateless OAuth `state` parameter. We HMAC a small JSON payload with
// JWT_SECRET so the callback can trust the connection id without server-side
// session storage.

function secret(): string {
	return process.env.JWT_SECRET || 'default-secret';
}

export function signState(payload: Record<string, any>): string {
	const body = Buffer.from(JSON.stringify({ ...payload, t: Date.now() })).toString('base64url');
	const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
	return `${body}.${sig}`;
}

export function verifyState(state: string): Record<string, any> | null {
	return verifyToken(state, 10 * 60 * 1000);
}

/** Sign an HMAC token (used for MCP server OAuth access tokens). Same format as state. */
export function signToken(payload: Record<string, any>): string {
	return signState(payload);
}

/** Verify an HMAC token and enforce a max age (ms). Returns the payload or null. */
export function verifyToken(token: string, maxAgeMs: number): Record<string, any> | null {
	const [body, sig] = (token || '').split('.');
	if (!body || !sig) return null;
	const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
	if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
		return null;
	}
	try {
		const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		if (Date.now() - (data.t || 0) > maxAgeMs) return null;
		return data;
	} catch {
		return null;
	}
}
