'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
	RefreshCw,
	Activity as ActivityIcon,
	AlertTriangle,
	CheckCircle2,
	Gauge,
	Timer,
	Server,
	Search,
	Radio,
} from 'lucide-react';
import { Stat, CallsBarChart, CallsTable, timeAgo } from '@/components/monitor';

type StatusFilter = 'all' | 'success' | 'errors';

export default function ActivityPage() {
	const [data, setData] = useState<any>(null);
	const [auto, setAuto] = useState(true);
	const [loading, setLoading] = useState(true);
	const [updatedAt, setUpdatedAt] = useState<number | null>(null);
	const [tick, setTick] = useState(0);

	// filters
	const [server, setServer] = useState('all');
	const [status, setStatus] = useState<StatusFilter>('all');
	const [q, setQ] = useState('');

	const load = () =>
		fetch('/api/activity')
			.then((r) => r.json())
			.then((d) => {
				setData(d);
				setUpdatedAt(Date.now());
			})
			.catch(() => {})
			.finally(() => setLoading(false));

	useEffect(() => {
		load();
	}, []);

	useEffect(() => {
		if (!auto) return;
		const t = setInterval(load, 5000);
		return () => clearInterval(t);
	}, [auto]);

	// re-render "updated Xs ago" label every second
	useEffect(() => {
		const t = setInterval(() => setTick((n) => n + 1), 1000);
		return () => clearInterval(t);
	}, []);

	const stats = data?.stats || { total: 0, errors: 0, errorRate: 0, successRate: 100, avgLatency: 0, p95Latency: 0, servers: 0 };
	const allRows = data?.rows || [];
	const byServer = data?.byServer || [];
	const topTools = data?.topTools || [];

	const rows = useMemo(() => {
		return allRows.filter((r: any) => {
			if (server !== 'all' && (r.server_slug || r.server_name) !== server) return false;
			const isErr = (r.status_code || 0) >= 400;
			if (status === 'errors' && !isErr) return false;
			if (status === 'success' && isErr) return false;
			if (q) {
				const hay = `${r.resource || ''} ${r.method || ''} ${r.server_name || ''}`.toLowerCase();
				if (!hay.includes(q.toLowerCase())) return false;
			}
			return true;
		});
	}, [allRows, server, status, q]);

	const filtered = server !== 'all' || status !== 'all' || q !== '';
	const hasData = allRows.length > 0;

	return (
		<div>
			{/* header */}
			<div className="flex flex-wrap justify-between items-start gap-4 mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Activity</h1>
					<p className="text-slate-500 mt-1">Live stream of incoming MCP calls across all your servers.</p>
				</div>
				<div className="flex items-center gap-2">
					{updatedAt && (
						<span className="text-xs text-slate-400 hidden sm:block" suppressHydrationWarning>
							updated {timeAgo(new Date(updatedAt).toISOString())}
						</span>
					)}
					<button
						onClick={load}
						className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
						title="Refresh now"
					>
						<RefreshCw className="w-4 h-4" />
					</button>
					<button
						onClick={() => setAuto((a) => !a)}
						className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition ${
							auto ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
						}`}
					>
						<span className="relative flex h-2.5 w-2.5">
							{auto && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />}
							<span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${auto ? 'bg-cyan-500' : 'bg-slate-400'}`} />
						</span>
						{auto ? 'Live' : 'Paused'}
					</button>
				</div>
			</div>

			{loading ? (
				<div className="text-center py-24">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
				</div>
			) : !hasData ? (
				<EmptyState />
			) : (
				<>
					{/* stat cards */}
					<div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
						<Stat label="Calls (recent)" value={stats.total} icon={ActivityIcon} />
						<Stat
							label="Success rate"
							value={`${stats.successRate}%`}
							tone={stats.successRate >= 95 ? 'good' : stats.successRate >= 80 ? 'default' : 'bad'}
							icon={CheckCircle2}
						/>
						<Stat label="Errors" value={stats.errors} tone={stats.errors ? 'bad' : 'good'} icon={AlertTriangle} />
						<Stat label="Avg latency" value={`${stats.avgLatency}ms`} icon={Gauge} />
						<Stat label="P95 latency" value={`${stats.p95Latency}ms`} icon={Timer} />
					</div>

					{/* chart */}
					<div className="mb-6">
						<CallsBarChart logs={allRows} />
					</div>

					{/* breakdowns */}
					{(byServer.length > 0 || topTools.length > 0) && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
							<Breakdown title="By server" icon={Server} items={byServer} onPick={(slug) => setServer(slug)} active={server} />
							<Breakdown title="Top tools" icon={ActivityIcon} items={topTools} />
						</div>
					)}

					{/* filter bar */}
					<div className="flex flex-wrap items-center gap-3 mb-3">
						<div className="relative flex-1 min-w-[200px]">
							<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
							<input
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="Filter by tool, method or server…"
								className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none"
							/>
						</div>
						<select
							value={server}
							onChange={(e) => setServer(e.target.value)}
							className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400"
						>
							<option value="all">All servers</option>
							{byServer.map((s: any) => (
								<option key={s.slug || s.name} value={s.slug || s.name}>
									{s.name} ({s.calls})
								</option>
							))}
						</select>
						<div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
							{(['all', 'success', 'errors'] as StatusFilter[]).map((s) => (
								<button
									key={s}
									onClick={() => setStatus(s)}
									className={`px-3 py-2 capitalize transition ${
										status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
									}`}
								>
									{s}
								</button>
							))}
						</div>
					</div>

					{/* table */}
					<div className="bg-white rounded-xl border border-slate-200 p-5">
						<div className="flex items-center justify-between mb-3">
							<h3 className="font-semibold text-slate-900">Recent calls</h3>
							<span className="text-xs text-slate-400">
								{filtered ? `${rows.length} of ${allRows.length}` : `${allRows.length}`} shown
							</span>
						</div>
						{rows.length === 0 ? (
							<p className="text-sm text-slate-400 py-6 text-center">No calls match these filters.</p>
						) : (
							<CallsTable rows={rows} showServer />
						)}
					</div>
				</>
			)}
		</div>
	);
}

function Breakdown({
	title,
	icon: Icon,
	items,
	onPick,
	active,
}: {
	title: string;
	icon: any;
	items: { name: string; slug?: string; calls: number; errors: number }[];
	onPick?: (slug: string) => void;
	active?: string;
}) {
	const max = Math.max(1, ...items.map((i) => i.calls));
	return (
		<div className="bg-white rounded-xl border border-slate-200 p-5">
			<div className="flex items-center gap-2 mb-4">
				<Icon className="w-4 h-4 text-slate-400" />
				<h3 className="font-semibold text-slate-900">{title}</h3>
			</div>
			{items.length === 0 ? (
				<p className="text-sm text-slate-400">Nothing yet.</p>
			) : (
				<div className="space-y-2.5">
					{items.map((it) => {
						const errRate = it.calls ? Math.round((it.errors / it.calls) * 100) : 0;
						const key = it.slug || it.name;
						const isActive = onPick && active === key;
						return (
							<button
								key={key}
								onClick={() => onPick && onPick(isActive ? 'all' : key)}
								disabled={!onPick}
								className={`w-full text-left group ${onPick ? 'cursor-pointer' : 'cursor-default'}`}
							>
								<div className="flex items-center justify-between text-sm mb-1">
									<span className={`truncate font-mono text-xs ${isActive ? 'text-cyan-700 font-semibold' : 'text-slate-700'}`}>
										{it.name}
									</span>
									<span className="text-slate-400 shrink-0 ml-2 tabular-nums">
										{it.calls}
										{it.errors > 0 && <span className="text-red-500 ml-1">· {errRate}% err</span>}
									</span>
								</div>
								<div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
									<div
										className={`h-full rounded-full ${it.errors > 0 ? 'bg-gradient-to-r from-cyan-500 to-red-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`}
										style={{ width: `${(it.calls / max) * 100}%` }}
									/>
								</div>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
			<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 text-cyan-600 flex items-center justify-center mx-auto mb-4">
				<Radio className="w-7 h-7" />
			</div>
			<h3 className="text-lg font-semibold text-slate-900">No activity yet</h3>
			<p className="text-slate-500 mt-1 max-w-md mx-auto">
				Once an MCP client calls one of your servers, every request shows up here in real time — with latency, status and full request/response inspection.
			</p>
			<div className="flex items-center justify-center gap-3 mt-6">
				<Link
					href="/dashboard/servers"
					className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold hover:shadow-lift transition"
				>
					View your servers
				</Link>
				<Link href="/dashboard/connections/new" className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition">
					Add a connection
				</Link>
			</div>
		</div>
	);
}
