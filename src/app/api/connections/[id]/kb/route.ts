import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { chunkText, embed, findEmbedder } from '@/lib/connectors/kb';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function ownedKb(supabase: any, id: string) {
	const { data } = await supabase.from('app_connections').select('id, org_id, connector_type').eq('id', id).maybeSingle();
	return data && data.connector_type === 'knowledge' ? data : null;
}

/** GET — knowledge base stats (chunk count + sources). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownedKb(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const { data, error } = await admin.from('kb_chunks').select('source').eq('connection_id', id).limit(5000);
	if (error) return NextResponse.json({ chunks: 0, sources: [], migrated: false });
	const sources = Array.from(new Set((data || []).map((d: any) => d.source).filter(Boolean)));
	return NextResponse.json({ chunks: (data || []).length, sources, migrated: true });
}

/** POST — ingest a document: { text?, url?, source? }. Chunks + embeds + stores. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const conn = await ownedKb(supabase, id);
	if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	let text: string = body.text || '';
	let source: string = body.source || '';

	if (!text && body.url) {
		try {
			const r = await fetch(body.url);
			const raw = await r.text();
			// crude HTML -> text
			text = raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
			source = source || body.url;
		} catch {
			return NextResponse.json({ error: 'Could not fetch the URL.' }, { status: 400 });
		}
	}
	if (!text.trim()) return NextResponse.json({ error: 'Provide text or a URL to ingest.' }, { status: 400 });

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

/** DELETE — clear all chunks for this knowledge base. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownedKb(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
	const admin = createAdminClient();
	await admin.from('kb_chunks').delete().eq('connection_id', id);
	return NextResponse.json({ ok: true });
}
