'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Wrench, Loader2, Columns3 } from 'lucide-react';

interface Turn {
	role: 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: any[] | null;
	name?: string;
}
interface Provider {
	slug: string;
	name: string;
	defaultModel: string;
	connected: boolean;
	connectionId: string | null;
}

export default function ComparePage() {
	const { id } = useParams() as { id: string };
	const [server, setServer] = useState<any>(null);
	const [providers, setProviders] = useState<Provider[]>([]);
	const [selected, setSelected] = useState<string[]>([]); // connectionIds
	const [models, setModels] = useState<Record<string, string>>({});
	const [cols, setCols] = useState<Record<string, Turn[]>>({});
	const [busy, setBusy] = useState<Record<string, boolean>>({});
	const [input, setInput] = useState('');

	useEffect(() => {
		fetch(`/api/servers/${id}`).then((r) => r.json()).then(setServer).catch(() => {});
		fetch('/api/llm')
			.then((r) => r.json())
			.then((d) => {
				const conn = (d.providers || []).filter((p: Provider) => p.connected);
				setProviders(conn);
				setSelected(conn.slice(0, 3).map((p: Provider) => p.connectionId));
			})
			.catch(() => {});
	}, [id]);

	const toggle = (cid: string) =>
		setSelected((s) => (s.includes(cid) ? s.filter((x) => x !== cid) : [...s, cid]));

	const send = async () => {
		const text = input.trim();
		if (!text || selected.length === 0) return;
		setInput('');
		const userTurn: Turn = { role: 'user', content: text };
		// Append the user message to every selected column up front.
		setCols((c) => {
			const next = { ...c };
			for (const cid of selected) next[cid] = [...(next[cid] || []), userTurn];
			return next;
		});
		setBusy(Object.fromEntries(selected.map((cid) => [cid, true])));

		await Promise.all(
			selected.map(async (cid) => {
				const prov = providers.find((p) => p.connectionId === cid);
				const history = [...(cols[cid] || []), userTurn]
					.filter((t) => t.role === 'user' || (t.role === 'assistant' && t.content))
					.map((t) => ({ role: t.role, content: t.content }));
				try {
					const r = await fetch(`/api/servers/${id}/playground`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ messages: history, connectionId: cid, model: models[cid] || prov?.defaultModel }),
					});
					const d = await r.json();
					const appended: Turn[] = r.ok ? d.messages || [] : [{ role: 'assistant', content: `⚠ ${d.error || 'Run failed'}` }];
					setCols((c) => ({ ...c, [cid]: [...(c[cid] || []), ...appended] }));
				} catch (e: any) {
					setCols((c) => ({ ...c, [cid]: [...(c[cid] || []), { role: 'assistant', content: `⚠ ${e?.message || 'Run failed'}` }] }));
				} finally {
					setBusy((b) => ({ ...b, [cid]: false }));
				}
			})
		);
	};

	const clearAll = () => setCols({});
	const activeProviders = providers.filter((p) => selected.includes(p.connectionId!));

	return (
		<div>
			<Link href={`/dashboard/servers/${id}/playground`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
				<ArrowLeft className="w-4 h-4" /> Back to playground
			</Link>

			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						<Columns3 className="w-6 h-6 text-cyan-500" /> Compare models
					</h1>
					<p className="text-slate-500 text-sm mt-0.5">Run one prompt against several LLMs against {server?.name || 'this server'} — side by side.</p>
				</div>
				{Object.keys(cols).length > 0 && <button onClick={clearAll} className="text-sm text-slate-400 hover:text-slate-600">Clear</button>}
			</div>

			{providers.length === 0 ? (
				<div className="bg-white rounded-2xl border border-slate-200/70 p-8 text-center">
					<p className="text-slate-500 text-sm">No LLMs connected yet.</p>
					<Link href="/dashboard/settings" className="inline-block mt-3 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700">Connect one under Settings → AI</Link>
				</div>
			) : (
				<>
					{/* Provider picker */}
					<div className="flex flex-wrap gap-2 mb-4">
						{providers.map((p) => {
							const on = selected.includes(p.connectionId!);
							return (
								<button
									key={p.connectionId}
									onClick={() => toggle(p.connectionId!)}
									className={`px-3 py-1.5 rounded-full text-sm border transition ${on ? 'border-cyan-400 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
								>
									{p.name}
								</button>
							);
						})}
					</div>

					{/* Columns */}
					<div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${Math.max(1, activeProviders.length)}, minmax(0, 1fr))` }}>
						{activeProviders.map((p) => (
							<div key={p.connectionId} className="bg-white rounded-2xl border border-slate-200/70 shadow-card flex flex-col h-[58vh]">
								<div className="px-3 py-2 border-b border-slate-100 shrink-0">
									<div className="text-sm font-semibold text-slate-800">{p.name}</div>
									<input
										value={models[p.connectionId!] ?? ''}
										onChange={(e) => setModels((m) => ({ ...m, [p.connectionId!]: e.target.value }))}
										placeholder={p.defaultModel}
										className="mt-1 w-full text-[11px] font-mono px-2 py-1 rounded border border-slate-200 outline-none focus:border-cyan-400"
									/>
								</div>
								<div className="flex-1 overflow-y-auto p-2.5 space-y-2 min-h-0">
									{(cols[p.connectionId!] || []).map((t, i) => <TurnView key={i} turn={t} />)}
									{busy[p.connectionId!] && <div className="flex items-center gap-2 text-slate-400 text-xs"><Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking…</div>}
									{!cols[p.connectionId!]?.length && !busy[p.connectionId!] && <p className="text-xs text-slate-300 text-center mt-6">No output yet</p>}
								</div>
							</div>
						))}
					</div>

					{/* Shared composer */}
					<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-2.5 flex items-end gap-2 sticky bottom-4">
						<textarea
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									send();
								}
							}}
							rows={1}
							placeholder={`Message all ${activeProviders.length} model${activeProviders.length === 1 ? '' : 's'}…`}
							className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none max-h-32"
						/>
						<button onClick={send} disabled={!input.trim() || activeProviders.length === 0} className="p-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition disabled:opacity-40">
							<Send className="w-4 h-4" />
						</button>
					</div>
				</>
			)}
		</div>
	);
}

function TurnView({ turn }: { turn: Turn }) {
	if (turn.role === 'user') {
		return (
			<div className="flex justify-end">
				<div className="max-w-[90%] bg-cyan-600 text-white rounded-2xl rounded-br-sm px-3 py-1.5 text-xs whitespace-pre-wrap">{turn.content}</div>
			</div>
		);
	}
	if (turn.role === 'tool') {
		return (
			<details className="ml-1 text-[11px]">
				<summary className="flex items-center gap-1 text-slate-500 cursor-pointer hover:text-slate-700"><Wrench className="w-3 h-3 text-cyan-500" /> {turn.name}</summary>
				<pre className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-2 overflow-x-auto max-h-40 whitespace-pre-wrap">{turn.content}</pre>
			</details>
		);
	}
	return (
		<div className="space-y-1">
			{turn.tool_calls?.map((c: any, i: number) => (
				<div key={i} className="flex items-center gap-1 text-[11px] text-slate-500"><Wrench className="w-3 h-3 text-amber-500" /> <code className="bg-slate-100 px-1 rounded">{c.function?.name}</code></div>
			))}
			{turn.content && (
				<div className="flex justify-start">
					<div className="max-w-[95%] bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-3 py-1.5 text-xs whitespace-pre-wrap">{turn.content}</div>
				</div>
			)}
		</div>
	);
}
