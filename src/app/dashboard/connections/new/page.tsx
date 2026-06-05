'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Boxes, FileJson, Wrench, ArrowLeft, Plus, Trash2, Search, ExternalLink } from 'lucide-react';
import AppIcon from '@/components/AppIcon';

type ConnectorType = 'catalog' | 'openapi' | 'manual';
type AuthType = 'none' | 'api_key' | 'bearer' | 'basic' | 'custom' | 'oauth';

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
}

interface ManualTool {
	name: string;
	http_method: string;
	path_template: string;
	query: string;
	body: string;
}

export default function NewConnectionPage() {
	const router = useRouter();
	const [connectorType, setConnectorType] = useState<ConnectorType>('catalog');
	const [apps, setApps] = useState<CatalogApp[]>([]);
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

	// openapi
	const [openapiUrl, setOpenapiUrl] = useState('');
	const [openapiSpec, setOpenapiSpec] = useState('');
	const [baseUrl, setBaseUrl] = useState('');

	// manual
	const [tools, setTools] = useState<ManualTool[]>([
		{ name: '', http_method: 'GET', path_template: '/', query: '', body: '' },
	]);

	const [externalApps, setExternalApps] = useState<any[]>([]);
	const [searching, setSearching] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [catalogQuery, setCatalogQuery] = useState('');
	const preselectDone = useRef(false);

	// Search the catalog (curated + APIs.guru external directory), debounced.
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

	// Import an external (APIs.guru) app via the OpenAPI connector.
	const pickExternal = (a: any) => {
		setConnectorType('openapi');
		setOpenapiUrl(a.swaggerUrl);
		setName((n) => n || a.name);
	};

	const selectedApp = apps.find((a) => a.slug === appSlug);

	const pickApp = (a: CatalogApp) => {
		setAppSlug(a.slug);
		setName((n) => n || a.name);
		setAuthType((a.auth_type as AuthType) || 'api_key');
	};

	const addTool = () =>
		setTools((t) => [...t, { name: '', http_method: 'GET', path_template: '/', query: '', body: '' }]);
	const updateTool = (i: number, patch: Partial<ManualTool>) =>
		setTools((t) => t.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
	const removeTool = (i: number) => setTools((t) => t.filter((_, idx) => idx !== i));

	const buildManualTools = () =>
		tools
			.filter((t) => t.name && t.path_template)
			.map((t) => {
				const param_map: any[] = [];
				// Path params from {placeholders}
				for (const m of t.path_template.matchAll(/\{([^}]+)\}/g)) {
					param_map.push({ name: m[1], in: 'path', required: true });
				}
				t.query
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.forEach((p) => param_map.push({ name: p, in: 'query', required: false }));
				t.body
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean)
					.forEach((p) => param_map.push({ name: p, in: 'body', required: false }));
				return {
					name: t.name,
					http_method: t.http_method,
					path_template: t.path_template,
					param_map,
				};
			});

	const submit = async () => {
		setError(null);
		if (!name) return setError('Please give this connection a name.');
		setSubmitting(true);

		const credentials: any = {};
		if (authType === 'api_key' || authType === 'bearer' || authType === 'custom') {
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
					? {
							authorize_url: oauthAuthorizeUrl,
							token_url: oauthTokenUrl,
							scopes: oauthScopes.split(/[ ,]+/).filter(Boolean),
					  }
					: {}),
			};
		}

		const body: any = { name, connectorType, authType, credentials, config };
		if (connectorType === 'catalog') body.appSlug = appSlug;
		if (connectorType === 'openapi') {
			body.openapiUrl = openapiUrl || undefined;
			body.openapiSpec = openapiSpec || undefined;
			if (baseUrl) body.baseUrl = baseUrl;
		}
		if (connectorType === 'manual') {
			body.baseUrl = baseUrl;
			body.tools = buildManualTools();
		}

		try {
			const r = await fetch('/api/connections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			const d = await r.json();
			if (!r.ok) {
				setError(d.error || 'Failed to create connection');
				setSubmitting(false);
				return;
			}
			if (authType === 'oauth') {
				window.location.href = `/api/oauth/${d.id}/authorize`;
			} else {
				router.push('/dashboard/connections');
			}
		} catch (e: any) {
			setError(e?.message || 'Something went wrong');
			setSubmitting(false);
		}
	};

	const typeCard = (t: ConnectorType, label: string, desc: string, Icon: any) => (
		<button
			onClick={() => setConnectorType(t)}
			className={`text-left p-4 rounded-xl border-2 transition ${
				connectorType === t ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
			}`}
		>
			<Icon className="w-6 h-6 text-cyan-600 mb-2" />
			<div className="font-semibold text-slate-900">{label}</div>
			<div className="text-xs text-slate-500 mt-1">{desc}</div>
		</button>
	);

	const input = 'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500';
	const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

	return (
		<div className="max-w-2xl">
			<button
				onClick={() => router.push('/dashboard/connections')}
				className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4"
			>
				<ArrowLeft className="w-4 h-4" /> Back to connections
			</button>
			<h1 className="text-3xl font-bold text-slate-900 mb-1">New Connection</h1>
			<p className="text-slate-500 mb-6">Link a cloud app so it can be exposed as MCP tools.</p>

			{error && (
				<div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
					{error}
				</div>
			)}

			<div className="grid grid-cols-3 gap-3 mb-6">
				{typeCard('catalog', 'Catalog', 'Pick a built-in app', Boxes)}
				{typeCard('openapi', 'OpenAPI', 'Import a spec', FileJson)}
				{typeCard('manual', 'Manual', 'Define endpoints', Wrench)}
			</div>

			<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 space-y-5">
				{/* Catalog picker */}
				{connectorType === 'catalog' && (
					<div>
						<div className="flex items-center justify-between mb-1">
							<label className={labelCls}>Choose an app</label>
							<span className="text-xs text-slate-400">{searching ? 'searching…' : '2,500+ apps'}</span>
						</div>
						<div className="relative mb-3">
							<Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
							<input
								className={`${input} pl-9`}
								placeholder="Search 2,500+ apps (GitHub, Notion, Shopify, Twilio…)"
								value={catalogQuery}
								onChange={(e) => setCatalogQuery(e.target.value)}
							/>
						</div>
						<div className="grid md:grid-cols-5 gap-4">
							{/* App grid */}
							<div className="md:col-span-2 max-h-80 overflow-y-auto pr-1 space-y-3">
								<div className="grid grid-cols-3 md:grid-cols-2 gap-2">
									{apps.map((a) => (
										<button
											key={a.slug}
											onClick={() => pickApp(a)}
											className={`flex flex-col items-center text-center gap-2 p-3 rounded-xl border transition ${
												appSlug === a.slug
													? 'border-cyan-500 bg-cyan-50 ring-1 ring-cyan-200'
													: 'border-slate-200 hover:border-cyan-300 hover:shadow-sm'
											}`}
										>
											<AppIcon src={a.logo_url} name={a.name} size={32} />
											<div className="text-xs font-medium text-slate-900 leading-tight">{a.name}</div>
										</button>
									))}
								</div>
								{externalApps.length > 0 && (
									<div>
										<div className="text-[10px] uppercase tracking-wide text-slate-400 px-1 mb-1.5">
											More via OpenAPI (APIs.guru)
										</div>
										<div className="space-y-1.5">
											{externalApps.map((a) => (
												<button
													key={a.slug}
													onClick={() => pickExternal(a)}
													className="w-full flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:border-cyan-300 hover:bg-slate-50 transition text-left"
												>
													<AppIcon src={a.logo_url} name={a.name} size={28} />
													<div className="min-w-0 flex-1">
														<div className="text-xs font-medium text-slate-800 truncate">{a.name}</div>
														<div className="text-[10px] text-slate-400 truncate">{a.provider}</div>
													</div>
													<span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">OpenAPI</span>
												</button>
											))}
										</div>
									</div>
								)}
								{apps.length === 0 && externalApps.length === 0 && !searching && (
									<p className="text-xs text-slate-400 px-1 py-4 text-center">No apps found.</p>
								)}
							</div>

							{/* Selected app detail / setup guide */}
							<div className="md:col-span-3">
								{selectedApp ? (
									<div className="rounded-xl border border-slate-200 p-4 h-full">
										<div className="flex items-center gap-3 mb-3">
											<AppIcon src={selectedApp.logo_url} name={selectedApp.name} size={40} />
											<div>
												<div className="font-semibold text-slate-900">{selectedApp.name}</div>
												<div className="text-xs text-slate-500">{selectedApp.toolCount} tools · {selectedApp.auth_type}</div>
											</div>
										</div>
										<p className="text-sm text-slate-600 mb-3">{selectedApp.description}</p>

										<div className="mb-3">
											<div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">How to connect</div>
											<p className="text-sm text-slate-600">{selectedApp.auth_help || 'Provide your credentials below.'}</p>
											{selectedApp.api_documentation_url && (
												<a
													href={selectedApp.api_documentation_url}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 mt-1.5"
												>
													API documentation <ExternalLink className="w-3 h-3" />
												</a>
											)}
										</div>

										<div>
											<div className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">Tools</div>
											<div className="flex flex-wrap gap-1.5">
												{selectedApp.tools.map((t) => (
													<span
														key={t.name}
														title={t.description}
														className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-mono"
													>
														{t.name}
													</span>
												))}
											</div>
										</div>
									</div>
								) : (
									<div className="rounded-xl border border-dashed border-slate-200 p-6 h-full flex items-center justify-center text-center text-sm text-slate-400">
										Select an app to see setup instructions and tools.
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				<div>
					<label className={labelCls}>Connection name</label>
					<input className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="My GitHub" />
				</div>

				{/* OpenAPI fields */}
				{connectorType === 'openapi' && (
					<>
						<div>
							<label className={labelCls}>OpenAPI spec URL</label>
							<input
								className={input}
								value={openapiUrl}
								onChange={(e) => setOpenapiUrl(e.target.value)}
								placeholder="https://api.example.com/openapi.json"
							/>
						</div>
						<div className="text-center text-xs text-slate-400">— or paste the spec —</div>
						<div>
							<label className={labelCls}>OpenAPI / Swagger (JSON or YAML)</label>
							<textarea
								className={`${input} font-mono text-xs h-32`}
								value={openapiSpec}
								onChange={(e) => setOpenapiSpec(e.target.value)}
								placeholder='{ "openapi": "3.0.0", ... }'
							/>
						</div>
						<div>
							<label className={labelCls}>Base URL override (optional)</label>
							<input className={input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com" />
						</div>
					</>
				)}

				{/* Manual fields */}
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
									<div key={i} className="p-3 border border-slate-200 rounded-lg space-y-2">
										<div className="flex gap-2">
											<input
												className={input}
												value={t.name}
												onChange={(e) => updateTool(i, { name: e.target.value })}
												placeholder="tool_name"
											/>
											<select
												className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
												value={t.http_method}
												onChange={(e) => updateTool(i, { http_method: e.target.value })}
											>
												{['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
													<option key={m}>{m}</option>
												))}
											</select>
											<button onClick={() => removeTool(i)} className="p-2 text-slate-400 hover:text-red-600">
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
										<input
											className={input}
											value={t.path_template}
											onChange={(e) => updateTool(i, { path_template: e.target.value })}
											placeholder="/users/{id}"
										/>
										<div className="flex gap-2">
											<input
												className={input}
												value={t.query}
												onChange={(e) => updateTool(i, { query: e.target.value })}
												placeholder="query params (comma-sep)"
											/>
											<input
												className={input}
												value={t.body}
												onChange={(e) => updateTool(i, { body: e.target.value })}
												placeholder="body fields (comma-sep)"
											/>
										</div>
									</div>
								))}
							</div>
							<button onClick={addTool} className="mt-3 flex items-center gap-1.5 text-sm text-cyan-600 hover:text-cyan-700">
								<Plus className="w-4 h-4" /> Add tool
							</button>
						</div>
					</>
				)}

				{/* Auth type (not for catalog, where it's fixed by the app) */}
				{connectorType !== 'catalog' && (
					<div>
						<label className={labelCls}>Authentication</label>
						<select className={input} value={authType} onChange={(e) => setAuthType(e.target.value as AuthType)}>
							<option value="none">None (public API)</option>
							<option value="api_key">API Key</option>
							<option value="bearer">Bearer Token</option>
							<option value="basic">Basic Auth</option>
							<option value="custom">Custom Header</option>
							<option value="oauth">OAuth 2.0</option>
						</select>
					</div>
				)}

				{/* Auth credential fields */}
				{authType === 'api_key' && (
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
							<input className={input} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="••••••" />
						</div>
					</div>
				)}
				{authType === 'bearer' && (
					<div>
						<label className={labelCls}>Bearer token</label>
						<input className={input} value={keyValue} onChange={(e) => setKeyValue(e.target.value)} placeholder="ghp_... / sk_..." />
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
				{authType === 'custom' && (
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
				)}
				{authType === 'oauth' && (
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
								<div>
									<label className={labelCls}>Authorize URL</label>
									<input className={input} value={oauthAuthorizeUrl} onChange={(e) => setOauthAuthorizeUrl(e.target.value)} />
								</div>
								<div>
									<label className={labelCls}>Token URL</label>
									<input className={input} value={oauthTokenUrl} onChange={(e) => setOauthTokenUrl(e.target.value)} />
								</div>
								<div>
									<label className={labelCls}>Scopes (space-separated)</label>
									<input className={input} value={oauthScopes} onChange={(e) => setOauthScopes(e.target.value)} />
								</div>
							</>
						)}
						<p className="text-xs text-slate-500">
							You&apos;ll be redirected to authorize after saving. Set the provider&apos;s redirect URI to{' '}
							<code className="bg-slate-100 px-1 rounded">{`{APP_URL}/api/oauth/callback`}</code>.
						</p>
					</div>
				)}

				<button
					onClick={submit}
					disabled={submitting}
					className="w-full py-2.5 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition disabled:opacity-50"
				>
					{submitting ? 'Creating…' : authType === 'oauth' ? 'Save & Authorize' : 'Create Connection'}
				</button>
			</div>
		</div>
	);
}
