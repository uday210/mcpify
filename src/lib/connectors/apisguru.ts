// Large external catalog sourced from APIs.guru (~2,500 public APIs with
// OpenAPI specs). We cache the directory in memory and search it; the chosen
// API is connected via the existing OpenAPI connector (its spec is parsed into
// MCP tools). This is how we offer a Pipedream-scale catalog without hand-
// authoring thousands of connectors.

export interface ExternalApp {
	slug: string; // apisguru:<id>
	id: string;
	name: string;
	description: string;
	provider: string;
	logo_url: string | null;
	swaggerUrl: string;
}

let cache: ExternalApp[] | null = null;
let loadingPromise: Promise<ExternalApp[]> | null = null;

async function loadList(): Promise<ExternalApp[]> {
	const resp = await fetch('https://api.apis.guru/v2/list.json');
	if (!resp.ok) throw new Error(`APIs.guru list failed: ${resp.status}`);
	const data = await resp.json();
	const apps: ExternalApp[] = [];
	for (const [id, entry] of Object.entries<any>(data)) {
		const preferred = entry.preferred;
		const version = entry.versions?.[preferred] || Object.values(entry.versions || {})[0];
		if (!version) continue;
		const info = version.info || {};
		const swaggerUrl = version.swaggerUrl || version.openapiUrl;
		if (!swaggerUrl) continue;
		apps.push({
			slug: `apisguru:${id}`,
			id,
			name: info.title || id,
			description: (info.description || '').slice(0, 140),
			provider: info['x-providerName'] || id.split(':')[0],
			logo_url: info['x-logo']?.url || null,
			swaggerUrl,
		});
	}
	apps.sort((a, b) => a.name.localeCompare(b.name));
	return apps;
}

export async function getExternalApps(): Promise<ExternalApp[]> {
	if (cache) return cache;
	if (!loadingPromise) {
		loadingPromise = loadList()
			.then((list) => {
				cache = list;
				return list;
			})
			.catch((e) => {
				loadingPromise = null; // allow retry on next call
				throw e;
			});
	}
	return loadingPromise;
}

export async function searchExternalApps(query: string, limit = 30): Promise<ExternalApp[]> {
	const list = await getExternalApps();
	const q = query.toLowerCase().trim();
	if (!q) return list.slice(0, limit);
	const matches = list.filter(
		(a) => a.name.toLowerCase().includes(q) || a.provider.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
	);
	return matches.slice(0, limit);
}

export async function getExternalApp(id: string): Promise<ExternalApp | null> {
	const list = await getExternalApps();
	return list.find((a) => a.id === id) || null;
}
