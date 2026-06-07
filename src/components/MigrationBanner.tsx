'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X, Copy, Check } from 'lucide-react';

export default function MigrationBanner() {
	const [missing, setMissing] = useState<{ id: string; label: string }[]>([]);
	const [sql, setSql] = useState('');
	const [open, setOpen] = useState(false);
	const [dismissed, setDismissed] = useState(true);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		fetch('/api/health/migrations')
			.then((r) => r.json())
			.then((d) => {
				if (d.applied || !Array.isArray(d.missing) || d.missing.length === 0) return;
				setMissing(d.missing);
				setSql(d.sql || '');
				// Re-show unless this exact set was dismissed before.
				const key = 'mcpify.migDismiss';
				const sig = d.missing.map((m: any) => m.id).join(',');
				if (sessionStorage.getItem(key) !== sig) setDismissed(false);
			})
			.catch(() => {});
	}, []);

	if (dismissed || missing.length === 0) return null;

	const dismiss = () => {
		sessionStorage.setItem('mcpify.migDismiss', missing.map((m) => m.id).join(','));
		setDismissed(true);
	};
	const copy = () => {
		navigator.clipboard.writeText(sql);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="bg-amber-50 border-b border-amber-200">
			<div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center gap-3 text-sm">
				<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
				<span className="text-amber-800 flex-1 min-w-0">
					{missing.length} feature{missing.length === 1 ? '' : 's'} need a one-time DB migration:{' '}
					<span className="font-medium">{missing.map((m) => m.label).join(', ')}</span>.
				</span>
				<button onClick={() => setOpen(true)} className="shrink-0 px-3 py-1 rounded-md bg-amber-600 text-white font-medium hover:bg-amber-700">
					Show SQL
				</button>
				<button onClick={dismiss} className="shrink-0 text-amber-500 hover:text-amber-700" title="Dismiss"><X className="w-4 h-4" /></button>
			</div>

			{open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
					<div className="absolute inset-0 bg-black/40" />
					<div className="relative bg-white rounded-2xl shadow-lift max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
						<div className="flex items-center justify-between mb-2">
							<h3 className="font-semibold text-slate-900">Run this in your Supabase SQL editor</h3>
							<button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
						</div>
						<p className="text-sm text-slate-500 mb-3">
							These statements are idempotent (<code className="bg-slate-100 px-1 rounded">IF NOT EXISTS</code>) — safe to run as one block.
						</p>
						<div className="relative">
							<button onClick={copy} className="absolute right-2 top-2 flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 text-white rounded-md hover:bg-slate-700">
								{copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied' : 'Copy'}
							</button>
							<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 pt-9 overflow-auto max-h-[55vh] whitespace-pre">{sql}</pre>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
