// Derives a reliable icon URL for a connector from its API base URL, using
// Google's favicon service (Clearbit's logo API was sunset). We reduce the
// host to its registrable domain so e.g. api.github.com -> github.com.

export function registrableDomain(host: string): string {
	const parts = host.split('.').filter(Boolean);
	if (parts.length <= 2) return host;
	return parts.slice(-2).join('.');
}

export function faviconFor(baseUrl: string | null | undefined): string | null {
	if (!baseUrl) return null;
	try {
		const host = new URL(baseUrl).host;
		const domain = registrableDomain(host);
		return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
	} catch {
		return null;
	}
}
