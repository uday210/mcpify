'use client';

import { useEffect, useState } from 'react';
import { BookOpen, Trash2, Loader2, ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { toast } from '@/components/Toaster';

interface SrcRow { source: string; count: number }

export default function ConnectionKB({ connectionId }: { connectionId: string }) {
	const [sources, setSources] = useState<SrcRow[]>([]);
	const [total, setTotal] = useState(0);
	const [mode, setMode] = useState<'text' | 'url' | 'file'>('text');
	const [text, setText] = useState('');
	const [url, setUrl] = useState('');
	const [file, setFile] = useState<File | null>(null);
	const [source, setSource] = useState('');
	const [busy, setBusy] = useState(false);
	const [openSrc, setOpenSrc] = useState<string | null>(null);
	const [chunks, setChunks] = useState<{ id: string; preview: string }[]>([]);

	const load = () =>
		fetch(`/api/connections/${connectionId}/kb`)
			.then((r) => r.json())
			.then((d) => { setSources(d.sources || []); setTotal(d.chunks || 0); })
			.catch(() => {});

	useEffect(() => { load(); }, [connectionId]);

	const ingest = async () => {
		setBusy(true);
		try {
			let r: Response;
			if (mode === 'file') {
				if (!file) return;
				const fd = new FormData();
				fd.append('file', file);
				if (source) fd.append('source', source);
				r = await fetch(`/api/connections/${connectionId}/kb`, { method: 'POST', body: fd });
			} else {
				const payload = mode === 'text' ? { text, source } : { url, source };
				if ((mode === 'text' && !text.trim()) || (mode === 'url' && !url.trim())) return;
				r = await fetch(`/api/connections/${connectionId}/kb`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
			}
			const d = await r.json();
			if (!r.ok) return toast(d.error || 'Ingest failed', 'error');
			toast(`Added ${d.added} chunks`, 'success');
			setText(''); setUrl(''); setFile(null); setSource('');
			load();
		} finally {
			setBusy(false);
		}
	};

	const expand = async (src: string) => {
		if (openSrc === src) { setOpenSrc(null); return; }
		setOpenSrc(src);
		setChunks([]);
		const d = await fetch(`/api/connections/${connectionId}/kb?source=${encodeURIComponent(src)}`).then((r) => r.json()).catch(() => ({}));
		setChunks(d.items || []);
	};

	const delSource = async (src: string) => {
		if (!confirm(`Delete source "${src}" and all its chunks?`)) return;
		await fetch(`/api/connections/${connectionId}/kb?source=${encodeURIComponent(src)}`, { method: 'DELETE' });
		toast('Source deleted', 'success');
		if (openSrc === src) setOpenSrc(null);
		load();
	};

	const delChunk = async (cid: string, src: string) => {
		await fetch(`/api/connections/${connectionId}/kb?chunk=${cid}`, { method: 'DELETE' });
		setChunks((c) => c.filter((x) => x.id !== cid));
		load();
		void src;
	};

	const input = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none';

	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mt-6">
			<h2 className="font-semibold text-slate-900 flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-slate-400" /> Documents</h2>
			<p className="text-xs text-slate-400 mb-4">{total} chunks across {sources.length} source(s). Added content is chunked + embedded and searchable via the <span className="font-mono">search</span> tool.</p>

			{/* Add */}
			<div className="flex gap-1 mb-3 bg-slate-100 p-1 rounded-lg w-fit text-sm">
				{(['text', 'url', 'file'] as const).map((m) => (
					<button key={m} onClick={() => setMode(m)} className={`px-3 py-1 rounded-md capitalize ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
						{m === 'text' ? 'Paste text' : m === 'url' ? 'From URL' : 'Upload file'}
					</button>
				))}
			</div>

			<div className="space-y-2">
				{mode === 'text' && <textarea className={`${input} h-32`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste documentation, notes, FAQs…" />}
				{mode === 'url' && <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://docs.example.com/page" />}
				{mode === 'file' && (
					<label className="flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-slate-300 hover:border-cyan-400 cursor-pointer text-sm text-slate-600">
						<FileText className="w-4 h-4 text-slate-400" />
						{file ? file.name : 'Choose a PDF, .txt or .md file (15MB max)'}
						<input type="file" accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain" className="hidden" onChange={(e) => { setFile(e.target.files?.[0] || null); if (e.target.files?.[0] && !source) setSource(e.target.files[0].name); }} />
					</label>
				)}
				<input className={input} value={source} onChange={(e) => setSource(e.target.value)} placeholder="source label (optional)" />
				<button onClick={ingest} disabled={busy} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50 flex items-center gap-2">
					{busy && <Loader2 className="w-4 h-4 animate-spin" />}
					{busy ? 'Embedding…' : 'Add to knowledge base'}
				</button>
			</div>

			{/* Sources */}
			{sources.length > 0 && (
				<div className="mt-5 border-t border-slate-100 pt-4">
					<div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Sources</div>
					<div className="divide-y divide-slate-100">
						{sources.map((s) => (
							<div key={s.source} className="py-2">
								<div className="flex items-center gap-2">
									<button onClick={() => expand(s.source)} className="flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-900 flex-1 min-w-0">
										{openSrc === s.source ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
										<span className="truncate">{s.source}</span>
										<span className="text-xs text-slate-400 shrink-0">{s.count} chunks</span>
									</button>
									<button onClick={() => delSource(s.source)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete source"><Trash2 className="w-4 h-4" /></button>
								</div>
								{openSrc === s.source && (
									<div className="ml-5 mt-2 space-y-1.5">
										{chunks.length === 0 && <p className="text-xs text-slate-400">Loading…</p>}
										{chunks.map((c) => (
											<div key={c.id} className="flex items-start gap-2 group">
												<p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 flex-1 min-w-0 whitespace-pre-wrap line-clamp-3">{c.preview}…</p>
												<button onClick={() => delChunk(c.id, s.source)} className="p-1 text-slate-300 hover:text-red-600 shrink-0" title="Delete chunk"><Trash2 className="w-3.5 h-3.5" /></button>
											</div>
										))}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
