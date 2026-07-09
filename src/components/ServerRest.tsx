'use client';

import CopyButton from '@/components/CopyButton';

interface Props {
	url: string; // the server's MCP base URL (…/api/mcp/:slug)
	authMode: string; // 'none' | 'api_key' | 'oauth'
	apiKey: string;
	tools?: Array<{ name: string; http_method?: string }>;
}

/**
 * REST API surface for a server: base URL, OpenAPI schema, a sample call, and
 * the per-tool endpoints. Every tool is `POST /<tool_name>` with a JSON body of
 * its arguments — usable from ChatGPT Actions, Zapier, n8n, or plain HTTP.
 */
export default function ServerRest({ url, authMode, apiKey, tools = [] }: Props) {
	const restBase = url.replace('/api/mcp/', '/api/rest/');
	const openapiUrl = `${restBase}/openapi.json`;
	const bearer = authMode === 'api_key' ? apiKey : authMode === 'oauth' ? '<ACCESS_TOKEN>' : null;
	const sample = tools[0];
	const sampleTool = sample?.name || '<tool_name>';
	const sampleMethod = (sample?.http_method || 'POST').toUpperCase();

	const curl =
		sampleMethod === 'GET'
			? `curl "${restBase}/${sampleTool}?arg=value"${bearer ? ` \\\n  -H "Authorization: Bearer ${bearer}"` : ''}`
			: `curl -X ${sampleMethod} "${restBase}/${sampleTool}" \\
${bearer ? `  -H "Authorization: Bearer ${bearer}" \\\n` : ''}  -H "Content-Type: application/json" \\
  -d '{ "arg": "value" }'`;

	const Code = ({ code }: { code: string }) => (
		<div className="relative">
			<div className="absolute right-2 top-2 z-10">
				<CopyButton value={code} label="Copy" />
			</div>
			<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 pt-10 overflow-x-auto">{code}</pre>
		</div>
	);

	return (
		<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
			<div className="flex items-center gap-2 mb-1">
				<h2 className="font-semibold text-slate-900">REST API</h2>
				<span className="px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">HTTP</span>
			</div>
			<p className="text-sm text-slate-500 mb-4">
				Call this connection&apos;s tools over plain HTTP — no MCP client needed. Works with ChatGPT Custom GPT
				Actions, Zapier, n8n, or any HTTP client. Each tool is exposed under its configured HTTP method (set it
				on the Tools tab).
			</p>

			<div className="space-y-4">
				<Field label="Base URL" value={restBase} />
				<Field label="OpenAPI schema (import this)" value={openapiUrl} />

				{authMode === 'none' ? (
					<div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
						Public — no auth required to call these endpoints.
					</div>
				) : (
					<div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
						Authenticate with <code>Authorization: Bearer &lt;{authMode === 'oauth' ? 'ACCESS_TOKEN' : 'API_KEY'}&gt;</code>
						{authMode === 'oauth' && ' (exchange your client ID + secret at the token endpoint first)'}.
					</div>
				)}

				<div>
					<label className="block text-sm font-medium text-slate-700 mb-1">Example call</label>
					<Code code={curl} />
				</div>

				{tools.length > 0 && (
					<div>
						<label className="block text-sm font-medium text-slate-700 mb-1">Endpoints ({tools.length})</label>
						<div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y">
							{tools.map((t) => (
								<div key={t.name} className="flex items-center gap-2 px-3 py-2 text-xs">
									<span className="font-mono px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded w-14 text-center">
										{(t.http_method || 'POST').toUpperCase()}
									</span>
									<span className="font-mono text-slate-600 truncate">/api/rest/…/{t.name}</span>
								</div>
							))}
						</div>
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
			<div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm break-all">{value}</div>
		</div>
	);
}
