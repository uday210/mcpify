'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, FileJson, Wrench, ArrowLeft, Plus, Trash2, Search, ExternalLink, Plug, CheckCircle2, XCircle, Info, RefreshCw, AlertTriangle } from 'lucide-react';
import AppIcon from '@/components/AppIcon';

type ConnectorType = 'catalog' | 'openapi' | 'manual';
type AuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'custom' | 'oauth' | 'oauth2_cc' | 'oauth2_account' | 'token_path';

interface CatalogApp {
	slug: string;
	name: string;
	description: string;
	auth_type: string;
	auth_help: string | null;
	supports_oauth: boolean;
	base_url: string;
	logo_url: string | null;
	api_documentation_url: string | null;
	tools: { name: string; description: string }[];
	toolCount: number;
	needs_base_url?: boolean;
	base_url_hint?: string | null;
}

interface ManualTool {
	name: string;
	http_method: string;
	path_template: string;
	query: string;
	body: string;
}

const CHIPS = [
	{ label: 'All', q: '' },
	{ label: 'AI', q: 'ai' },
	{ label: 'Email', q: 'email' },
	{ label: 'Payments', q: 'payment' },
	{ label: 'Shipping', q: 'ship' },
	{ label: 'News', q: 'news' },
	{ label: 'Weather', q: 'weather' },
	{ label: 'Dev', q: 'git' },
];

export default function NewConnectionPage() {
	const router = useRouter();
	const [connectorType, setConnectorType] = useState<ConnectorType>('catalog');
	const [apps, setApps] = useState<CatalogApp[]>([]);
	const [externalApps, setExternalApps] = useState<any[]>([]);
	const [directoryApps, setDirectoryApps] = useState<any[]>([]);
	const [totalApps, setTotalApps] = useState(0);
	const [searching, setSearching] = useState(false);
	const [appSlug, setAppSlug] = useState('');
	const [name, setName] = useState('');
	const [authType, setAuthType] = useState<AuthType>('api_key');

	// credentials
	const [keyValue, setKeyValue] = useState('');
	const [apiKeyIn, setApiKeyIn] = useState('header');
	const [apiKeyName, setApiKeyName] = useState('X-API-Key');
	const [basicUser, setBasicUser] = useState('');
	const [basicPass, setBasicPass] = useState('');
	const [headerName, setHeaderName] = useState('Authorization');
	// oauth
	const [oauthClientId, setOauthClientId] = useState('');
	const [oauthClientSecret, setOauthClientSecret] = useState('');
	const [oauthAuthorizeUrl, setOauthAuthorizeUrl] = useState('');
	const [oauthTokenUrl, setOauthTokenUrl] = useState('');
	const [oauthScopes, setOauthScopes] = useState('');
	const [accountId, setAccountId] = useState('');
	// test-before-save
	const [testing, setTesting] = useState(false);
	const [testResult, setTestResult] = useState<{ ok: boolean; skipped?: boolean; warn?: boolean; message: string } | null>(null);
	// openapi
	const [openapiUrl, setOpenapiUrl] = useState('');
	const [openapiSpec, setOpenapiSpec] = useState('');
	const [baseUrl, setBaseUrl] = useState('');
	// manual
	const [tools, setTools] = useState<ManualTool[]>([{ name: '', http_method: 'GET', path_template: '/', query: '', body: '' }]);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [catalogQuery, setCatalogQuery] = useState('');
	const preselectDone = useRef(false);

	useEffect(() => {
		setSearching(true);
		const t = setTimeout(
			() => {
				fetch(`/api/catalog/search?q=${encodeURIComponent(catalogQuery)}`)
					.then((r) => r.json())
					.then((d) => {
						const list: CatalogApp[] = d.curated || [];
						setApps(list);
						setExternalApps(d.external || []);
						setDirectoryApps(d.directory || []);
						if (typeof d.total === 'number') setTotalApps(d.total);
						if (!preselectDone.current) {
							preselectDone.current = true;
							const want = new URLSearchParams(window.location.search).get('app');
							if (want) {
								const a = list.find((x) => x.slug === want);
								if (a) {
									setConnectorType('catalog');
									pickApp(a);
								}
							}
						}
					})
					.catch(() => {})
					.finally(() => setSearching(false));
			},
			catalogQuery ? 250 : 0
		);
		return () => clearTimeout(t);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [catalogQuery]);

	const selectedApp = apps.find((a) => a.slug === appSlug);

	const pickApp = (a: CatalogApp) => {
		setAppSlug(a.slug);
		setName((n) => n || a.name);
		setAuthType((a.auth_type as AuthType) || 'api_key');
		setError(null);
	};
	const pickExternal = (a: any) => {
		setConnectorType('openapi');
		setOpenapiUrl(a.swaggerUrl);
		setName((n) => n || a.name);
	};
	const pickDirectory = (a: any) => {
		setConnectorType('openapi');
		setName((n) => n || a.name);
	};

	const addTool = () => setTools((t) => [...t, { name: '', http_method: 'GET', path_template: '/', query: '', body: '' }]);
	const updateTool = (i: number, patch: Partial<ManualTool>) => setTools((t) => t.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	const removeTool = (i: number) => setTools((t) => t.filter((_, idx) => idx !== i));

	const buildManualTools = () =>
		tools
			.filter((t) => t.name && t.path_template)
			.map((t) => {
				const param_map: any[] = [];
				for (const m of t.path_template.matchAll(/\{([^}]+)\}/g)) param_map.push({ name: m[1], in: 'path', required: true });
				t.query.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => param_map.push({ name: p, in: 'query', required: false }));
				t.body.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => param_map.push({ name: p, in: 'body', required: false }));
				return { name: t.name, http_method: t.http_method, path_template: t.path_template, param_map };
			});

	const buildBody = () => {
		const credentials: any = {};
		if (authType === 'api_key' || authType === 'bearer' || authType === 'custom' || authType === 'token_path') {
			if (keyValue) credentials.value = keyValue;
		} else if (authType === 'basic') {
			credentials.username = basicUser;
			credentials.password = basicPass;
		}
		const config: any = {};
		if (authType === 'api_key') {
			config.api_key_in = apiKeyIn;
			config.api_key_name = apiKeyName;
		}
		if (authType === 'custom') config.header_name = headerName;
		if (authType === 'oauth') {
			config.oauth = {
				client_id: oauthClientId,
				client_secret: oauthClientSecret,
				...(connectorType !== 'catalog'
					? { authorize_url: oauthAuthorizeUrl, token_url: oauthTokenUrl, scopes: oauthScopes.split(/[ ,]+/).filter(Boolean) }
					: {}),
			};
		}
		if (authType === 'oauth2_cc') {
			config.oauth = {
				client_id: oauthClientId,
				client_secret: oauthClientSecret,
				...(connectorType !== 'catalog' ? { token_url: oauthTokenUrl, scope: oauthScopes } : {}),
			};
		}
		if (authType === 'oauth2_account') {
			config.oauth = {
				client_id: oauthClientId,
				client_secret: oauthClientSecret,
				account_id: accountId,
				...(connectorType !== 'catalog' ? { token_url: oauthTokenUrl } : {}),
			};
		}

		const body: any = { name, connectorType, authType, credentials, config };
		if (connectorType === 'catalog') {
			body.appSlug = appSlug;
			if (baseUrl) body.baseUrl = baseUrl;
		}
		if (connectorType === 'openapi') {
			body.openapiUrl = openapiUrl || undefined;
			body.openapiSpec = openapiSpec || undefined;
			if (baseUrl) body.baseUrl = baseUrl;
		}
		if (connectorType === 'manual') {
			body.baseUrl = baseUrl;
			body.tools = buildManualTools();
		}
		return body;
	};

	const testConnection = async () => {
		setError(null);
		setTestResult(null);
		setTesting(true);
		try {
			const r = await fetch('/api/connections/test', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildBody()),
			});
			const d = await r.json();
			setTestResult({ ok: !!d.ok, skipped: !!d.skipped, warn: !!d.warn, message: d.message || (d.ok ? 'Verified' : 'Failed') });
		} catch (e: any) {
			setTestResult({ ok: false, message: e?.message || 'Test failed' });
		} finally {
			setTesting(false);
		}
	};

	const submit = async () => {
		setError(null);
		if (!name) return setError('Please give this connection a name.');
		setSubmitting(true);

		const body = buildBody();

		try {
			const r = await fetch('/api/connections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
			const d = await r.json();
			if (!r.ok) {
				setError(d.error || 'Failed to create connection');
				setSubmitting(false);
				return;
			}
			if (authType === 'oauth') {
				window.location.href = `/api/oauth/${d.id}/authorize`;
			} else {
				// Verify in the background so the health badge is accurate on the list.
				if (d.id) await fetch(`/api/connections/${d.id}/verify`, { method: 'POST' }).catch(() => {});
				router.push('/dashboard/connections');
			}
		} catch (e: any) {
			setError(e?.message || 'Something went wrong');
			setSubmitting(false);
		}
	};

	const input =
		'w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition';
	const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5';
	const redirectUri = (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin : '') + '/api/oauth/callback';

	const browsing = connectorType === 'catalog' && !appSlug;

	const backToBrowse = () => {
		if (connectorType === 'catalog') setAppSlug('');
		else setConnectorType('catalog');
		setError(null);
	};

	const sources: { v: ConnectorType; label: string; icon: any }[] = [
		{ v: 'catalog', label: 'Catalog', icon: Boxes },
		{ v: 'openapi', label: 'OpenAPI', icon: FileJson },
		{ v: 'manual', label: 'Manual', icon: Wrench },
	];

	return (
		<div className="max-w-5xl mx-auto">
			<button onClick={() => router.push('/dashboard/connections')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
				<ArrowLeft className="w-4 h-4" /> Back to connections
			</button>

			<div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lift">
						<Plug className="w-5 h-5 text-white" />
					</div>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-slate-900">Connect an app</h1>
						<p className="text-slate-500 text-sm">Expose any cloud app as MCP tools.</p>
					</div>
				</div>
				{/* source switcher */}
				<div className="inline-flex bg-slate-100 p-1 rounded-xl">
					{sources.map((s) => {
						const active = connectorType === s.v;
						return (
							<button
								key={s.v}
								onClick={() => {
									setConnectorType(s.v);
									setAppSlug('');
									if (s.v !== 'catalog') setAuthType('api_key');
								}}
								className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg transition ${
									active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
								}`}
							>
								<s.icon className="w-4 h-4" />
								{s.label}
							</button>
						);
					})}
				</div>
			</div>

			{error && <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{error}</div>}

			{browsing ? (
				/* ===================== BROWSE (App Store) ===================== */
				<div>
					<div className="relative mb-4 max-w-2xl mx-auto">
						<Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
						<input
							className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-base shadow-card focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition"
							placeholder={`Search ${totalApps || ''} built-in apps, or 2,500+ OpenAPI APIs…`}
							value={catalogQuery}
							onChange={(e) => setCatalogQuery(e.target.value)}
							autoFocus
						/>
					</div>

					<div className="flex flex-wrap justify-center gap-2 mb-7">
						{CHIPS.map((c) => {
							const active = catalogQuery.toLowerCase() === c.q;
							return (
								<button
									key={c.label}
									onClick={() => setCatalogQuery(c.q)}
									className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition ${
										active ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
									}`}
								>
									{c.label}
								</button>
							);
						})}
					</div>

					{/* curated tiles */}
					<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
						{apps.map((a) => (
							<button
								key={a.slug}
								onClick={() => pickApp(a)}
								className="group flex flex-col items-center text-center gap-3 p-5 rounded-2xl border border-slate-200/70 bg-white shadow-card hover:shadow-lift hover:-translate-y-0.5 hover:border-cyan-300 transition-all"
							>
								<AppIcon src={a.logo_url} name={a.name} size={48} rounded="rounded-2xl" />
								<div>
									<div className="font-semibold text-slate-900 group-hover:text-cyan-600 transition leading-tight">{a.name}</div>
									<div className="text-xs text-slate-400 mt-0.5">{a.toolCount} tools</div>
								</div>
							</button>
						))}
					</div>

					{apps.length === 0 && !searching && externalApps.length === 0 && directoryApps.length === 0 && (
						<p className="text-center text-sm text-slate-400 py-10">No apps match “{catalogQuery}”.</p>
					)}

					{/* external (OpenAPI import) */}
					{externalApps.length > 0 && (
						<div className="mt-8">
							<div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Import via OpenAPI (APIs.guru)</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
								{externalApps.map((a) => (
									<button
										key={a.slug}
										onClick={() => pickExternal(a)}
										className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-300 hover:shadow-sm transition text-left"
									>
										<AppIcon src={a.logo_url} name={a.name} size={28} />
										<div className="min-w-0 flex-1">
											<div className="text-sm font-medium text-slate-800 truncate">{a.name}</div>
											<div className="text-[10px] text-slate-400 truncate">{a.provider}</div>
										</div>
										<span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">OpenAPI</span>
									</button>
								))}
							</div>
						</div>
					)}

					{/* directory */}
					{directoryApps.length > 0 && (
						<div className="mt-8">
							<div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Browse 3,300+ more (connect via OpenAPI/manual)</div>
							<div className="flex flex-wrap gap-1.5">
								{directoryApps.map((a) => (
									<button
										key={a.slug}
										onClick={() => pickDirectory(a)}
										className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:border-cyan-300 hover:bg-slate-50 text-xs text-slate-700 transition"
									>
										{a.name}
									</button>
								))}
							</div>
						</div>
					)}
				</div>
			) : (
				/* ===================== CONFIGURE ===================== */
				<div className="max-w-2xl mx-auto">
					<button onClick={backToBrowse} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
						<ArrowLeft className="w-4 h-4" /> {connectorType === 'catalog' ? 'Choose a different app' : 'Back to catalog'}
					</button>

					<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card overflow-hidden">
						{/* header */}
						{connectorType === 'catalog' && selectedApp ? (
							<div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-b border-slate-100 p-5 flex items-center gap-4">
								<AppIcon src={selectedApp.logo_url} name={selectedApp.name} size={52} rounded="rounded-2xl" />
								<div className="min-w-0">
									<h2 className="text-lg font-bold text-slate-900">{selectedApp.name}</h2>
									<div className="flex items-center gap-1.5 mt-1">
										<span className="px-2 py-0.5 rounded-full text-[11px] bg-white/70 text-slate-600">{selectedApp.toolCount} tools</span>
										<span className="px-2 py-0.5 rounded-full text-[11px] bg-white/70 text-slate-600">{selectedApp.auth_type}</span>
									</div>
								</div>
							</div>
						) : (
							<div className="bg-gradient-to-br from-cyan-50 to-blue-50 border-b border-slate-100 p-5 flex items-center gap-3">
								<div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
									{connectorType === 'openapi' ? <FileJson className="w-6 h-6 text-cyan-600" /> : <Wrench className="w-6 h-6 text-cyan-600" />}
								</div>
								<div>
									<h2 className="text-lg font-bold text-slate-900">{connectorType === 'openapi' ? 'Import from OpenAPI' : 'Manual endpoints'}</h2>
									<p className="text-sm text-slate-500">
										{connectorType === 'openapi' ? 'Paste a spec URL or JSON to auto-generate tools.' : 'Define endpoints by hand.'}
									</p>
								</div>
							</div>
						)}

						<div className="p-6 space-y-5">
							{/* catalog: description + how-to + tools */}
							{connectorType === 'catalog' && selectedApp && (
								<>
									<p className="text-sm text-slate-600">{selectedApp.description}</p>
									<div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
										<div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">How to connect</div>
										<p className="text-sm text-slate-600">{selectedApp.auth_help || 'Provide your credentials below.'}</p>
										{selectedApp.api_documentation_url && (
											<a href={selectedApp.api_documentation_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 mt-2">
												API documentation <ExternalLink className="w-3 h-3" />
											</a>
										)}
									</div>
									<div className="flex flex-wrap gap-1.5">
										{selectedApp.tools.map((t) => (
											<span key={t.name} title={t.description} className="px-2 py-1 rounded-lg bg-cyan-50 text-cyan-700 text-xs font-mono border border-cyan-100">
												{t.name}
											</span>
										))}
									</div>
								</>
							)}

							{/* openapi fields */}
							{connectorType === 'openapi' && (
								<>
									<div>
										<label className={labelCls}>OpenAPI spec URL</label>
										<input className={input} value={openapiUrl} onChange={(e) => setOpenapiUrl(e.target.value)} placeholder="https://api.example.com/openapi.json" />
									</div>
									<div className="text-center text-xs text-slate-400">— or paste the spec —</div>
									<div>
										<label className={labelCls}>OpenAPI / Swagger (JSON or YAML)</label>
										<textarea className={`${input} font-mono text-xs h-28`} value={openapiSpec} onChange={(e) => setOpenapiSpec(e.target.value)} placeholder='{ "openapi": "3.0.0", ... }' />
									</div>
									<div>
										<label className={labelCls}>Base URL override (optional)</label>
										<input className={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
									</div>
								</>
							)}

							{/* manual fields */}
							{connectorType === 'manual' && (
								<>
									<div>
										<label className={labelCls}>Base URL</label>
										<input className={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
									</div>
									<div>
										<label className={labelCls}>Tools</label>
										<div className="space-y-3">
											{tools.map((t, i) => (
												<div key={i} className="p-3 border border-slate-200 rounded-xl space-y-2">
													<div className="flex gap-2">
														<input className={input} value={t.name} onChange={(e) => updateTool(i, { name: e.target.value })} placeholder="tool_name" />
														<select className="px-3 py-2 border border-slate-300 rounded-xl text-sm" value={t.http_method} onChange={(e) => updateTool(i, { http_method: e.target.value })}>
															{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (<option key={m}>{m}</option>))}
														</select>
														<button onClick={() => removeTool(i)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
													</div>
													<input className={input} value={t.path_template} onChange={(e) => updateTool(i, { path_template: e.target.value })} placeholder="/users/{id}" />
													<div className="flex gap-2">
														<input className={input} value={t.query} onChange={(e) => updateTool(i, { query: e.target.value })} placeholder="query params (comma-sep)" />
														<input className={input} value={t.body} onChange={(e) => updateTool(i, { body: e.target.value })} placeholder="body fields (comma-sep)" />
													</div>
												</div>
											))}
										</div>
										<button onClick={addTool} className="mt-3 flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700"><Plus className="w-4 h-4" /> Add tool</button>
									</div>
								</>
							)}

							{/* per-account base URL (Shopify store, Jira/Zendesk site…) */}
							{connectorType === 'catalog' && selectedApp?.needs_base_url && (
								<div>
									<label className={labelCls}>Base URL</label>
									<input
										className={input}
										value={baseUrl}
										onChange={(e) => setBaseUrl(e.target.value)}
										placeholder={selectedApp.base_url_hint || 'https://your-account.example.com'}
									/>
									<p className="text-xs text-slate-400 mt-1">Your account/store-specific API URL.</p>
								</div>
							)}

							{/* connection name */}
							<div>
								<label className={labelCls}>Connection name</label>
								<input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="My connection" />
							</div>

							{/* auth selector (non-catalog) */}
							{connectorType !== 'catalog' && (
								<div>
									<label className={labelCls}>Authentication</label>
									<select className={input} value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)}>
										<option value="none">None (public API)</option>
										<option value="api_key">API Key</option>
										<option value="bearer">Bearer Token</option>
										<option value="basic">Basic Auth</option>
										<option value="custom">Custom Header</option>
										<option value="oauth">OAuth 2.0 (Authorization Code)</option>
										<option value="oauth2_cc">OAuth 2.0 (Client Credentials)</option>
										<option value="oauth2_account">OAuth 2.0 (Account Credentials)</option>
										<option value="token_path">Token in URL path</option>
									</select>
								</div>
							)}

							{/* credentials */}
							{authType !== 'none' && authType !== 'oauth' && authType !== 'oauth2_cc' && authType !== 'oauth2_account' && (
								<div className="text-sm font-semibold text-slate-700">Credentials</div>
							)}

							{authType === 'token_path' && (
								<div>
									<label className={labelCls}>Bot token</label>
									<input className={input} type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="123456:ABC-DEF…" />
									<p className="text-xs text-slate-500 mt-1">From @BotFather. mcpify calls https://api.telegram.org/bot&lt;token&gt;/…</p>
								</div>
							)}

							{authType === 'api_key' &&
								(connectorType === 'catalog' ? (
									<div>
										<label className={labelCls}>API key</label>
										<input className={input} type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="Paste your key" />
									</div>
								) : (
									<div className="grid grid-cols-3 gap-3">
										<div>
											<label className={labelCls}>Send in</label>
											<select className={input} value={apiKeyIn} onChange={(e) => setApiKeyIn(e.target.value)}>
												<option value="header">Header</option>
												<option value="query">Query</option>
											</select>
										</div>
										<div>
											<label className={labelCls}>Param name</label>
											<input className={input} value={apiKeyName} onChange={(e) => setApiKeyName(e.target.value)} />
										</div>
										<div>
											<label className={labelCls}>API key</label>
											<input className={input} type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="••••••" />
										</div>
									</div>
								))}
							{authType === 'bearer' && (
								<div>
									<label className={labelCls}>Bearer token / API key</label>
									<input className={input} type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="Paste your token" />
								</div>
							)}
							{authType === 'basic' && (
								<div className="grid grid-cols-2 gap-3">
									<div>
										<label className={labelCls}>Username</label>
										<input className={input} value={basicUser} onChange={(e) => setBasicUser(e.target.value)} />
									</div>
									<div>
										<label className={labelCls}>Password</label>
										<input className={input} type="password" value={basicPass} onChange={(e) => setBasicPass(e.target.value)} />
									</div>
								</div>
							)}
							{authType === 'custom' &&
								(connectorType === 'catalog' ? (
									<div>
										<label className={labelCls}>API key / token</label>
										<input className={input} type="password" value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="Paste the value exactly as the guide shows" />
									</div>
								) : (
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className={labelCls}>Header name</label>
											<input className={input} value={headerName} onChange={(e) => setHeaderName(e.target.value)} />
										</div>
										<div>
											<label className={labelCls}>Header value</label>
											<input className={input} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} />
										</div>
									</div>
								))}
							{(authType === 'oauth' || authType === 'oauth2_cc') && (
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className={labelCls}>Client ID</label>
											<input className={input} value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} />
										</div>
										<div>
											<label className={labelCls}>Client Secret</label>
											<input className={input} type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} />
										</div>
									</div>
									{connectorType !== 'catalog' && (
										<>
											{authType === 'oauth' && (
												<div>
													<label className={labelCls}>Authorize URL</label>
													<input className={input} value={oauthAuthorizeUrl} onChange={(e) => setOauthAuthorizeUrl(e.target.value)} />
												</div>
											)}
											<div>
												<label className={labelCls}>Token URL</label>
												<input className={input} value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} />
											</div>
											<div>
												<label className={labelCls}>{authType === 'oauth' ? 'Scopes (space-separated)' : 'Scope (optional)'}</label>
												<input className={input} value={oauthScopes} onChange={(e) => setOauthScopes(e.target.value)} />
											</div>
										</>
									)}
									{authType === 'oauth' && (
										<div className="text-xs text-slate-500">
											Add this redirect URI in your provider app:
											<code className="block mt-1 bg-slate-100 px-2 py-1.5 rounded break-all text-slate-700">{redirectUri}</code>
										</div>
									)}
								</div>
							)}
							{authType === 'oauth2_account' && (
								<div className="space-y-3">
									<div className="grid grid-cols-2 gap-3">
										<div>
											<label className={labelCls}>Client ID</label>
											<input className={input} value={oauthClientId} onChange={(e) => setOauthClientId(e.target.value)} />
										</div>
										<div>
											<label className={labelCls}>Client Secret</label>
											<input className={input} type="password" value={oauthClientSecret} onChange={(e) => setOauthClientSecret(e.target.value)} />
										</div>
									</div>
									<div>
										<label className={labelCls}>Account ID</label>
										<input className={input} value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Zoom Account ID" />
									</div>
									{connectorType !== 'catalog' && (
										<div>
											<label className={labelCls}>Token URL</label>
											<input className={input} value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} />
										</div>
									)}
									<p className="text-xs text-slate-500">Create a Server-to-Server OAuth app in the provider’s marketplace to get these values.</p>
								</div>
							)}

							{testResult && (
								<div
									className={`flex items-start gap-2 text-sm rounded-xl px-3 py-2.5 border ${
										testResult.skipped
											? 'bg-slate-50 border-slate-200 text-slate-600'
											: testResult.ok
												? 'bg-emerald-50 border-emerald-200 text-emerald-700'
												: testResult.warn
													? 'bg-amber-50 border-amber-200 text-amber-700'
													: 'bg-red-50 border-red-200 text-red-700'
									}`}
								>
									{testResult.skipped ? (
										<Info className="w-4 h-4 shrink-0 mt-0.5" />
									) : testResult.ok ? (
										<CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
									) : testResult.warn ? (
										<AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
									) : (
										<XCircle className="w-4 h-4 shrink-0 mt-0.5" />
									)}
									<span>{testResult.message}</span>
								</div>
							)}

							<div className="flex gap-3">
								{authType !== 'oauth' && (
									<button
										onClick={testConnection}
										disabled={testing || submitting}
										className="flex-1 py-3 border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
									>
										{testing ? (
											<RefreshCw className="w-4 h-4 animate-spin" />
										) : (
											<Plug className="w-4 h-4" />
										)}
										{testing ? 'Testing…' : 'Test'}
									</button>
								)}
								<button
									onClick={submit}
									disabled={submitting}
									className="flex-[2] py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lift transition disabled:opacity-50"
								>
									{submitting ? 'Creating…' : authType === 'oauth' ? 'Save & Authorize' : 'Create Connection'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
