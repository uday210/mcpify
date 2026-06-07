'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Check, X } from 'lucide-react';
import { toast } from '@/components/Toaster';
import { timeAgo } from '@/components/monitor';

interface Approval {
	id: string;
	tool_name: string;
	args: any;
	client_ip: string | null;
	created_at: string;
}

export default function ServerApprovals({ serverId }: { serverId: string }) {
	const [pending, setPending] = useState<Approval[]>([]);
	const [busy, setBusy] = useState<string | null>(null);

	const load = () =>
		fetch(`/api/servers/${serverId}/approvals?status=pending`)
			.then((r) => r.json())
			.then((d) => setPending(Array.isArray(d) ? d : []))
			.catch(() => {});

	useEffect(() => {
		load();
		const t = setInterval(load, 3000);
		return () => clearInterval(t);
	}, [serverId]);

	const decide = async (a: Approval, decision: 'approved' | 'denied') => {
		setBusy(a.id);
		try {
			const r = await fetch(`/api/servers/${serverId}/approvals/${a.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ decision }),
			});
			if (r.ok) {
				setPending((p) => p.filter((x) => x.id !== a.id));
				toast(decision === 'approved' ? 'Approved' : 'Denied', decision === 'approved' ? 'success' : 'info');
			} else {
				toast('Could not record decision', 'error');
			}
		} finally {
			setBusy(null);
		}
	};

	if (pending.length === 0) return null; // only surfaces when something is waiting

	return (
		<div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-card p-6 mb-6">
			<h2 className="font-semibold text-amber-800 flex items-center gap-2 mb-1">
				<ShieldAlert className="w-5 h-5" />
				Pending approvals ({pending.length})
			</h2>
			<p className="text-xs text-amber-700/80 mb-4">A client is waiting on these calls. Approve or deny within ~55s or they time out.</p>
			<div className="space-y-2">
				{pending.map((a) => (
					<div key={a.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-start justify-between gap-3">
						<div className="min-w-0">
							<div className="text-sm font-mono font-medium text-slate-800">{a.tool_name}</div>
							<pre className="text-xs text-slate-500 mt-1 whitespace-pre-wrap max-h-24 overflow-y-auto">{JSON.stringify(a.args, null, 2)}</pre>
							<div className="text-[11px] text-slate-400 mt-1">{a.client_ip || 'unknown'} · {timeAgo(a.created_at)}</div>
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<button onClick={() => decide(a, 'approved')} disabled={busy === a.id} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition disabled:opacity-50">
								<Check className="w-3.5 h-3.5" /> Approve
							</button>
							<button onClick={() => decide(a, 'denied')} disabled={busy === a.id} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition disabled:opacity-50">
								<X className="w-3.5 h-3.5" /> Deny
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
