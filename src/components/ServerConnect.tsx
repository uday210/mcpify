'use client';

import { useState } from 'react';
import CopyButton from '@/components/CopyButton';

interface Props {
	slug: string;
	url: string;
	transport: string; // 'http_stream' | 'sse'
	authMode: string; // 'none' | 'api_key' | 'oauth'
	apiKey: string;
	oauthClientId?: string | null;
	oauthClientSecret?: string | null;
}

const CLIENTS = ['Claude Desktop', 'Claude Code', 'Cursor', 'VS Code', 'ChatGPT', 'cURL'] as const;
type Client = (typeof CLIENTS)[number];

export default function ServerConnect({
	slug,
	url,
	transport,
	authMode,
	apiKey,
	oauthClientId,
	oauthClientSecret,
}: Props) {
	const [client, setClient] = useState<Client>('Claude Desktop');
	const type = transport === 'sse' ? 'sse' : 'http';
	const tokenUrl = `${url}/token`;

	// What bearer value goes in the client config.
	const bearer =
		authMode === 'api_key' ? apiKey : authMode === 'oauth' ? '<ACCESS_TOKEN>' : null;
	const headers = bearer ? { Authorization: `Bearer ${bearer}` } : undefined;

	const tokenCurl = `curl -X POST "${tokenUrl}" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials" \\
  -d "client_id=${oauthClientId || '<CLIENT_ID>'}" \\
  -d "client_secret=${oauthClientSecret || '<CLIENT_SECRET>'}"`;

	const mcpServersBlock = (key = 'mcpServers') =>
		JSON.stringify({ [key]: { [slug]: { type, url, ...(headers ? { headers } : {}) } } }, null, 2);

	const curl = `curl -X POST "${url}" \\
${bearer ? `  -H "Authorization: Bearer ${bearer}" \\\n` : ''}  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

	// `claude mcp add` CLI command for Claude Code.
	const claudeCli = `claude mcp add --transport ${type} ${slug} ${url}${
		bearer ? ` \\\n  --header "Authorization: Bearer ${bearer}"` : ''
	}`;

	let bodyEl: { code?: string; steps?: string[]; note?: string };
	switch (client) {
		case 'Claude Desktop':
			bodyEl = { note: 'Settings → Developer → Edit Config, then restart Claude.', code: mcpServersBlock() };
			break;
		case 'Claude Code':
			bodyEl = { note: 'Run this in your terminal — Claude Code picks it up immediately:', code: claudeCli };
			break;
		case 'Cursor':
			bodyEl = { note: 'Add to ~/.cursor/mcp.json or .cursor/mcp.json.', code: mcpServersBlock() };
			break;
		case 'VS Code':
			bodyEl = { note: 'Add to .vscode/mcp.json.', code: mcpServersBlock('servers') };
			break;
		case 'ChatGPT':
			bodyEl = {
				steps: [
					'ChatGPT → Settings → Connectors → enable Developer Mode',
					'Create a new connector',
					`MCP server URL: ${url}`,
					authMode === 'none' ? 'No auth required' : `Authorization: Bearer ${bearer}`,
				],
			};
			break;
		case 'cURL':
			bodyEl = { note: 'Call the server directly:', code: curl };
			break;
	}

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
			<h2 className="font-semibold text-slate-900 mb-1">Connect to a client</h2>
			<p className="text-sm text-slate-500 mb-4">Add this MCP server to your AI assistant.</p>

			{authMode === 'oauth' && (
				<div className="mb-5 p-4 rounded-lg bg-cyan-50 border border-cyan-200">
					<p className="text-sm font-medium text-cyan-900 mb-2">OAuth (client credentials)</p>
					<p className="text-xs text-cyan-800 mb-3">
						External systems exchange the client ID + secret at the token endpoint for a bearer token,
						then call the MCP URL with it.
					</p>
					<Code code={tokenCurl} />
				</div>
			)}

			<div className="flex flex-wrap gap-1 mb-4 bg-slate-100 p-1 rounded-lg w-fit">
				{CLIENTS.map((c) => (
					<button
						key={c}
						onClick={() => setClient(c)}
						className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${
							client === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
						}`}
					>
						{c}
					</button>
				))}
			</div>

			{bodyEl.note && <p className="text-sm text-slate-600 mb-3">{bodyEl.note}</p>}
			{bodyEl.steps && (
				<ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700 mb-2">
					{bodyEl.steps.map((s, i) => (
						<li key={i}>{s}</li>
					))}
				</ol>
			)}
			{bodyEl.code && <Code code={bodyEl.code} />}
			{authMode === 'oauth' && bodyEl.code && (
				<p className="text-xs text-slate-400 mt-2">Replace <code>&lt;ACCESS_TOKEN&gt;</code> with a token from the endpoint above.</p>
			)}
		</div>
	);
}
