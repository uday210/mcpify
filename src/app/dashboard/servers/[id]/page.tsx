'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Play, RotateCw, Trash2, Power } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import ServerConnect from '@/components/ServerConnect';

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

	const load = () => {
		fetch(`/api/servers/${id}`)
			.then((r) => r.json())
			.then((d) => {
				setServer(d);
				if (d.tools?.[0]) setToolName(d.tools[0].name);
			})
			.finally(() => setLoading(false));
	};
	useEffect(load, [id]);

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
			<div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 mb-6">
				<Field label="MCP URL" value={server.base_url} />

				<div>
					<div className="flex items-center justify-between mb-1">
						<label className={labelCls}>Access</label>
						<button
							onClick={() => patch({ auth_required: !server.auth_required })}
							className="text-xs text-cyan-600 hover:text-cyan-700"
						>
							{server.auth_required ? 'Make public (no auth)' : 'Require API key'}
						</button>
					</div>
					<div
						className={`px-3 py-2 rounded-lg text-sm border ${
							server.auth_required
								? 'bg-slate-50 border-slate-200 text-slate-700'
								: 'bg-amber-50 border-amber-200 text-amber-800'
						}`}
					>
						{server.auth_required
							? 'API key required to call this server.'
							: 'Public — anyone with the URL can call this server.'}
					</div>
				</div>

				{server.auth_required && (
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
			</div>

			{/* Connect to a client */}
			<ServerConnect
				slug={server.slug}
				url={server.base_url}
				apiKey={server.api_key}
				transport={server.transport_type}
				authRequired={server.auth_required}
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

			{/* Logs */}
			<div className="bg-white rounded-xl border border-slate-200 p-6">
				<h2 className="font-semibold text-slate-900 mb-4">Recent activity</h2>
				{(server.logs || []).length === 0 ? (
					<p className="text-sm text-slate-400">No requests yet.</p>
				) : (
					<div className="space-y-1 text-xs font-mono">
						{server.logs.map((l: any, i: number) => (
							<div key={i} className="flex items-center gap-3 text-slate-600">
								<span className={l.status_code >= 400 ? 'text-red-600' : 'text-green-600'}>
									{l.status_code || '—'}
								</span>
								<span className="text-slate-800">{l.method}</span>
								<span className="text-slate-400">{l.resource || ''}</span>
								<span className="text-slate-400 ml-auto">{l.duration_ms}ms</span>
							</div>
						))}
					</div>
				)}
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
