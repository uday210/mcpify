'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, Wrench, Sparkles, Loader2 } from 'lucide-react';

interface Turn {
	role: 'user' | 'assistant' | 'tool';
	content: string;
	tool_calls?: any[] | null;
	name?: string;
}

export default function PlaygroundPage() {
	const { id } = useParams() as { id: string };
	const [server, setServer] = useState<any>(null);
	const [turns, setTurns] = useState<Turn[]>([]);
	const [input, setInput] = useState('');
	const [busy, setBusy] = useState(false);
	const [meta, setMeta] = useState<{ provider: string; model: string } | null>(null);
	const [error, setError] = useState<string | null>(null);
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		fetch(`/api/servers/${id}`).then((r) => r.json()).then(setServer).catch(() => {});
	}, [id]);

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
			// Send prior user/assistant text as context.
			const history = next.filter((t) => t.role === 'user' || (t.role === 'assistant' && t.content)).map((t) => ({ role: t.role, content: t.content }));
			const r = await fetch(`/api/servers/${id}/playground`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: history }),
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
		<div className="max-w-3xl mx-auto">
			<Link href={`/dashboard/servers/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
				<ArrowLeft className="w-4 h-4" /> Back to server
			</Link>

			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
						<Sparkles className="w-6 h-6 text-cyan-500" /> Playground
					</h1>
					<p className="text-slate-500 text-sm mt-0.5">Chat with {server?.name || 'this server'} — your LLM calls its tools for real.</p>
				</div>
				{meta && <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500">{meta.provider} · {meta.model}</span>}
			</div>

			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card flex flex-col h-[60vh]">
				<div className="flex-1 overflow-y-auto p-4 space-y-3">
					{turns.length === 0 && (
						<div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
							<Sparkles className="w-8 h-8 mb-2" />
							<p className="text-sm max-w-sm">Ask something that uses this server&apos;s tools. The model decides which tool to call and you&apos;ll see each call + result inline.</p>
						</div>
					)}
					{turns.map((t, i) => (
						<TurnView key={i} turn={t} />
					))}
					{busy && (
						<div className="flex items-center gap-2 text-slate-400 text-sm">
							<Loader2 className="w-4 h-4 animate-spin" /> thinking…
						</div>
					)}
					<div ref={endRef} />
				</div>

				{error && <div className="mx-4 mb-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}

				<div className="border-t border-slate-100 p-3 flex items-end gap-2">
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
						placeholder="Message…  (Enter to send, Shift+Enter for newline)"
						className="flex-1 resize-none px-3 py-2 text-sm rounded-xl border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none max-h-32"
					/>
					<button
						onClick={send}
						disabled={busy || !input.trim()}
						className="p-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition disabled:opacity-40"
					>
						<Send className="w-4 h-4" />
					</button>
				</div>
			</div>
			<p className="text-xs text-slate-400 mt-3">
				Uses your own connected LLM as the brain. Tool calls hit the real upstream APIs — they can create/modify data.
			</p>
		</div>
	);
}

function TurnView({ turn }: { turn: Turn }) {
	if (turn.role === 'user') {
		return (
			<div className="flex justify-end">
				<div className="max-w-[80%] bg-cyan-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm whitespace-pre-wrap">{turn.content}</div>
			</div>
		);
	}
	if (turn.role === 'tool') {
		return (
			<details className="ml-1 text-xs">
				<summary className="flex items-center gap-1.5 text-slate-500 cursor-pointer hover:text-slate-700">
					<Wrench className="w-3.5 h-3.5 text-cyan-500" /> {turn.name} result
				</summary>
				<pre className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-56 whitespace-pre-wrap">{turn.content}</pre>
			</details>
		);
	}
	// assistant
	return (
		<div className="space-y-1.5">
			{turn.tool_calls?.map((c: any, i: number) => (
				<div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
					<Wrench className="w-3.5 h-3.5 text-amber-500" />
					calling <code className="bg-slate-100 px-1 rounded">{c.function?.name}</code>
					<span className="text-slate-400 font-mono truncate max-w-[60%]">{c.function?.arguments}</span>
				</div>
			))}
			{turn.content && (
				<div className="flex justify-start">
					<div className="max-w-[85%] bg-slate-100 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-2 text-sm whitespace-pre-wrap">{turn.content}</div>
				</div>
			)}
		</div>
	);
}
