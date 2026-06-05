'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plug, Plus, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';

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
	const [notice, setNotice] = useState<string | null>(null);
	const searchParams = useSearchParams();

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
			setNotice(`${d.ok ? '✓' : '✗'} ${d.message}`);
			load();
		} finally {
			setVerifying(null);
		}
	};

	const remove = async (id: string) => {
		if (!confirm('Delete this connection? Servers using it will stop working.')) return;
		await fetch(`/api/connections/${id}`, { method: 'DELETE' });
		load();
	};

	return (
		<div>
			<div className="flex justify-between items-center mb-8">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">Connections</h1>
					<p className="text-slate-500 mt-1">Authenticated links to your cloud apps.</p>
				</div>
				<Link
					href="/dashboard/connections/new"
					className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition font-medium"
				>
					<Plus className="w-5 h-5" />
					New Connection
				</Link>
			</div>

			{notice && (
				<div className="mb-6 p-3 bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg text-sm">
					{notice}
				</div>
			)}

			{loading ? (
				<div className="text-center py-16">
					<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
				</div>
			) : connections.length === 0 ? (
				<div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
					<Plug className="w-12 h-12 text-slate-300 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-slate-900 mb-1">No connections yet</h3>
					<p className="text-slate-500 mb-6">
						Connect a catalog app, an OpenAPI spec, or define endpoints manually.
					</p>
					<Link
						href="/dashboard/connections/new"
						className="inline-block px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
					>
						New Connection
					</Link>
				</div>
			) : (
				<div className="space-y-3">
					{connections.map((c) => (
						<div
							key={c.id}
							className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between hover:border-slate-300 transition"
						>
							<div className="flex items-center gap-4 min-w-0">
								{c.logo_url ? (
									// eslint-disable-next-line @next/next/no-img-element
									<img
										src={c.logo_url}
										alt=""
										className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-100 shrink-0"
										onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')}
									/>
								) : (
									<div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
										<Plug className="w-5 h-5 text-slate-400" />
									</div>
								)}
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="font-semibold text-slate-900">{c.name}</h3>
										<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">
											{c.connector_type}
										</span>
										<span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
											{c.auth_type}
										</span>
									</div>
									<p className="text-xs text-slate-400 mt-1 font-mono truncate">{c.base_url}</p>
									<div className="flex items-center gap-3 mt-2 text-xs">
										<span className="text-slate-500">{c.toolCount} tools</span>
										{c.last_verified_at ? (
											c.error_message ? (
												<span className="flex items-center gap-1 text-red-600">
													<XCircle className="w-3.5 h-3.5" />
													{c.error_message}
												</span>
											) : (
												<span className="flex items-center gap-1 text-green-600">
													<CheckCircle2 className="w-3.5 h-3.5" />
													Verified
												</span>
											)
										) : (
											<span className="text-slate-400">Not verified</span>
										)}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 shrink-0">
								<button
									onClick={() => verify(c.id)}
									disabled={verifying === c.id}
									className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
								>
									<RefreshCw className={`w-3.5 h-3.5 ${verifying === c.id ? 'animate-spin' : ''}`} />
									Verify
								</button>
								<button
									onClick={() => remove(c.id)}
									className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
								>
									<Trash2 className="w-4 h-4" />
								</button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
