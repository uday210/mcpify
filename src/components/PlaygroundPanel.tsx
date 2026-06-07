'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Wrench, Sparkles, Loader2, X } from 'lucide-react';
import { getPrefs } from '@/lib/preferences';

interface Turn {
	role: 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: any[] | null;
	name?: string;
}

export default function PlaygroundPanel({
	serverId,
	serverName,
	onClose,
	className = '',
}: {
	serverId: string;
	serverName?: string;
	onClose?: () => void;
	className?: string;
}) {
	const [turns, setTurns] = useState<Turn[]>([]);
	const [input, setInput] = useState('');
	const [busy, setBusy] = useState(false);
	const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [turns, busy]);

	const send = async () => {
		const text = input.trim();
		if (!text || busy) return;
		setError(null);
		const next = [...turns, { role: 'user' as const, content: text }];
		setTurns(next);
		setInput('');
		setBusy(true);
		try {
			const history = next.filter((t) => t.role === 'user' || (t.role === 'assistant' && t.content)).map((t) => ({ role: t.role, content: t.content }));
			const prefs = getPrefs();
			const r = await fetch(`/api/servers/${serverId}/playground`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: history, connectionId: prefs.llmConnectionId || undefined, model: prefs.llmModel || undefined }),
			});
			const d = await r.json();
			if (!r.ok) {
				setError(d.error || 'Run failed');
				return;
			}
			if (d.provider) setMeta({ provider: d.provider, model: d.model });
			setTurns((cur) => [...cur, ...(d.messages || [])]);
		} catch (e: any) {
			setError(e?.message || 'Run failed');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={`flex flex-col bg-white border border-slate-200/70 rounded-2xl shadow-card overflow-hidden ${className}`}>
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 shrink-0">
				<div className="flex items-center gap-2 min-w-0">
					<Sparkles className="w-4 h-4 text-cyan-500 shrink-0" />
					<span className="text-sm font-semibold text-slate-800 truncate">Playground</span>
					{meta && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 truncate">{meta.provider}</span>}
				</div>
				<div className="flex items-center gap-1">
					{turns.length > 0 && (
						<button onClick={() => { setTurns([]); setError(null); }} className="text-xs text-slate-400 hover:text-slate-600 px-1.5">Clear</button>
					)}
					{onClose && (
						<button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1" title="Close"><X className="w-4 h-4" /></button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
				{turns.length === 0 && (
					<div className="h-full flex flex-col items-center justify-center text-center text-slate-400 px-4">
						<Sparkles className="w-7 h-7 mb-2" />
						<p className="text-xs">Ask something that uses {serverName || 'this server'}&apos;s tools. The model picks the tool and you&apos;ll see each call inline.</p>
					</div>
				)}
				{turns.map((t, i) => <TurnView key={i} turn={t} />)}
				{busy && <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> thinking…</div>}
				<div ref={endRef} />
			</div>

			{error && (
				<div className="mx-3 mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between gap-2 shrink-0">
					<span>{error}</span>
					{/No connected LLM/i.test(error) && (
						<Link href="/dashboard/settings" className="shrink-0 px-2 py-1 rounded-md bg-red-600 text-white font-medium hover:bg-red-700">Settings → AI</Link>
					)}
				</div>
			)}

			<div className="border-t border-slate-100 p-2.5 flex items-end gap-2 shrink-0">
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
					placeholder="Message…"
					className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none max-h-32"
				/>
				<button onClick={send} disabled={busy || !input.trim()} className="p-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition disabled:opacity-40">
					<Send className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}

function TurnView({ turn }: { turn: Turn }) {
	if (turn.role === 'user') {
		return (
			<div className="flex justify-end">
				<div className="max-w-[85%] bg-cyan-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2 text-sm whitespace-pre-wrap">{turn.content}</div>
			</div>
		);
	}
	if (turn.role === 'tool') {
		return (
			<details className="ml-1 text-xs">
				<summary className="flex items-center gap-1.5 text-slate-500 cursor-pointer hover:text-slate-700">
					<Wrench className="w-3.5 h-3.5 text-cyan-500" /> {turn.name} result
				</summary>
				<pre className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-2.5 overflow-x-auto max-h-52 whitespace-pre-wrap">{turn.content}</pre>
			</details>
		);
	}
	return (
		<div className="space-y-1.5">
			{turn.tool_calls?.map((c: any, i: number) => (
				<div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
					<Wrench className="w-3.5 h-3.5 text-amber-500" />
					calling <code className="bg-slate-100 px-1 rounded">{c.function?.name}</code>
				</div>
			))}
			{turn.content && (
				<div className="flex justify-start">
					<div className="max-w-[90%] bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-3.5 py-2 text-sm whitespace-pre-wrap">{turn.content}</div>
				</div>
			)}
		</div>
	);
}
