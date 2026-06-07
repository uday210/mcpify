// Encode a (possibly nested) object as application/x-www-form-urlencoded using
// Rails/Stripe-style bracket notation:
//   { a: 1, b: { c: 2 }, d: [3, 4] }  ->  a=1&b[c]=2&d[0]=3&d[1]=4
// Used for APIs (Stripe, Twilio, Mailgun) that don't accept JSON bodies.

export function formEncode(obj: Record<string, any>): string {
	const params = new URLSearchParams();
	const walk = (key: string, val: any) => {
		if (val === undefined || val === null) return;
		if (Array.isArray(val)) {
			val.forEach((v, i) => walk(`${key}[${i}]`, v));
		} else if (typeof val === 'object') {
			for (const [k, v] of Object.entries(val)) walk(`${key}[${k}]`, v);
		} else {
			params.append(key, typeof val === 'boolean' ? String(val) : String(val));
		}
	};
	for (const [k, v] of Object.entries(obj || {})) walk(k, v);
	return params.toString();
}
