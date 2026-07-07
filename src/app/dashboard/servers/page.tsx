'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
	Plus,
	Server,
	Activity as ActivityIcon,
	Boxes,
	Zap,
	AlertTriangle,
	Search,
	Copy,
	Check,
	Power,
	LayoutGrid,
	List as ListIcon,
} from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import { Stat } from '@/components/monitor';
import { CardSkeletonGrid } from '@/components/Skeleton';
import { toast } from '@/components/Toaster';

interface MCPServer {
	id: string;
	name: string;
	slug: string;
	transport_type: string;
	is_active: boolean;
	access_count: number;
	error_count: number;
	created_at: string;
	last_accessed_at: string | null;
	mode: string;
	logo_url: string | null;
	base_url: string;
	interfaces?: string[];
}

/** MCP / REST pills for a server. Falls back to both when unset (legacy rows). */
function InterfaceBadges({ s }: { s: MCPServer }) {
	const list = Array.isArray(s.interfaces) && s.interfaces.length ? s.interfaces : ['mcp', 'rest'];
	return (
		<>
			{list.includes('mcp') && <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700 font-medium">MCP</span>}
			{list.includes('rest') && <span className="px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 font-medium">REST</span>}
		</>
	);
}

type StatusFilter = 'all' | 'active' | 'paused';

export default function ServersPage() {
	const [servers, setServers] = useState<MCPServer[]>([]);
	const [connCount, setConnCount] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);
	const [copied, setCopied] = useState<string | null>(null);

	const [q, setQ] = useState('');
	const [status, setStatus] = useState<StatusFilter>('all');
	const [transport, setTransport] = useState('all');
	const [sort, setSort] = useState('recent');
	const [view, setView] = useState<'grid' | 'list'>('grid');

	const load = () =>
		Promise.all([
			fetch('/api/servers').then((r) => r.json()),
			fetch('/api/connections').then((r) => r.json()),
		])
			.then(([s, c]) => {
				setServers(Array.isArray(s) ? s : []);
				setConnCount(Array.isArray(c) ? c.length : 0);
			})
			.catch(() => setServers([]))
			.finally(() => setLoading(false));

	useEffect(() => {
		load();
	}, []);

	const totalCalls = servers.reduce((n, s) => n + (s.access_count || 0), 0);
	const totalErrors = servers.reduce((n, s) => n + (s.error_count || 0), 0);
	const active = servers.filter((s) => s.is_active).length;

	const toggle = async (s: MCPServer) => {
		setServers((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_active: !x.is_active } : x)));
		const r = await fetch(`/api/servers/${s.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ is_active: !s.is_active }),
		});
		if (!r.ok) {
			setServers((arr) => arr.map((x) => (x.id === s.id ? { ...x, is_active: s.is_active } : x)));
			toast('Could not update server', 'error');
		} else {
			toast(!s.is_active ? 'Server enabled' : 'Server paused', 'success');
		}
	};

	const copy = (s: MCPServer) => {
		navigator.clipboard.writeText(s.base_url);
		setCopied(s.id);
		toast('MCP URL copied', 'success');
		setTimeout(() => setCopied(null), 1500);
	};

	const transports = useMemo(() => Array.from(new Set(servers.map((s) => s.transport_type))).sort(), [servers]);

	const filtered = useMemo(() => {
		let list = servers.filter((s) => {
			if (status === 'active' && !s.is_active) return false;
			if (status === 'paused' && s.is_active) return false;
			if (transport !== 'all' && s.transport_type !== transport) return false;
			if (q && !`${s.name} ${s.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
			return true;
		});
		list = [...list].sort((a, b) => {
			if (sort === 'name') return a.name.localeCompare(b.name);
			if (sort === 'calls') return (b.access_count || 0) - (a.access_count || 0);
			return (b.created_at || '').localeCompare(a.created_at || '');
		});
		return list;
	}, [servers, q, status, transport, sort]);

	return (
		<div>
			<div className="flex flex-wrap justify-between items-start gap-4 mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Servers</h1>
					<p className="text-slate-500 mt-1">Your hosted MCP servers.</p>
				</div>
				<Link
					href="/dashboard/servers/new"
					className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition font-medium"
				>
					<Plus className="w-5 h-5" />
					Create Server
				</Link>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
				<Stat label="Servers" value={servers.length} icon={Server} />
				<Stat label="Active" value={active} icon={Zap} tone={active ? 'good' : 'default'} />
				<Stat label="Total calls" value={totalCalls} icon={ActivityIcon} />
				<Stat label="Errors" value={totalErrors} tone={totalErrors ? 'bad' : 'good'} icon={AlertTriangle} />
			</div>

			{/* Toolbar */}
			{!loading && servers.length > 0 && (
				<div className="flex flex-wrap items-center gap-3 mb-4">
					<div className="relative flex-1 min-w-[200px]">
						<Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search servers…"
							className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none"
						/>
					</div>
					<div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
						{(['all', 'active', 'paused'] as StatusFilter[]).map((s) => (
							<button key={s} onClick={() => setStatus(s)} className={`px-3 py-2 capitalize transition ${status === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
								{s}
							</button>
						))}
					</div>
					{transports.length > 1 && (
						<select value={transport} onChange={(e) => setTransport(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400">
							<option value="all">All transports</option>
							{transports.map((t) => <option key={t} value={t}>{t}</option>)}
						</select>
					)}
					<select value={sort} onChange={(e) => setSort(e.target.value)} className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white outline-none focus:border-cyan-400">
						<option value="recent">Newest</option>
						<option value="name">Name (A–Z)</option>
						<option value="calls">Most calls</option>
					</select>
					<div className="flex rounded-lg border border-slate-200 overflow-hidden">
						<button onClick={() => setView('grid')} className={`px-2.5 py-2 ${view === 'grid' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`} title="Grid"><LayoutGrid className="w-4 h-4" /></button>
						<button onClick={() => setView('list')} className={`px-2.5 py-2 ${view === 'list' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`} title="List"><ListIcon className="w-4 h-4" /></button>
					</div>
				</div>
			)}

			{loading ? (
				<CardSkeletonGrid />
			) : servers.length === 0 ? (
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-12 text-center">
					<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 flex items-center justify-center mx-auto mb-4">
						<Server className="w-7 h-7 text-cyan-600" />
					</div>
					<h3 className="text-lg font-semibold text-slate-900 mb-1">No MCP servers yet</h3>
					<p className="text-slate-500 mb-6">Create a connection, then expose it as an MCP server.</p>
					<div className="flex items-center justify-center gap-3">
						<Link href="/dashboard/connections/new" className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition">New Connection</Link>
						<Link href="/dashboard/servers/new" className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition">Create Server</Link>
					</div>
				</div>
			) : filtered.length === 0 ? (
				<p className="text-sm text-slate-400 py-10 text-center">No servers match these filters.</p>
			) : view === 'grid' ? (
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{filtered.map((s) => (
						<ServerCard key={s.id} s={s} copied={copied === s.id} onCopy={() => copy(s)} onToggle={() => toggle(s)} />
					))}
				</div>
			) : (
				<div className="space-y-2.5">
					{filtered.map((s) => (
						<ServerRow key={s.id} s={s} copied={copied === s.id} onCopy={() => copy(s)} onToggle={() => toggle(s)} />
					))}
				</div>
			)}
		</div>
	);
}

function Icon({ s, size = 40 }: { s: MCPServer; size?: number }) {
	if (s.mode === 'aggregate') {
		return (
			<div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
				<Boxes className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
			</div>
		);
	}
	return <AppIcon src={s.logo_url} name={s.name} size={size} />;
}

function StatusPill({ active }: { active: boolean }) {
	return (
		<span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
			<span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
			{active ? 'Active' : 'Paused'}
		</span>
	);
}

function Actions({ copied, onCopy, onToggle }: { copied: boolean; onCopy: () => void; onToggle: () => void }) {
	return (
		<div className="flex items-center gap-1.5">
			<button onClick={(e) => { e.preventDefault(); onCopy(); }} className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition" title="Copy MCP URL">
				{copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
			</button>
			<button onClick={(e) => { e.preventDefault(); onToggle(); }} className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition" title="Enable / pause">
				<Power className="w-4 h-4" />
			</button>
		</div>
	);
}

function ServerCard({ s, copied, onCopy, onToggle }: { s: MCPServer; copied: boolean; onCopy: () => void; onToggle: () => void }) {
	return (
		<div className="group bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 hover:shadow-lift hover:border-cyan-300 transition-all">
			<div className="flex items-start gap-3 mb-3">
				<Link href={`/dashboard/servers/${s.id}`} className="flex items-start gap-3 min-w-0 flex-1">
					<Icon s={s} />
					<div className="min-w-0 flex-1">
						<h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition truncate">{s.name}</h3>
						<p className="text-xs font-mono text-slate-400 truncate">/{s.slug}</p>
					</div>
				</Link>
				<StatusPill active={s.is_active} />
			</div>
			<div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
				<InterfaceBadges s={s} />
				{s.mode === 'aggregate' && <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">aggregate</span>}
				<span className="flex items-center gap-1"><ActivityIcon className="w-3.5 h-3.5" />{s.access_count || 0}</span>
				{s.error_count > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="w-3.5 h-3.5" />{s.error_count}</span>}
			</div>
			<div className="flex items-center justify-between border-t border-slate-100 pt-3">
				<Link href={`/dashboard/servers/${s.id}`} className="text-xs text-cyan-600 hover:text-cyan-700 font-medium">Open →</Link>
				<Actions copied={copied} onCopy={onCopy} onToggle={onToggle} />
			</div>
		</div>
	);
}

function ServerRow({ s, copied, onCopy, onToggle }: { s: MCPServer; copied: boolean; onCopy: () => void; onToggle: () => void }) {
	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-4 flex items-center justify-between gap-4 hover:shadow-md hover:border-cyan-200 transition-all">
			<Link href={`/dashboard/servers/${s.id}`} className="flex items-center gap-3 min-w-0 flex-1 group">
				<Icon s={s} size={36} />
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition truncate">{s.name}</h3>
						<StatusPill active={s.is_active} />
					</div>
					<div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
						<span className="font-mono">/{s.slug}</span>
						<InterfaceBadges s={s} />
						<span className="flex items-center gap-1"><ActivityIcon className="w-3 h-3" />{s.access_count || 0}</span>
						{s.error_count > 0 && <span className="text-red-500">{s.error_count} err</span>}
					</div>
				</div>
			</Link>
			<Actions copied={copied} onCopy={onCopy} onToggle={onToggle} />
		</div>
	);
}
