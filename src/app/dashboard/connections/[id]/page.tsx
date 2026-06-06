'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, Trash2, CheckCircle2, XCircle, Plus, Server, Boxes, AlertTriangle } from 'lucide-react';
import AppIcon from '@/components/AppIcon';
import { toast } from '@/components/Toaster';
import { Skeleton } from '@/components/Skeleton';

export default function ConnectionDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;
	const [conn, setConn] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [verifying, setVerifying] = useState(false);

	const load = () =>
		fetch(`/api/connections/${id}`)
			.then((r) => r.json())
			.then((d) => setConn(d))
			.finally(() => setLoading(false));
	useEffect(() => {
		load();
	}, [id]);

	const verify = async () => {
		setVerifying(true);
		try {
			const r = await fetch(`/api/connections/${id}/verify`, { method: 'POST' });
			const d = await r.json();
			toast(d.message || (d.ok ? 'Reachable' : 'Failed'), d.ok ? 'success' : 'error');
			load();
		} finally {
			setVerifying(false);
		}
	};

	const remove = async () => {
		if (!confirm('Delete this connection? Servers using it will stop working.')) return;
		await fetch(`/api/connections/${id}`, { method: 'DELETE' });
		toast('Connection deleted', 'success');
		router.push('/dashboard/connections');
	};

	if (loading) {
		return (
			<div className="max-w-3xl space-y-4">
				<Skeleton className="h-8 w-1/3" />
				<Skeleton className="h-32 w-full rounded-2xl" />
			</div>
		);
	}
	if (!conn || conn.error) return <div className="text-slate-500">Connection not found.</div>;

	const servers = conn.servers || [];
	const tools = conn.tools || [];

	return (
		<div className="max-w-3xl">
			<button
				onClick={() => router.push('/dashboard/connections')}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
			>
				<ArrowLeft className="w-4 h-4" /> Back to connections
			</button>

			<div className="flex items-start justify-between mb-6">
				<div className="flex items-center gap-4">
					<AppIcon src={conn.logo_url} name={conn.name} size={52} rounded="rounded-2xl" />
					<div>
						<h1 className="text-3xl font-bold text-slate-900">{conn.name}</h1>
						<div className="flex items-center gap-2 mt-1">
							<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">{conn.connector_type}</span>
							<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">{conn.auth_type}</span>
							{conn.last_verified_at ? (
								conn.error_message ? (
									conn.error_message.startsWith('⚠') ? (
										<span className="flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="w-3.5 h-3.5" />{conn.error_message.replace(/^⚠\s*/, '')}</span>
									) : (
										<span className="flex items-center gap-1 text-xs text-red-600"><XCircle className="w-3.5 h-3.5" />{conn.error_message}</span>
									)
								) : (
									<span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3.5 h-3.5" />Verified</span>
								)
							) : (
								<span className="text-xs text-slate-400">Not verified</span>
							)}
						</div>
						<p className="text-xs text-slate-400 mt-1 font-mono">{conn.base_url}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={verify}
						disabled={verifying}
						className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} /> Verify
					</button>
					<button onClick={remove} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Servers using this connection */}
			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-semibold text-slate-900">MCP servers using this connection</h2>
					<Link
						href={`/dashboard/servers/new?connection=${id}`}
						className="flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700"
					>
						<Plus className="w-4 h-4" /> New server
					</Link>
				</div>
				{servers.length === 0 ? (
					<p className="text-sm text-slate-400">
						No servers yet.{' '}
						<Link href={`/dashboard/servers/new?connection=${id}`} className="text-cyan-600 hover:text-cyan-700">
							Create one →
						</Link>
					</p>
				) : (
					<div className="space-y-2">
						{servers.map((s: any) => (
							<Link
								key={s.id}
								href={`/dashboard/servers/${s.id}`}
								className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-cyan-300 hover:bg-slate-50 transition"
							>
								<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/15 to-blue-600/15 flex items-center justify-center">
									{s.mode === 'aggregate' ? <Boxes className="w-4 h-4 text-cyan-600" /> : <Server className="w-4 h-4 text-cyan-600" />}
								</div>
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-slate-800 truncate">{s.name}</div>
									<div className="text-xs text-slate-400 font-mono truncate">/{s.slug}</div>
								</div>
								{s.mode === 'aggregate' && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">aggregate</span>}
								<span
									className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
										s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
									}`}
								>
									{s.is_active ? 'Active' : 'Off'}
								</span>
							</Link>
						))}
					</div>
				)}
			</div>

			{/* Tools */}
			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6">
				<h2 className="font-semibold text-slate-900 mb-3">Tools ({tools.length})</h2>
				<div className="flex flex-wrap gap-1.5">
					{tools.map((t: any) => (
						<span key={t.name} title={t.description} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono">
							{t.name}
						</span>
					))}
					{tools.length === 0 && <p className="text-sm text-slate-400">No tools.</p>}
				</div>
			</div>
		</div>
	);
}
