'use client';

import { Fragment, useState } from 'react';

// Shared monitoring widgets used by the server detail page and the org-wide
// Activity page: stat cards, an hourly calls bar chart, and a calls table.

export function Stat({
	label,
	value,
	tone = 'default',
}: {
	label: string;
	value: string | number;
	tone?: 'default' | 'good' | 'bad';
}) {
	const color =
		tone === 'good' ? 'text-green-600' : tone === 'bad' ? 'text-red-600' : 'text-slate-900';
	return (
		<div className="bg-white rounded-xl border border-slate-200 p-4">
			<div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
			<div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
		</div>
	);
}

interface LogRow {
	created_at: string;
	status_code: number | null;
}

/** 24-hour bar chart of call volume, errors highlighted in red. */
export function CallsBarChart({ logs }: { logs: LogRow[] }) {
	const now = Date.now();
	const buckets = Array.from({ length: 24 }, () => ({ ok: 0, err: 0 }));
	for (const l of logs) {
		const t = new Date(l.created_at).getTime();
		const hoursAgo = Math.floor((now - t) / 3_600_000);
		if (hoursAgo >= 0 && hoursAgo < 24) {
			const idx = 23 - hoursAgo;
			if ((l.status_code || 0) >= 400) buckets[idx].err++;
			else buckets[idx].ok++;
		}
	}
	const max = Math.max(1, ...buckets.map((b) => b.ok + b.err));
	return (
		<div className="bg-white rounded-xl border border-slate-200 p-5">
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-semibold text-slate-900">Calls (last 24h)</h3>
				<div className="flex items-center gap-3 text-xs text-slate-500">
					<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500" /> ok</span>
					<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /> error</span>
				</div>
			</div>
			<div className="flex items-end gap-1 h-24">
				{buckets.map((b, i) => {
					const total = b.ok + b.err;
					const h = Math.round((total / max) * 100);
					return (
						<div key={i} className="flex-1 flex flex-col justify-end" title={`${total} calls`}>
							{b.err > 0 && (
								<div className="bg-red-400 rounded-t-sm" style={{ height: `${(b.err / max) * 96}px` }} />
							)}
							<div
								className="bg-cyan-500 rounded-t-sm"
								style={{ height: `${(b.ok / max) * 96}px`, minHeight: total ? 2 : 0 }}
							/>
						</div>
					);
				})}
			</div>
			<div className="flex justify-between text-[10px] text-slate-400 mt-1">
				<span>24h ago</span>
				<span>now</span>
			</div>
		</div>
	);
}

interface CallRow {
	method: string;
	resource: string | null;
	status_code: number | null;
	duration_ms: number | null;
	error_message?: string | null;
	client_ip?: string | null;
	created_at: string;
	server_name?: string;
	request_body?: any;
	response_body?: string | null;
}

export function CallsTable({ rows, showServer = false }: { rows: CallRow[]; showServer?: boolean }) {
	const [open, setOpen] = useState<number | null>(null);
	if (!rows.length) {
		return <p className="text-sm text-slate-400">No requests yet.</p>;
	}
	const inspectable = (r: CallRow) =>
		r.request_body != null || r.response_body != null || r.error_message != null;
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
						<th className="py-2 pr-3 font-medium">Status</th>
						{showServer && <th className="py-2 pr-3 font-medium">Server</th>}
						<th className="py-2 pr-3 font-medium">Method</th>
						<th className="py-2 pr-3 font-medium">Tool</th>
						<th className="py-2 pr-3 font-medium">Latency</th>
						<th className="py-2 pr-3 font-medium">When</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((r, i) => {
						const err = (r.status_code || 0) >= 400;
						const canInspect = inspectable(r);
						return (
							<Fragment key={i}>
								<tr
									className={`border-b border-slate-50 ${canInspect ? 'cursor-pointer hover:bg-slate-50' : ''}`}
									onClick={() => canInspect && setOpen(open === i ? null : i)}
								>
									<td className="py-2 pr-3">
										<span
											className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
												err ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
											}`}
										>
											{r.status_code ?? '—'}
										</span>
									</td>
									{showServer && <td className="py-2 pr-3 text-slate-700">{r.server_name}</td>}
									<td className="py-2 pr-3 font-mono text-xs text-slate-600">{r.method}</td>
									<td className="py-2 pr-3 font-mono text-xs text-slate-800">{r.resource || '—'}</td>
									<td className="py-2 pr-3 text-slate-500">{r.duration_ms != null ? `${r.duration_ms}ms` : '—'}</td>
									<td className="py-2 pr-3 text-slate-400 whitespace-nowrap">{timeAgo(r.created_at)}</td>
								</tr>
								{open === i && canInspect && (
									<tr>
										<td colSpan={showServer ? 6 : 5} className="bg-slate-50 px-3 py-3">
											{r.error_message && (
												<div className="mb-2 text-xs text-red-600">⚠ {r.error_message}</div>
											)}
											{r.request_body != null && (
												<div className="mb-2">
													<div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Request</div>
													<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto max-h-48">
														{JSON.stringify(r.request_body, null, 2)}
													</pre>
												</div>
											)}
											{r.response_body != null && (
												<div>
													<div className="text-[10px] uppercase tracking-wide text-slate-400 mb-1">Response</div>
													<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-3 overflow-x-auto max-h-64">
														{r.response_body}
													</pre>
												</div>
											)}
										</td>
									</tr>
								)}
							</Fragment>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}

export function timeAgo(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const s = Math.floor(diff / 1000);
	if (s < 60) return `${s}s ago`;
	const m = Math.floor(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}
