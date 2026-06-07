'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/components/Toaster';

export default function ConnectionKB({ connectionId }: { connectionId: string }) {
	const [stats, setStats] = useState<{ chunks: number; sources: string[]; migrated?: boolean } | null>(null);
	const [mode, setMode] = useState<'text' | 'url'>('text');
	const [text, setText] = useState('');
	const [url, setUrl] = useState('');
	const [source, setSource] = useState('');
	const [busy, setBusy] = useState(false);

	const load = () =>
		fetch(`/api/connections/${connectionId}/kb`)
			.then((r) => r.json())
			.then((d) => setStats(d))
			.catch(() => {});

	useEffect(() => {
		load();
	}, [connectionId]);

	const ingest = async () => {
		const payload = mode === 'text' ? { text, source } : { url, source };
		if ((mode === 'text' && !text.trim()) || (mode === 'url' && !url.trim())) return;
		setBusy(true);
		const r = await fetch(`/api/connections/${connectionId}/kb`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const d = await r.json();
		setBusy(false);
		if (!r.ok) return toast(d.error || 'Ingest failed', 'error');
		toast(`Added ${d.added} chunks`, 'success');
		setText('');
		setUrl('');
		setSource('');
		load();
	};

	const clear = async () => {
		if (!confirm('Delete all documents in this knowledge base?')) return;
		await fetch(`/api/connections/${connectionId}/kb`, { method: 'DELETE' });
		toast('Knowledge base cleared', 'success');
		load();
	};

	const input = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none';

	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mt-6">
			<div className="flex items-center justify-between mb-1">
				<h2 className="font-semibold text-slate-900 flex items-center gap-2"><BookOpen className="w-4 h-4 text-slate-400" /> Documents</h2>
				{stats && stats.chunks > 0 && (
					<button onClick={clear} className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /> Clear</button>
				)}
			</div>
			<p className="text-xs text-slate-400 mb-4">
				{stats ? `${stats.chunks} chunks${stats.sources.length ? ` · ${stats.sources.length} source(s)` : ''}` : 'Loading…'} — added text/URLs are chunked + embedded and searchable via the <span className="font-mono">search</span> tool.
			</p>

			<div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-lg w-fit text-sm">
				{(['text', 'url'] as const).map((m) => (
					<button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md capitalize ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>{m === 'text' ? 'Paste text' : 'From URL'}</button>
				))}
			</div>

			<div className="space-y-2">
				{mode === 'text' ? (
					<textarea className={`${input} h-32`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste documentation, notes, FAQs…" />
				) : (
					<input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.example.com/page" />
				)}
				<input className={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="source label (optional, e.g. 'Handbook')" />
				<button onClick={ingest} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50 flex items-center gap-2">
					{busy && <Loader2 className="w-4 h-4 animate-spin" />}
					{busy ? 'Embedding…' : 'Add to knowledge base'}
				</button>
			</div>

			{stats && stats.sources.length > 0 && (
				<div className="mt-4 flex flex-wrap gap-1.5">
					{stats.sources.map((s) => (
						<span key={s} className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{s}</span>
					))}
				</div>
			)}
		</div>
	);
}
