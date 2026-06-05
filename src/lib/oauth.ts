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
	const [body, sig] = (state || '').split('.');
	if (!body || !sig) return null;
	const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
	// Constant-time compare.
	if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
		return null;
	}
	try {
		const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
		// Reject states older than 10 minutes.
		if (Date.now() - (data.t || 0) > 10 * 60 * 1000) return null;
		return data;
	} catch {
		return null;
	}
}
