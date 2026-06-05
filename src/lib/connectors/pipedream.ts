import apps from './pipedream-apps.json';

// A browsable directory of ~3,300 app names sourced from the Pipedream
// components registry. We don't have their endpoints (they're hand-written JS,
// not OpenAPI), so a selected directory app is connected via OpenAPI/manual —
// this just gives Pipedream-scale discoverability in the catalog search.

export interface DirectoryApp {
	slug: string;
	name: string;
}

const list = apps as DirectoryApp[];

export function searchDirectory(query: string, limit = 24): DirectoryApp[] {
	const q = query.toLowerCase().trim();
	if (q.length < 2) return [];
	const starts: DirectoryApp[] = [];
	const contains: DirectoryApp[] = [];
	for (const a of list) {
		const n = a.name.toLowerCase();
		if (n.startsWith(q)) starts.push(a);
		else if (n.includes(q) || a.slug.includes(q)) contains.push(a);
		if (starts.length >= limit) break;
	}
	return [...starts, ...contains].slice(0, limit);
}

export const directoryCount = list.length;
