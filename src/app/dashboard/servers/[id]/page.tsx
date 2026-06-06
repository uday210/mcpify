'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, RotateCw, Trash2, Power, Activity as ActivityIcon, AlertTriangle, Gauge, Boxes } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import AppIcon from '@/components/AppIcon';
import { faviconFor } from '@/lib/favicon';
import ServerConnect from '@/components/ServerConnect';
import ToolTester from '@/components/ToolTester';
import { toast } from '@/components/Toaster';
import { Stat, CallsBarChart, CallsTable } from '@/components/monitor';

export default function ServerDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const [server, setServer] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	const [auto, setAuto] = useState(true);
	const [tools, setTools] = useState<any[]>([]);
	const [toolsDirty, setToolsDirty] = useState(false);
	const [savingTools, setSavingTools] = useState(false);

	const load = () => {
		fetch(`/api/servers/${id}`)
			.then((r) => r.json())
			.then((d) => setServer(d))
			.finally(() => setLoading(false));
	};
	useEffect(load, [id]);

	const loadTools = () =>
		fetch(`/api/servers/${id}/tools`)
			.then((r) => r.json())
			.then((d) => setTools(Array.isArray(d) ? d : []))
			.catch(() => {});
	useEffect(() => {
		loadTools();
	}, [id]);

	const patchTool = (tid: string, p: any) => {
		setTools((ts) => ts.map((t) => (t.id === tid ? { ...t, ...p } : t)));
		setToolsDirty(true);
	};
	const saveTools = async () => {
		setSavingTools(true);
		try {
			await fetch(`/api/servers/${id}/tools`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tools: tools.map((t) => ({ id: t.id, enabled: t.enabled, name: t.name })) }),
			});
			setToolsDirty(false);
			loadTools();
			load();
			toast('Tools updated', 'success');
		} finally {
			setSavingTools(false);
		}
	};

	// Live-refresh the monitoring data.
	useEffect(() => {
		if (!auto) return;
		const t = setInterval(load, 5000);
		return () => clearInterval(t);
	}, [auto, id]);

	const patch = async (payload: any) => {
		const r = await fetch(`/api/servers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const d = await r.json();
		if (payload.regenerateKey && d.apiKey) {
			setServer((s: any) => ({ ...s, api_key: d.apiKey }));
			toast('New API key generated', 'success');
		} else {
			if (payload.regenerateSecret) toast('New client secret generated', 'success');
			else if (payload.authMode) toast('Access mode updated', 'success');
			else if (typeof payload.is_active === 'boolean') toast(payload.is_active ? 'Server enabled' : 'Server disabled', 'success');
			load();
		}
	};

	const remove = async () => {
		if (!confirm('Delete this server permanently?')) return;
		await fetch(`/api/servers/${id}`, { method: 'DELETE' });
		toast('Server deleted', 'success');
		router.push('/dashboard');
	};

	if (loading) {
		return (
			<div className="text-center py-16">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-600" />
			</div>
		);
	}
	if (!server || server.error) {
		return <div className="text-slate-500">Server not found.</div>;
	}

	const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

	return (
		<div className="max-w-3xl">
			<button
				onClick={() => router.push('/dashboard')}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
			>
				<ArrowLeft className="w-4 h-4" /> Back to servers
			</button>

			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5 mb-6 flex items-center gap-4">
				{server.mode === 'aggregate' ? (
					<div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lift">
						<Boxes className="w-7 h-7 text-white" />
					</div>
				) : (
					<AppIcon src={faviconFor(server.app_connections?.base_url)} name={server.name} size={56} rounded="rounded-2xl" />
				)}
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{server.name}</h1>
						<span
							className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
								server.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
							}`}
						>
							<span className={`w-1.5 h-1.5 rounded-full ${server.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
							{server.is_active ? 'Active' : 'Off'}
						</span>
					</div>
					<div className="flex items-center gap-2 mt-1.5 text-xs">
						<span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase tracking-wide">{server.transport_type}</span>
						{server.mode === 'aggregate' && <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700">aggregate</span>}
						<span className="text-slate-500">{server.access_count || 0} calls</span>
						<span className="text-slate-400">·</span>
						<span className="text-slate-500">{server.error_count || 0} errors</span>
					</div>
				</div>
				<div className="flex items-center gap-2 shrink-0">
					<button
						onClick={() => patch({ is_active: !server.is_active })}
						className="flex items-center gap-1.5 px-3.5 py-2 text-sm border border-slate-300 rounded-xl hover:bg-slate-50 transition"
					>
						<Power className="w-4 h-4" />
						<span className="hidden sm:inline">{server.is_active ? 'Disable' : 'Enable'}</span>
					</button>
					<button onClick={remove} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition">
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Connection details */}
			{(() => {
				const authMode: string = server.auth_mode || (server.auth_required === false ? 'none' : 'api_key');
				return (
					<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 space-y-4 mb-6">
						<Field label="MCP URL" value={server.base_url} />

						<div>
							<label className={labelCls}>Access</label>
							<div className="grid grid-cols-3 gap-2">
								{[
									{ v: 'api_key', label: 'API Key' },
									{ v: 'oauth', label: 'OAuth' },
									{ v: 'none', label: 'No auth' },
								].map((m) => (
									<button
										key={m.v}
										onClick={() => patch({ authMode: m.v })}
										className={`px-3 py-2 rounded-lg text-sm border transition ${
											authMode === m.v
												? 'border-cyan-500 bg-cyan-50 text-cyan-700'
												: 'border-slate-200 text-slate-600 hover:bg-slate-50'
										}`}
									>
										{m.label}
									</button>
								))}
							</div>
						</div>

						{authMode === 'api_key' && (
							<div>
								<div className="flex items-center justify-between mb-1">
									<label className={labelCls}>API Key</label>
									<div className="flex items-center gap-2">
										<CopyButton value={server.api_key} />
										<button
											onClick={() => patch({ regenerateKey: true })}
											className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
										>
											<RotateCw className="w-3.5 h-3.5" /> Regenerate
										</button>
									</div>
								</div>
								<div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono break-all">
									{server.api_key}
								</div>
							</div>
						)}

						{authMode === 'oauth' && (
							<>
								<Field label="Token endpoint" value={`${server.base_url}/token`} />
								<Field label="Client ID" value={server.oauth_client_id || ''} />
								<div>
									<div className="flex items-center justify-between mb-1">
										<label className={labelCls}>Client Secret</label>
										<div className="flex items-center gap-2">
											<CopyButton value={server.oauth_client_secret || ''} />
											<button
												onClick={() => patch({ regenerateSecret: true })}
												className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
											>
												<RotateCw className="w-3.5 h-3.5" /> Regenerate
											</button>
										</div>
									</div>
									<div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono break-all">
										{server.oauth_client_secret}
									</div>
								</div>
							</>
						)}

						{authMode === 'none' && (
							<div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
								Public — anyone with the URL can call this server.
							</div>
						)}
					</div>
				);
			})()}

			{/* Connect to a client */}
			<ServerConnect
				slug={server.slug}
				url={server.base_url}
				transport={server.transport_type}
				authMode={server.auth_mode || (server.auth_required === false ? 'none' : 'api_key')}
				apiKey={server.api_key}
				oauthClientId={server.oauth_client_id}
				oauthClientSecret={server.oauth_client_secret}
			/>

			{/* Test console */}
			<div className="mb-6">
				<ToolTester serverId={id} tools={tools} />
			</div>

			{/* Tools (curate) */}
			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="font-semibold text-slate-900">
						Tools ({tools.filter((t) => t.enabled).length}/{tools.length})
					</h2>
					{toolsDirty && (
						<button
							onClick={saveTools}
							disabled={savingTools}
							className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
						>
							{savingTools ? 'Saving…' : 'Save changes'}
						</button>
					)}
				</div>
				<p className="text-xs text-slate-400 mb-3">Toggle tools on/off or rename them. Disabled tools aren’t exposed to clients.</p>
				<div className="divide-y">
					{tools.map((t: any) => (
						<div key={t.id} className="py-2.5 flex items-center gap-3">
							<button
								onClick={() => patchTool(t.id, { enabled: !t.enabled })}
								className={`relative w-9 h-5 rounded-full transition shrink-0 ${t.enabled ? 'bg-cyan-500' : 'bg-slate-300'}`}
								title={t.enabled ? 'Enabled' : 'Disabled'}
							>
								<span
									className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition ${t.enabled ? 'translate-x-4' : ''}`}
								/>
							</button>
							<span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 w-16 text-center shrink-0">
								{t.http_method}
							</span>
							<input
								value={t.name}
								onChange={(e) => patchTool(t.id, { name: e.target.value })}
								className={`text-sm font-mono bg-transparent border-b border-transparent hover:border-slate-200 focus:border-cyan-400 focus:outline-none px-1 flex-1 min-w-0 ${
									t.enabled ? 'text-slate-800' : 'text-slate-400 line-through'
								}`}
							/>
							<span className="text-xs text-slate-400 truncate hidden sm:block max-w-[40%]">
								{t.description || t.path_template}
							</span>
						</div>
					))}
					{tools.length === 0 && <p className="text-sm text-slate-400 py-2">No tools.</p>}
				</div>
			</div>

			{/* Monitoring */}
			<div className="flex items-center justify-between mb-3">
				<h2 className="text-lg font-semibold text-slate-900">Monitoring</h2>
				<button
					onClick={() => setAuto((a) => !a)}
					className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition ${
						auto ? 'border-cyan-300 bg-cyan-50 text-cyan-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
					}`}
				>
					<RotateCw className={`w-3.5 h-3.5 ${auto ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
					{auto ? 'Live' : 'Paused'}
				</button>
			</div>

			{(() => {
				const logs = server.logs || [];
				const recentErr = logs.filter((l: any) => (l.status_code || 0) >= 400).length;
				const avg = logs.length
					? Math.round(logs.reduce((s: number, l: any) => s + (l.duration_ms || 0), 0) / logs.length)
					: 0;
				return (
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
						<Stat label="Total calls" value={server.access_count || 0} icon={ActivityIcon} />
						<Stat label="Errors (all time)" value={server.error_count || 0} tone={server.error_count ? 'bad' : 'good'} icon={AlertTriangle} />
						<Stat label="Avg latency" value={`${avg}ms`} icon={Gauge} />
						<Stat label="Errors (recent)" value={recentErr} tone={recentErr ? 'bad' : 'good'} icon={AlertTriangle} />
					</div>
				);
			})()}

			<div className="mb-6">
				<CallsBarChart logs={server.logs || []} />
			</div>

			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-5">
				<h3 className="font-semibold text-slate-900 mb-3">Recent calls</h3>
				<CallsTable rows={server.logs || []} />
			</div>
		</div>
	);
}

function Field({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="flex items-center justify-between mb-1">
				<label className="block text-sm font-medium text-slate-700">{label}</label>
				<CopyButton value={value} />
			</div>
			<div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm break-all">
				{value}
			</div>
		</div>
	);
}
