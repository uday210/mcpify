'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, RotateCw, Trash2, Power } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import ServerConnect from '@/components/ServerConnect';
import { Stat, CallsBarChart, CallsTable } from '@/components/monitor';

export default function ServerDetailPage() {
	const params = useParams();
	const router = useRouter();
	const id = params.id as string;

	const [server, setServer] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	// test console
	const [method, setMethod] = useState('tools/list');
	const [toolName, setToolName] = useState('');
	const [argsText, setArgsText] = useState('{}');
	const [testResult, setTestResult] = useState<string>('');
	const [running, setRunning] = useState(false);

	const [auto, setAuto] = useState(true);

	const load = () => {
		fetch(`/api/servers/${id}`)
			.then((r) => r.json())
			.then((d) => {
				setServer(d);
				setToolName((cur) => cur || d.tools?.[0]?.name || '');
			})
			.finally(() => setLoading(false));
	};
	useEffect(load, [id]);

	// Live-refresh the monitoring data.
	useEffect(() => {
		if (!auto) return;
		const t = setInterval(load, 5000);
		return () => clearInterval(t);
	}, [auto, id]);

	const runTest = async () => {
		setRunning(true);
		setTestResult('');
		try {
			const body: any = { method };
			if (method === 'tools/call') {
				body.name = toolName;
				try {
					body.arguments = JSON.parse(argsText || '{}');
				} catch {
					setTestResult('Arguments must be valid JSON.');
					setRunning(false);
					return;
				}
			}
			const r = await fetch(`/api/servers/${id}/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const d = await r.json();
			setTestResult(JSON.stringify(d, null, 2));
		} catch (e: any) {
			setTestResult(e?.message || 'Request failed');
		} finally {
			setRunning(false);
		}
	};

	const patch = async (payload: any) => {
		const r = await fetch(`/api/servers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const d = await r.json();
		if (payload.regenerateKey && d.apiKey) {
			setServer((s: any) => ({ ...s, api_key: d.apiKey }));
			alert('New API key generated. Copy it from the page.');
		} else {
			load();
		}
	};

	const remove = async () => {
		if (!confirm('Delete this server permanently?')) return;
		await fetch(`/api/servers/${id}`, { method: 'DELETE' });
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
	const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500';

	return (
		<div className="max-w-3xl">
			<button
				onClick={() => router.push('/dashboard')}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
			>
				<ArrowLeft className="w-4 h-4" /> Back to servers
			</button>

			<div className="flex items-start justify-between mb-6">
				<div>
					<h1 className="text-3xl font-bold text-slate-900">{server.name}</h1>
					<p className="text-slate-500 mt-1">
						<span className="uppercase">{server.transport_type}</span> ·{' '}
						{server.access_count || 0} calls · {server.error_count || 0} errors
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={() => patch({ is_active: !server.is_active })}
						className="flex items-center gap-1.5 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50"
					>
						<Power className="w-4 h-4" />
						{server.is_active ? 'Disable' : 'Enable'}
					</button>
					<button onClick={remove} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
						<Trash2 className="w-4 h-4" />
					</button>
				</div>
			</div>

			{/* Connection details */}
			{(() => {
				const authMode: string = server.auth_mode || (server.auth_required === false ? 'none' : 'api_key');
				return (
					<div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 mb-6">
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
			<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
				<h2 className="font-semibold text-slate-900 mb-4">Test console</h2>
				<div className="flex gap-2 mb-3">
					<select className={input} value={method} onChange={(e) => setMethod(e.target.value)}>
						<option value="tools/list">tools/list</option>
						<option value="tools/call">tools/call</option>
					</select>
					{method === 'tools/call' && (
						<select className={input} value={toolName} onChange={(e) => setToolName(e.target.value)}>
							{(server.tools || []).map((t: any) => (
								<option key={t.name} value={t.name}>
									{t.name}
								</option>
							))}
						</select>
					)}
					<button
						onClick={runTest}
						disabled={running}
						className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 whitespace-nowrap"
					>
						<Play className="w-4 h-4" />
						{running ? 'Running…' : 'Run'}
					</button>
				</div>
				{method === 'tools/call' && (
					<textarea
						className={`${input} font-mono text-xs h-24 mb-3`}
						value={argsText}
						onChange={(e) => setArgsText(e.target.value)}
						placeholder='{ "owner": "vercel", "repo": "next.js" }'
					/>
				)}
				{testResult && (
					<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto max-h-80">
						{testResult}
					</pre>
				)}
			</div>

			{/* Tools */}
			<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
				<h2 className="font-semibold text-slate-900 mb-4">Tools ({server.tools?.length || 0})</h2>
				<div className="divide-y">
					{(server.tools || []).map((t: any) => (
						<div key={t.name} className="py-2 flex items-center gap-3">
							<span className="text-xs font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600 w-16 text-center">
								{t.http_method}
							</span>
							<div>
								<div className="text-sm font-mono text-slate-800">{t.name}</div>
								<div className="text-xs text-slate-500">{t.description || t.path_template}</div>
							</div>
						</div>
					))}
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
						<Stat label="Total calls" value={server.access_count || 0} />
						<Stat label="Errors (all time)" value={server.error_count || 0} tone={server.error_count ? 'bad' : 'good'} />
						<Stat label="Avg latency (recent)" value={`${avg}ms`} />
						<Stat label="Errors (recent)" value={recentErr} tone={recentErr ? 'bad' : 'good'} />
					</div>
				);
			})()}

			<div className="mb-6">
				<CallsBarChart logs={server.logs || []} />
			</div>

			<div className="bg-white rounded-xl border border-slate-200 p-5">
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
