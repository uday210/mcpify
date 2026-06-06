'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
	Plus,
	Server,
	Activity as ActivityIcon,
	Plug,
	CheckCircle2,
	ArrowRight,
	Circle,
	Boxes,
} from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import { Stat, CallsBarChart, CallsTable } from '@/components/monitor';

interface MCPServer {
	id: string;
	name: string;
	slug: string;
	transport_type: string;
	is_active: boolean;
	access_count: number;
	mode: string;
	logo_url: string | null;
}

export default function DashboardHome() {
	const [servers, setServers] = useState<MCPServer[]>([]);
	const [connCount, setConnCount] = useState(0);
	const [activity, setActivity] = useState<any>(null);
	const [popular, setPopular] = useState<any[]>([]);
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			fetch('/api/servers').then((r) => r.json()),
			fetch('/api/connections').then((r) => r.json()),
			fetch('/api/activity').then((r) => r.json()),
			fetch('/api/catalog/search').then((r) => r.json()).catch(() => ({ curated: [] })),
		])
			.then(([s, c, a, cat]) => {
				setServers(Array.isArray(s) ? s : []);
				setConnCount(Array.isArray(c) ? c.length : 0);
				setActivity(a);
				const cur = (cat?.curated || []) as any[];
				// A few recognizable suggestions for the "connect next" strip.
				const picks = ['github', 'slack', 'stripe', 'notion', 'telegram', 'zoom', 'openai', 'hubspot'];
				const bySlug = new Map(cur.map((x) => [x.slug, x]));
				setPopular(picks.map((p) => bySlug.get(p)).filter(Boolean).slice(0, 6));
			})
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		import('@/lib/supabase/client').then(({ createClient }) => {
			createClient().auth.getUser().then(({ data }: any) => setEmail(data.user?.email || ''));
		});
	}, []);

	const stats = activity?.stats || { total: 0, successRate: 100, avgLatency: 0 };
	const rows = activity?.rows || [];
	const active = servers.filter((s) => s.is_active).length;
	const firstName = email ? email.split('@')[0].replace(/[._-]/g, ' ').split(' ')[0] : '';

	const greeting = useMemo(() => {
		const h = new Date().getHours();
		return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
	}, []);

	// Onboarding state.
	const steps = [
		{ done: connCount > 0, label: 'Add a connection', desc: 'Connect a catalog app, OpenAPI spec, or your own endpoints.', href: '/dashboard/connections/new', cta: 'Add connection' },
		{ done: servers.length > 0, label: 'Create an MCP server', desc: 'Expose your connection’s tools over SSE or Streamable HTTP.', href: '/dashboard/servers/new', cta: 'Create server' },
		{ done: stats.total > 0, label: 'Connect a client', desc: 'Point Claude (or any MCP client) at your server URL and make a call.', href: '/dashboard/servers', cta: 'View servers' },
	];
	const onboardingDone = steps.every((s) => s.done);
	const completed = steps.filter((s) => s.done).length;

	if (loading) {
		return (
			<div className="text-center py-24">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
			</div>
		);
	}

	return (
		<div>
			{/* Greeting */}
			<div className="flex flex-wrap justify-between items-start gap-4 mb-8">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900">
						{greeting}{firstName ? `, ${firstName}` : ''}
					</h1>
					<p className="text-slate-500 mt-1">
						{servers.length === 0
							? 'Let’s get your first MCP server online.'
							: `${active} live · ${servers.length - active} paused · ${stats.total} recent calls`}
					</p>
				</div>
				<div className="flex items-center gap-2">
					<Link
						href="/dashboard/connections/new"
						className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition font-medium text-sm"
					>
						New Connection
					</Link>
					<Link
						href="/dashboard/servers/new"
						className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-lift transition font-medium text-sm"
					>
						<Plus className="w-4 h-4" />
						Create Server
					</Link>
				</div>
			</div>

			{/* Onboarding checklist — show until all three steps are done. */}
			{!onboardingDone && (
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-8">
					<div className="flex items-center justify-between mb-4">
						<h2 className="font-semibold text-slate-900">Get started</h2>
						<span className="text-xs text-slate-400">{completed} of {steps.length} done</span>
					</div>
					<div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-5">
						<div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
					</div>
					<div className="space-y-2">
						{steps.map((s, i) => {
							const isNext = !s.done && steps.slice(0, i).every((p) => p.done);
							return (
								<div
									key={s.label}
									className={`flex items-center gap-4 p-3 rounded-xl border ${
										isNext ? 'border-cyan-200 bg-cyan-50/50' : 'border-transparent'
									}`}
								>
									{s.done ? (
										<CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
									) : (
										<Circle className="w-5 h-5 text-slate-300 shrink-0" />
									)}
									<div className="min-w-0 flex-1">
										<div className={`text-sm font-medium ${s.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{s.label}</div>
										{!s.done && <div className="text-xs text-slate-500">{s.desc}</div>}
									</div>
									{!s.done && (
										<Link
											href={s.href}
											className={`shrink-0 text-sm px-3 py-1.5 rounded-lg font-medium transition ${
												isNext ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'text-cyan-600 hover:bg-cyan-50'
											}`}
										>
											{s.cta}
										</Link>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* KPI row */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
				<Link href="/dashboard/servers"><Stat label="Servers" value={servers.length} icon={Server} /></Link>
				<Link href="/dashboard/connections"><Stat label="Connections" value={connCount} icon={Plug} /></Link>
				<Link href="/dashboard/activity"><Stat label="Calls (recent)" value={stats.total} icon={ActivityIcon} /></Link>
				<Link href="/dashboard/activity">
					<Stat label="Success rate" value={`${stats.successRate}%`} tone={stats.successRate >= 95 ? 'good' : 'default'} icon={CheckCircle2} />
				</Link>
			</div>

			{/* Activity sparkline (only meaningful with traffic) */}
			{stats.total > 0 && (
				<div className="mb-8">
					<CallsBarChart logs={rows} />
				</div>
			)}

			{/* Servers + recent calls */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-slate-900">Your servers</h3>
						<Link href="/dashboard/servers" className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
							All <ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
					{servers.length === 0 ? (
						<p className="text-sm text-slate-400 py-6 text-center">No servers yet.</p>
					) : (
						<div className="space-y-2">
							{servers.slice(0, 4).map((s) => (
								<Link
									key={s.id}
									href={`/dashboard/servers/${s.id}`}
									className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition"
								>
									{s.mode === 'aggregate' ? (
										<div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
											<Boxes className="w-4 h-4 text-white" />
										</div>
									) : (
										<AppIcon src={s.logo_url} name={s.name} size={36} />
									)}
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium text-slate-900 truncate">{s.name}</div>
										<div className="text-xs font-mono text-slate-400 truncate">/{s.slug}</div>
									</div>
									<span className={`w-2 h-2 rounded-full shrink-0 ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} title={s.is_active ? 'Active' : 'Off'} />
								</Link>
							))}
						</div>
					)}
				</div>

				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-slate-900">Recent calls</h3>
						<Link href="/dashboard/activity" className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
							Activity <ArrowRight className="w-3.5 h-3.5" />
						</Link>
					</div>
					{rows.length === 0 ? (
						<p className="text-sm text-slate-400 py-6 text-center">No calls yet.</p>
					) : (
						<CallsTable rows={rows.slice(0, 6)} showServer />
					)}
				</div>
			</div>

			{/* Connect next */}
			{popular.length > 0 && (
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold text-slate-900">Connect an app</h3>
						<Link href="/dashboard/connections/new" className="text-sm text-cyan-600 hover:text-cyan-700">Browse all →</Link>
					</div>
					<div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
						{popular.map((a) => (
							<Link
								key={a.slug}
								href={`/dashboard/connections/new?app=${a.slug}`}
								className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-cyan-300 hover:bg-slate-50 transition text-center"
							>
								<AppIcon src={a.logo_url} name={a.name} size={32} />
								<span className="text-xs text-slate-600 truncate w-full">{a.name}</span>
							</Link>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
