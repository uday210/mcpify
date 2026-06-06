// Redaction for access-log bodies. Upstream requests/responses can carry
// secrets (tokens, passwords, keys); we strip the obvious ones before the
// request/response bodies are persisted to mcp_access_logs.

const SENSITIVE_KEY = /(pass(word)?|secret|token|api[_-]?key|authorization|bearer|credential|client[_-]?secret|access[_-]?key|private[_-]?key|refresh[_-]?token)/i;
const REDACTED = '«redacted»';

/** Deep-redact values whose key looks sensitive. Returns a safe clone. */
export function redactObject(value: any, depth = 0): any {
	if (depth > 6 || value == null) return value;
	if (Array.isArray(value)) return value.map((v) => redactObject(v, depth + 1));
	if (typeof value === 'object') {
		const out: Record<string, any> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = SENSITIVE_KEY.test(k) ? REDACTED : redactObject(v, depth + 1);
		}
		return out;
	}
	return value;
}

/** Best-effort redaction of secrets in a free-text body (JSON or otherwise). */
export function redactText(text: string | null): string | null {
	if (!text) return text;
	let out = text;
	// "sensitive_key": "value"  ->  "sensitive_key": "«redacted»"
	out = out.replace(
		/("(?:[^"]*(?:pass(?:word)?|secret|token|api[_-]?key|authorization|bearer|credential|access[_-]?key|refresh[_-]?token)[^"]*)"\s*:\s*)"(?:\\.|[^"\\])*"/gi,
		`$1"${REDACTED}"`
	);
	// Bearer <token>  and  Basic <base64>
	out = out.replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/g, `$1 ${REDACTED}`);
	return out;
}
