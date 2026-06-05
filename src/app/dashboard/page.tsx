'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Server, Activity, Boxes } from 'lucide-react';
import AppIcon from '@/components/AppIcon';

interface MCPServer {
	id: string;
	name: string;
	slug: string;
	transport_type: string;
	is_active: boolean;
	access_count: number;
	created_at: string;
	mode: string;
	logo_url: string | null;
}

export default function DashboardPage() {
	const [servers, setServers] = useState<MCPServer[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetch('/api/servers')
			.then((r) => r.json())
			.then((d) => setServers(Array.isArray(d) ? d : []))
			.catch(() => setServers([]))
			.finally(() => setLoading(false));
	}, []);

	return (
		<div>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">MCP Servers</h1>
					<p className="text-slate-500 mt-1">Your cloud apps, exposed as MCP servers.</p>
				</div>
				<Link
					href="/dashboard/servers/new"
					className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium"
				>
					<Plus className="w-5 h-5" />
					Create Server
				</Link>
			</div>

			{loading ? (
				<div className="text-center py-16">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
				</div>
			) : servers.length === 0 ? (
				<div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
					<Server className="w-12 h-12 text-slate-300 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-slate-900 mb-1">No MCP servers yet</h3>
					<p className="text-slate-500 mb-6">
						Create a connection first, then expose it as an MCP server.
					</p>
					<div className="flex items-center justify-center gap-3">
						<Link
							href="/dashboard/connections/new"
							className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
						>
							New Connection
						</Link>
						<Link
							href="/dashboard/servers/new"
							className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
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
							className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-cyan-300 hover:shadow-md transition"
						>
							<div className="flex items-start gap-3 mb-3">
								{s.mode === 'aggregate' ? (
									<div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0">
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
									className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
										s.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
									}`}
								>
									{s.is_active ? 'Active' : 'Inactive'}
								</span>
							</div>
							<div className="flex items-center gap-3 text-xs text-slate-500">
								<span className="uppercase tracking-wide">{s.transport_type}</span>
								{s.mode === 'aggregate' && (
									<span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-700">aggregate</span>
								)}
								<span className="flex items-center gap-1">
									<Activity className="w-3.5 h-3.5" />
									{s.access_count || 0} calls
								</span>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	);
}
