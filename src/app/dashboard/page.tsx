'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Server, Activity as ActivityIcon, Boxes, Plug, Zap } from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import { Stat } from '@/components/monitor';
import { CardSkeletonGrid } from '@/components/Skeleton';

interface MCPServer {
	id: string;
	name: string;
	slug: string;
	transport_type: string;
	is_active: boolean;
	access_count: number;
	error_count: number;
	created_at: string;
	mode: string;
	logo_url: string | null;
}

export default function DashboardPage() {
	const [servers, setServers] = useState<MCPServer[]>([]);
	const [connCount, setConnCount] = useState<number | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
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
	}, []);

	const totalCalls = servers.reduce((n, s) => n + (s.access_count || 0), 0);
	const active = servers.filter((s) => s.is_active).length;

	return (
		<div>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">Overview</h1>
					<p className="text-slate-500 mt-1">Your MCP servers at a glance.</p>
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
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<Stat label="Servers" value={servers.length} icon={Server} />
				<Stat label="Active" value={active} icon={Zap} tone={active ? 'good' : 'default'} />
				<Stat label="Connections" value={connCount ?? '—'} icon={Plug} />
				<Stat label="Total calls" value={totalCalls} icon={ActivityIcon} />
			</div>

			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-slate-900">MCP Servers</h2>
				<Link href="/dashboard/connections" className="text-sm text-cyan-600 hover:text-cyan-700">
					Manage connections →
				</Link>
			</div>

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
						<Link
							href="/dashboard/connections/new"
							className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition"
						>
							New Connection
						</Link>
						<Link
							href="/dashboard/servers/new"
							className="px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition"
						>
							Create Server
						</Link>
					</div>
				</div>
			) : (
				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
					{servers.map((s) => (
						<Link
							key={s.id}
							href={`/dashboard/servers/${s.id}`}
							className="group bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 hover:shadow-lift hover:-translate-y-0.5 hover:border-cyan-300 transition-all"
						>
							<div className="flex items-start gap-3 mb-3">
								{s.mode === 'aggregate' ? (
									<div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
										<Boxes className="w-5 h-5 text-white" />
									</div>
								) : (
									<AppIcon src={s.logo_url} name={s.name} size={40} />
								)}
								<div className="min-w-0 flex-1">
									<h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition truncate">
										{s.name}
									</h3>
									<p className="text-xs font-mono text-slate-400 truncate">/{s.slug}</p>
								</div>
								<span
									className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
										s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
									}`}
								>
									<span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
									{s.is_active ? 'Active' : 'Off'}
								</span>
							</div>
							<div className="flex items-center gap-3 text-xs text-slate-500">
								<span className="uppercase tracking-wide">{s.transport_type}</span>
								{s.mode === 'aggregate' && (
									<span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">aggregate</span>
								)}
								<span className="flex items-center gap-1">
									<ActivityIcon className="w-3.5 h-3.5" />
									{s.access_count || 0}
								</span>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
