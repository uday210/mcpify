'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
	Plug,
	Plus,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Trash2,
	RefreshCw,
	Search,
	Server,
	ExternalLink,
} from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import { toast } from '@/components/Toaster';
import { Skeleton } from '@/components/Skeleton';
import { Stat, timeAgo } from '@/components/monitor';

interface Connection {
	id: string;
	name: string;
	auth_type: string;
	connector_type: string;
	base_url: string | null;
	is_active: boolean;
	last_verified_at: string | null;
	error_message: string | null;
	toolCount: number;
	logo_url: string | null;
	created_at?: string;
}

type Health = 'verified' | 'attention' | 'failed' | 'unverified';
type StatusFilter = 'all' | 'verified' | 'attention' | 'unverified';

function healthOf(c: Connection): Health {
	if (!c.last_verified_at) return 'unverified';
	if (!c.error_message) return 'verified';
	return c.error_message.startsWith('⚠') ? 'attention' : 'failed';
}

export default function ConnectionsPage() {
	return (
		<Suspense fallback={null}>
			<ConnectionsInner />
		</Suspense>
	);
}

function ConnectionsInner() {
	const [connections, setConnections] = useState<Connection[]>([]);
	const [loading, setLoading] = useState(true);
	const [verifying, setVerifying] = useState<string | null>(null);
	const [verifyingAll, setVerifyingAll] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const searchParams = useSearchParams();

	// toolbar
	const [q, setQ] = useState('');
	const [status, setStatus] = useState<StatusFilter>('all');
	const [type, setType] = useState('all');
	const [sort, setSort] = useState('recent');

	const load = () => {
		fetch('/api/connections')
			.then((r) => r.json())
			.then((d) => setConnections(Array.isArray(d) ? d : []))
			.catch(() => setConnections([]))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		load();
		if (searchParams.get('connected')) setNotice('OAuth connection authorized successfully.');
		const err = searchParams.get('error');
		if (err) setNotice(`OAuth error: ${err}`);
	}, [searchParams]);

	const verify = async (id: string) => {
		setVerifying(id);
		try {
			const r = await fetch(`/api/connections/${id}/verify`, { method: 'POST' });
			const d = await r.json();
			toast(d.message || (d.ok ? 'Verified' : 'Failed'), d.ok ? 'success' : d.warn ? 'info' : 'error');
			load();
		} finally {
			setVerifying(null);
		}
	};

	const verifyAll = async () => {
		setVerifyingAll(true);
		try {
			await Promise.all(connections.map((c) => fetch(`/api/connections/${c.id}/verify`, { method: 'POST' }).catch(() => {})));
			toast('Re-verified all connections', 'success');
			load();
		} finally {
			setVerifyingAll(false);
		}
	};

	const remove = async (id: string) => {
		if (!confirm('Delete this connection? Servers using it will stop working.')) return;
		await fetch(`/api/connections/${id}`, { method: 'DELETE' });
		toast('Connection deleted', 'success');
		load();
	};

	const counts = useMemo(() => {
		const c = { total: connections.length, verified: 0, attention: 0, unverified: 0, tools: 0 };
		for (const x of connections) {
			c.tools += x.toolCount || 0;
			const h = healthOf(x);
			if (h === 'verified') c.verified++;
			else if (h === 'unverified') c.unverified++;
			else c.attention++; // attention + failed
		}
		return c;
	}, [connections]);

	const types = useMemo(() => Array.from(new Set(connections.map((c) => c.connector_type))).sort(), [connections]);

	const filtered = useMemo(() => {
		let list = connections.filter((c) => {
			if (type !== 'all' && c.connector_type !== type) return false;
			const h = healthOf(c);
			if (status === 'verified' && h !== 'verified') return false;
			if (status === 'unverified' && h !== 'unverified') return false;
			if (status === 'attention' && !(h === 'attention' || h === 'failed')) return false;
			if (q) {
				const hay = `${c.name} ${c.auth_type} ${c.connector_type} ${c.base_url || ''}`.toLowerCase();
				if (!hay.includes(q.toLowerCase())) return false;
			}
			return true;
		});
		list = [...list].sort((a, b) => {
			if (sort === 'name') return a.name.localeCompare(b.name);
			if (sort === 'tools') return (b.toolCount || 0) - (a.toolCount || 0);
			// recent = last_verified desc, then name
			return (b.last_verified_at || '').localeCompare(a.last_verified_at || '');
		});
		return list;
	}, [connections, q, status, type, sort]);

	const isFiltered = q !== '' || status !== 'all' || type !== 'all';

	return (
		<div>
			<div className="flex flex-wrap justify-between items-start gap-4 mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Connections</h1>
					<p className="text-slate-500 mt-1">Authenticated links to your cloud apps.</p>
				</div>
				<div className="flex items-center gap-2">
					{connections.length > 0 && (
						<button
							onClick={verifyAll}
							disabled={verifyingAll}
							className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-sm font-medium disabled:opacity-50"
						>
							<RefreshCw className={`w-4 h-4 ${verifyingAll ? 'animate-spin' : ''}`} />
							Verify all
						</button>
					)}
					<Link
						href="/dashboard/connections/new"
						className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition font-medium"
					>
						<Plus className="w-5 h-5" />
						New Connection
					</Link>
				</div>
			</div>

			{notice && (
				<div className="mb-6 p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg text-sm">{notice}</div>
			)}

			{/* summary */}
			{!loading && connections.length > 0 && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
					<button onClick={() => setStatus('all')} className="text-left"><Stat label="Connections" value={counts.total} icon={Plug} /></button>
					<button onClick={() => setStatus('verified')} className="text-left"><Stat label="Verified" value={counts.verified} tone={counts.verified ? 'good' : 'default'} icon={CheckCircle2} /></button>
					<button onClick={() => setStatus('attention')} className="text-left"><Stat label="Needs attention" value={counts.attention} tone={counts.attention ? 'bad' : 'default'} icon={AlertTriangle} /></button>
					<Stat label="Tools" value={counts.tools} icon={Server} />
				</div>
			)}

			{/* toolbar */}
			{!loading && connections.length > 0 && (
				<div className="flex flex-wrap items-center gap-3 mb-4">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search connections…"
							className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none"
						/>
					</div>
					<div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
						{(['all', 'verified', 'attention', 'unverified'] as StatusFilter[]).map((s) => (
							<button
								key={s}
								onClick={() => setStatus(s)}
								className={`px-3 py-2 capitalize transition ${status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
							>
								{s === 'attention' ? 'Attention' : s}
							</button>
						))}
					</div>
					{types.length > 1 && (
						<select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400 capitalize">
							<option value="all">All types</option>
							{types.map((t) => <option key={t} value={t}>{t}</option>)}
						</select>
					)}
					<select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400">
						<option value="recent">Recently verified</option>
						<option value="name">Name (A–Z)</option>
						<option value="tools">Most tools</option>
					</select>
				</div>
			)}

			{loading ? (
				<div className="space-y-3">
					{[0, 1, 2].map((i) => (
						<div key={i} className="bg-white rounded-2xl border border-slate-200/70 p-5 flex items-center gap-4">
							<Skeleton className="w-10 h-10 rounded-lg" />
							<div className="flex-1">
								<Skeleton className="h-4 w-1/3 mb-2" />
								<Skeleton className="h-3 w-1/2" />
							</div>
						</div>
					))}
				</div>
			) : connections.length === 0 ? (
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-12 text-center">
					<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 flex items-center justify-center mx-auto mb-4">
						<Plug className="w-7 h-7 text-cyan-600" />
					</div>
					<h3 className="text-lg font-semibold text-slate-900 mb-1">No connections yet</h3>
					<p className="text-slate-500 mb-6">Connect a catalog app, an OpenAPI spec, or define endpoints manually.</p>
					<Link href="/dashboard/connections/new" className="inline-block px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition">
						New Connection
					</Link>
				</div>
			) : filtered.length === 0 ? (
				<p className="text-sm text-slate-400 py-10 text-center">No connections match these filters.</p>
			) : (
				<div className="space-y-3">
					{filtered.map((c) => {
						const h = healthOf(c);
						return (
							<div
								key={c.id}
								className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 flex items-center justify-between gap-4 hover:shadow-md hover:border-cyan-200 transition-all"
							>
								<Link href={`/dashboard/connections/${c.id}`} className="flex items-center gap-4 min-w-0 group flex-1">
									<AppIcon src={c.logo_url} name={c.name} size={40} />
									<div className="min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition">{c.name}</h3>
											<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">{c.connector_type}</span>
											<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{c.auth_type}</span>
										</div>
										<p className="text-xs text-slate-400 mt-1 font-mono truncate">{c.base_url || '—'}</p>
										<div className="flex items-center gap-3 mt-2 text-xs">
											<span className="text-slate-500">{c.toolCount} tools</span>
											<HealthBadge health={h} message={c.error_message} />
											{c.last_verified_at && <span className="text-slate-300">·</span>}
											{c.last_verified_at && <span className="text-slate-400">checked {timeAgo(c.last_verified_at)}</span>}
										</div>
									</div>
								</Link>
								<div className="flex items-center gap-1.5 shrink-0">
									<Link
										href={`/dashboard/servers/new?connection=${c.id}`}
										className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition"
										title="Create an MCP server from this connection"
									>
										<Server className="w-3.5 h-3.5" />
										Server
									</Link>
									<button
										onClick={() => verify(c.id)}
										disabled={verifying === c.id}
										className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
									>
										<RefreshCw className={`w-3.5 h-3.5 ${verifying === c.id ? 'animate-spin' : ''}`} />
										<span className="hidden sm:inline">Verify</span>
									</button>
									<Link href={`/dashboard/connections/${c.id}`} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition" title="Open">
										<ExternalLink className="w-4 h-4" />
									</Link>
									<button onClick={() => remove(c.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
										<Trash2 className="w-4 h-4" />
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

function HealthBadge({ health, message }: { health: Health; message: string | null }) {
	if (health === 'verified') return <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>;
	if (health === 'unverified') return <span className="text-slate-400">Not verified</span>;
	if (health === 'attention')
		return <span className="flex items-center gap-1 text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />{(message || '').replace(/^⚠\s*/, '') || 'Needs attention'}</span>;
	return <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" />{message || 'Failed'}</span>;
}
