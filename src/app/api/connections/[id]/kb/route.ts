import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chunkText, embed, findEmbedder } from '@/lib/connectors/kb';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Strip HTML to readable text and collapse the whitespace that wrecks embeddings. */
function htmlToText(raw: string): string {
	return raw
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, '\n')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&quot;/g, '"')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/ *\n */g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

async function ownedKb(supabase: any, id: string) {
	const { data } = await supabase.from('app_connections').select('id, org_id, connector_type').eq('id', id).maybeSingle();
	return data && data.connector_type === 'knowledge' ? data : null;
}

/**
 * GET — knowledge base contents.
 *  - no query: summary { chunks, sources: [{source, count}] }
 *  - ?source=X: that source's chunks [{ id, preview }]
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownedKb(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const source = new URL(request.url).searchParams.get('source');

	if (source !== null) {
		const { data } = await admin.from('kb_chunks').select('id, content').eq('connection_id', id).eq('source', source).limit(1000);
		return NextResponse.json({ items: (data || []).map((c: any) => ({ id: c.id, preview: (c.content || '').slice(0, 300) })) });
	}

	const { data, error } = await admin.from('kb_chunks').select('source').eq('connection_id', id).limit(20000);
	if (error) return NextResponse.json({ chunks: 0, sources: [], migrated: false });
	const counts = new Map<string, number>();
	for (const r of data || []) counts.set(r.source || 'pasted', (counts.get(r.source || 'pasted') || 0) + 1);
	const sources = [...counts.entries()].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
	return NextResponse.json({ chunks: (data || []).length, sources, migrated: true });
}

/** POST — ingest text, a URL, or an uploaded file (PDF/txt/md). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const conn = await ownedKb(supabase, id);
	if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	let text = '';
	let source = '';

	const ctype = request.headers.get('content-type') || '';
	if (ctype.includes('multipart/form-data')) {
		const form = await request.formData();
		const file = form.get('file') as File | null;
		source = String(form.get('source') || '') || (file?.name ?? '');
		if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
		if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'File too large (15MB max).' }, { status: 400 });
		const buf = Buffer.from(await file.arrayBuffer());
		const name = (file.name || '').toLowerCase();
		try {
			if (name.endsWith('.pdf') || file.type === 'application/pdf') {
				const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
				text = (await pdfParse(buf)).text;
			} else {
				text = buf.toString('utf8');
			}
		} catch (e: any) {
			return NextResponse.json({ error: `Could not read the file: ${e?.message || 'parse error'}` }, { status: 400 });
		}
	} else {
		const body = await request.json().catch(() => ({}));
		text = body.text || '';
		source = body.source || '';
		if (!text && body.url) {
			try {
				const raw = await (await fetch(body.url)).text();
				text = htmlToText(raw);
				source = source || body.url;
			} catch {
				return NextResponse.json({ error: 'Could not fetch the URL.' }, { status: 400 });
			}
		}
	}

	if (!text.trim()) return NextResponse.json({ error: 'Nothing readable to ingest.' }, { status: 400 });

	const admin = createAdminClient();
	const embedder = await findEmbedder(admin, conn.org_id);
	if (!embedder) {
		return NextResponse.json({ error: 'No embeddings provider connected. Connect OpenAI, Mistral or Together under Settings → AI.' }, { status: 400 });
	}

	const chunks = chunkText(text);
	if (!chunks.length) return NextResponse.json({ error: 'Nothing to ingest.' }, { status: 400 });

	let added = 0;
	try {
		for (let i = 0; i < chunks.length; i += 50) {
			const batch = chunks.slice(i, i + 50);
			const vectors = await embed(batch, embedder);
			const rows = batch.map((c, j) => ({ connection_id: id, content: c, embedding: vectors[j] || [], source: source || 'pasted' }));
			const { error } = await admin.from('kb_chunks').insert(rows);
			if (error) {
				const msg = /kb_chunks.*does not exist/i.test(error.message) ? 'Knowledge bases need migration 024. Run it in your Supabase SQL editor.' : error.message;
				return NextResponse.json({ error: msg }, { status: 400 });
			}
			added += rows.length;
		}
	} catch (e: any) {
		return NextResponse.json({ error: e?.message || 'Ingest failed' }, { status: 400 });
	}

	return NextResponse.json({ added, source: source || 'pasted' });
}

/** DELETE — ?chunk=ID removes one chunk; ?source=X removes a source; else clears all. */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownedKb(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const sp = new URL(request.url).searchParams;
	const chunk = sp.get('chunk');
	const source = sp.get('source');
	let q = admin.from('kb_chunks').delete().eq('connection_id', id);
	if (chunk) q = q.eq('id', chunk);
	else if (source !== null) q = q.eq('source', source);
	const { error } = await q;
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
