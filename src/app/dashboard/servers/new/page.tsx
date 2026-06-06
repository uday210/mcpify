'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Check, Server } from 'lucide-react';
import CopyButton from '@/components/CopyButton';
import AppIcon from '@/components/AppIcon';
import { getPrefs } from '@/lib/preferences';

interface Connection {
	id: string;
	name: string;
	connector_type: string;
	is_active: boolean;
	logo_url: string | null;
	toolCount: number;
}
interface Tool {
	name: string;
	description: string;
}

export default function NewServerPage() {
	const router = useRouter();
	const [connections, setConnections] = useState<Connection[]>([]);
	const [connectionId, setConnectionId] = useState('');
	const [tools, setTools] = useState<Tool[]>([]);
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [name, setName] = useState('');
	const [transport, setTransport] = useState('http_stream');

	// Apply the user's saved default transport on mount.
	useEffect(() => {
		setTransport(getPrefs().defaultTransport);
	}, []);
	const [authMode, setAuthMode] = useState<'api_key' | 'oauth' | 'none'>('api_key');
	const [mode, setMode] = useState<'single' | 'aggregate'>('single');
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [created, setCreated] = useState<any>(null);

	useEffect(() => {
		fetch('/api/connections')
			.then((r) => r.json())
			.then((d) => {
				const list = Array.isArray(d) ? d : [];
				setConnections(list);
				const want = new URLSearchParams(window.location.search).get('connection');
				if (want && list.find((c: Connection) => c.id === want)) setConnectionId(want);
			})
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!connectionId) return;
		fetch(`/api/connections/${connectionId}`)
			.then((r) => r.json())
			.then((d) => {
				const t: Tool[] = d.tools || [];
				setTools(t);
				setSelected(new Set(t.map((x) => x.name)));
				setName((n) => n || `${d.name} MCP`);
			})
			.catch(() => {});
	}, [connectionId]);

	const toggle = (n: string) =>
		setSelected((s) => {
			const next = new Set(s);
			next.has(n) ? next.delete(n) : next.add(n);
			return next;
		});

	const submit = async () => {
		setError(null);
		if (!name) return setError('Name your server.');
		if (mode === 'single') {
			if (!connectionId) return setError('Pick a connection.');
			if (selected.size === 0) return setError('Select at least one tool.');
		}
		setSubmitting(true);
		try {
			const r = await fetch('/api/servers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode,
					connectionId: mode === 'single' ? connectionId : undefined,
					name,
					transportType: transport,
					authMode,
					toolNames: mode === 'single' ? Array.from(selected) : undefined,
				}),
			});
			const d = await r.json();
			if (!r.ok) {
				setError(d.error || 'Failed to create server');
				setSubmitting(false);
				return;
			}
			setCreated(d);
		} catch (e: any) {
			setError(e?.message || 'Something went wrong');
			setSubmitting(false);
		}
	};

	const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500';
	const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

	if (created) {
		const mcpUrl = created.base_url;
		const tokenUrl = `${mcpUrl}/token`;
		return (
			<div className="max-w-2xl">
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6">
					<div className="flex items-center gap-2 text-green-600 mb-4">
						<CheckCircle2 className="w-6 h-6" />
						<h1 className="text-2xl font-bold text-slate-900">Server created</h1>
					</div>
					<p className="text-slate-500 mb-6">
						Copy your credentials now and finish setup on the next screen.
					</p>

					<div className="space-y-4">
						<Field label="MCP URL" value={mcpUrl} />
						{authMode === 'api_key' && <Field label="API Key" value={created.apiKey} mono />}
						{authMode === 'oauth' && (
							<>
								<Field label="Token endpoint" value={tokenUrl} />
								<Field label="Client ID" value={created.oauth_client_id} mono />
								<Field label="Client Secret" value={created.oauth_client_secret} mono />
								<div className="px-3 py-2 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-cyan-800">
									External systems POST these to the token endpoint (grant_type=client_credentials) to
									get a bearer token for the MCP URL.
								</div>
							</>
						)}
						{authMode === 'none' && (
							<div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
								This server is <strong>public</strong> — no auth required to call it.
							</div>
						)}
					</div>

					<div className="flex gap-3 mt-6">
						<Link
							href={`/dashboard/servers/${created.id}`}
							className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
						>
							Open server
						</Link>
						<Link
							href="/dashboard"
							className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
						>
							Done
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="max-w-2xl">
			<button
				onClick={() => router.push('/dashboard')}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
			>
				<ArrowLeft className="w-4 h-4" /> Back
			</button>
			<div className="flex items-center gap-3 mb-6">
				<div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lift">
					<Server className="w-5 h-5 text-white" />
				</div>
				<div>
					<h1 className="text-2xl font-bold tracking-tight text-slate-900">Create MCP Server</h1>
					<p className="text-slate-500 text-sm">Expose a connection&apos;s tools over MCP.</p>
				</div>
			</div>

			{error && (
				<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
			)}

			{connections.length === 0 ? (
				<div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
					<p className="text-slate-500 mb-4">You need a connection first.</p>
					<Link href="/dashboard/connections/new" className="px-5 py-2.5 bg-cyan-600 text-white rounded-lg">
						New Connection
					</Link>
				</div>
			) : (
				<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 space-y-5">
					<div>
						<label className={labelCls}>Type</label>
						<div className="grid grid-cols-2 gap-3">
							{[
								{ v: 'single' as const, label: 'Single connection', desc: 'One app’s tools' },
								{ v: 'aggregate' as const, label: 'All connections', desc: 'One server for everything' },
							].map((m) => (
								<button
									key={m.v}
									onClick={() => setMode(m.v)}
									className={`text-left p-3 rounded-lg border-2 transition ${
										mode === m.v ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
									}`}
								>
									<div className="font-medium text-slate-900">{m.label}</div>
									<div className="text-xs text-slate-500">{m.desc}</div>
								</button>
							))}
						</div>
					</div>

					{mode === 'aggregate' ? (
						<div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-sm text-cyan-800">
							This server will expose tools from <strong>all {connections.length} connection(s)</strong>,
							namespaced by connection (e.g. <code>openweather_current_weather</code>). New connections won’t be
							added automatically — recreate the server to refresh.
						</div>
					) : (
						<div>
							<label className={labelCls}>Connection</label>
							<div className="grid sm:grid-cols-2 gap-2.5">
								{connections.map((c) => (
									<button
										key={c.id}
										onClick={() => setConnectionId(c.id)}
										className={`flex items-center gap-3 text-left p-3 rounded-xl border transition ${
											connectionId === c.id
												? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200'
												: 'border-slate-200 hover:border-cyan-300 hover:shadow-sm'
										}`}
									>
										<AppIcon src={c.logo_url} name={c.name} size={36} />
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-slate-900 truncate">{c.name}</div>
											<div className="text-xs text-slate-400">
												{c.connector_type} · {c.toolCount} tools
											</div>
										</div>
										{connectionId === c.id && <Check className="w-4 h-4 text-cyan-600 shrink-0" />}
									</button>
								))}
							</div>
						</div>
					)}

					<div>
						<label className={labelCls}>Server name</label>
						<input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="My GitHub MCP" />
					</div>

					<div>
						<label className={labelCls}>Transport</label>
						<div className="grid grid-cols-2 gap-3">
							{[
								{ v: 'http_stream', label: 'Streamable HTTP', desc: 'Modern, single endpoint' },
								{ v: 'sse', label: 'SSE', desc: 'Legacy server-sent events' },
							].map((t) => (
								<button
									key={t.v}
									onClick={() => setTransport(t.v)}
									className={`text-left p-3 rounded-lg border-2 transition ${
										transport === t.v ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
									}`}
								>
									<div className="font-medium text-slate-900">{t.label}</div>
									<div className="text-xs text-slate-500">{t.desc}</div>
								</button>
							))}
						</div>
					</div>

					<div>
						<label className={labelCls}>Access</label>
						<div className="grid grid-cols-3 gap-3">
							{[
								{ v: 'api_key' as const, label: 'API Key', desc: 'A bearer key' },
								{ v: 'oauth' as const, label: 'OAuth', desc: 'Client ID + secret' },
								{ v: 'none' as const, label: 'No auth', desc: 'Public URL' },
							].map((a) => (
								<button
									key={a.v}
									onClick={() => setAuthMode(a.v)}
									className={`text-left p-3 rounded-lg border-2 transition ${
										authMode === a.v ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
									}`}
								>
									<div className="font-medium text-slate-900">{a.label}</div>
									<div className="text-xs text-slate-500">{a.desc}</div>
								</button>
							))}
						</div>
						{authMode === 'oauth' && (
							<p className="text-xs text-slate-500 mt-2">
								mcpify will issue a client ID + secret. External systems exchange them at the server&apos;s
								token endpoint for a bearer token (OAuth 2.0 client credentials).
							</p>
						)}
						{authMode === 'none' && (
							<p className="text-xs text-amber-600 mt-2">
								Anyone with the URL can call this server and use your stored credentials. Use with care.
							</p>
						)}
					</div>

					{tools.length > 0 && (
						<div>
							<div className="flex items-center justify-between mb-1">
								<label className={labelCls}>Tools ({selected.size}/{tools.length})</label>
								<button
									className="text-xs text-cyan-600"
									onClick={() =>
										setSelected((s) => (s.size === tools.length ? new Set() : new Set(tools.map((t) => t.name))))
									}
								>
									{selected.size === tools.length ? 'Deselect all' : 'Select all'}
								</button>
							</div>
							<div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y">
								{tools.map((t) => (
									<label key={t.name} className="flex items-start gap-3 p-3 hover:bg-slate-50 cursor-pointer">
										<input
											type="checkbox"
											checked={selected.has(t.name)}
											onChange={() => toggle(t.name)}
											className="mt-1"
										/>
										<div>
											<div className="text-sm font-medium text-slate-800 font-mono">{t.name}</div>
											<div className="text-xs text-slate-500">{t.description}</div>
										</div>
									</label>
								))}
							</div>
						</div>
					)}

					<button
						onClick={submit}
						disabled={submitting}
						className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lift transition disabled:opacity-50"
					>
						{submitting ? 'Creating…' : 'Create Server'}
					</button>
				</div>
			)}
		</div>
	);
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
	return (
		<div>
			<div className="flex items-center justify-between mb-1">
				<label className="block text-sm font-medium text-slate-700">{label}</label>
				<CopyButton value={value} />
			</div>
			<div className={`px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm break-all ${mono ? 'font-mono' : ''}`}>
				{value}
			</div>
		</div>
	);
}
