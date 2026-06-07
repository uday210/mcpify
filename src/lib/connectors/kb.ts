import { decryptCredentials } from '@/lib/encryption';
import type { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

// Knowledge base (RAG) connector. Documents are chunked + embedded (via one of
// the user's connected LLMs) and stored in kb_chunks. The `search` tool embeds
// a query and returns the most similar chunks (cosine, computed in memory).

const EMBED_PROVIDERS: Record<string, string> = {
	openai: 'text-embedding-3-small',
	mistral: 'mistral-embed',
	together: 'BAAI/bge-base-en-v1.5',
};

export const KB_TOOLS: GeneratedTool[] = [
	{
		name: 'search',
		description: 'Semantic search over the knowledge base. Returns the most relevant passages.',
		input_schema: {
			type: 'object',
			properties: {
				query: { type: 'string', description: 'What to look for' },
				top_k: { type: 'integer', description: 'How many passages (default 5)' },
			},
			required: ['query'],
		},
		http_method: 'POST',
		path_template: '/',
		param_map: [],
	},
];

export function chunkText(text: string, size = 900, overlap = 150): string[] {
	const clean = text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
	if (clean.length <= size) return clean ? [clean] : [];
	const chunks: string[] = [];
	let i = 0;
	while (i < clean.length) {
		chunks.push(clean.slice(i, i + size));
		i += size - overlap;
	}
	return chunks;
}

export function cosine(a: number[], b: number[]): number {
	let dot = 0;
	let na = 0;
	let nb = 0;
	const n = Math.min(a.length, b.length);
	for (let i = 0; i < n; i++) {
		dot += a[i] * b[i];
		na += a[i] * a[i];
		nb += b[i] * b[i];
	}
	return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

interface Embedder {
	url: string;
	key: string;
	model: string;
	slug: string;
}

/** Find an embeddings-capable LLM connection in the org. */
export async function findEmbedder(admin: any, orgId: string): Promise<Embedder | null> {
	const slugs = Object.keys(EMBED_PROVIDERS);
	const { data: defs } = await admin.from('app_definitions').select('id, slug').in('slug', slugs);
	const slugById = new Map<string, string>((defs || []).map((d: any) => [d.id, d.slug]));
	const { data: conns } = await admin
		.from('app_connections')
		.select('app_def_id, base_url, credentials')
		.eq('org_id', orgId)
		.eq('is_active', true);
	for (const c of conns || []) {
		const slug = slugById.get(c.app_def_id);
		if (!slug || !c.credentials) continue;
		let key = '';
		try {
			key = decryptCredentials(c.credentials).value || '';
		} catch {
			continue;
		}
		if (!key) continue;
		return { url: `${(c.base_url || '').replace(/\/$/, '')}/embeddings`, key, model: EMBED_PROVIDERS[slug], slug };
	}
	return null;
}

export async function embed(texts: string[], e: Embedder): Promise<number[][]> {
	const resp = await fetch(e.url, {
		method: 'POST',
		headers: { Authorization: `Bearer ${e.key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ model: e.model, input: texts }),
	});
	if (!resp.ok) throw new Error(`Embedding failed (HTTP ${resp.status}) via ${e.slug}. ${(await resp.text()).slice(0, 160)}`);
	const data = await resp.json();
	return (data.data || []).map((d: any) => d.embedding as number[]);
}

export interface KbResult {
	content: Array<{ type: 'text'; text: string }>;
	isError: boolean;
}

/** Execute the KB `search` tool. */
export async function executeKbTool(connection: any, tool: { name: string }, args: Record<string, any>, admin: any): Promise<KbResult> {
	if (tool.name !== 'search') return err(`Unknown knowledge tool: ${tool.name}`);
	const query = String(args.query || '').trim();
	if (!query) return err('Missing required argument: query');
	const topK = Math.min(20, Math.max(1, Number(args.top_k) || 5));

	const embedder = await findEmbedder(admin, connection.org_id);
	if (!embedder) return err('No embeddings provider connected. Connect OpenAI, Mistral or Together under Settings → AI.');

	let qvec: number[];
	try {
		[qvec] = await embed([query], embedder);
	} catch (e: any) {
		return err(e?.message || 'Could not embed the query.');
	}

	const { data: chunks } = await admin
		.from('kb_chunks')
		.select('content, source, embedding')
		.eq('connection_id', connection.id)
		.limit(5000);
	if (!chunks || !chunks.length) return err('This knowledge base is empty. Add documents first.');

	const ranked = chunks
		.map((c: any) => ({ content: c.content, source: c.source, score: cosine(qvec, c.embedding || []) }))
		.sort((a: any, b: any) => b.score - a.score)
		.slice(0, topK);

	const text = ranked
		.map((r: any, i: number) => `# Result ${i + 1} (score ${r.score.toFixed(3)})${r.source ? ` — ${r.source}` : ''}\n${r.content}`)
		.join('\n\n---\n\n');
	return { content: [{ type: 'text', text }], isError: false };
}

function err(message: string): KbResult {
	return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
}
