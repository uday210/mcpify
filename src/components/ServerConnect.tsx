'use client';

import { useState } from 'react';
import CopyButton from '@/components/CopyButton';

interface Props {
	slug: string;
	url: string;
	apiKey: string;
	transport: string; // 'http_stream' | 'sse'
	authRequired: boolean;
}

const CLIENTS = ['Claude', 'Cursor', 'VS Code', 'ChatGPT', 'cURL'] as const;
type Client = (typeof CLIENTS)[number];

export default function ServerConnect({ slug, url, apiKey, transport, authRequired }: Props) {
	const [client, setClient] = useState<Client>('Claude');
	const type = transport === 'sse' ? 'sse' : 'http';
	const headers = authRequired ? { Authorization: `Bearer ${apiKey}` } : undefined;

	const mcpServersBlock = (key = 'mcpServers') =>
		JSON.stringify(
			{ [key]: { [slug]: { type, url, ...(headers ? { headers } : {}) } } },
			null,
			2
		);

	const curl = `curl -X POST "${url}" \\
${authRequired ? `  -H "Authorization: Bearer ${apiKey}" \\\n` : ''}  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

	let body: { code?: string; steps?: string[]; note?: string };
	switch (client) {
		case 'Claude':
			body = {
				note: 'Settings → Developer → Edit Config (claude_desktop_config.json), then restart Claude.',
				code: mcpServersBlock(),
			};
			break;
		case 'Cursor':
			body = { note: 'Add to ~/.cursor/mcp.json (global) or .cursor/mcp.json in your project.', code: mcpServersBlock() };
			break;
		case 'VS Code':
			body = { note: 'Add to .vscode/mcp.json in your workspace.', code: mcpServersBlock('servers') };
			break;
		case 'ChatGPT':
			body = {
				steps: [
					'Open ChatGPT → Settings → Connectors',
					'Enable Developer Mode under Advanced settings',
					'Create a new connector',
					`Paste the MCP server URL: ${url}`,
					authRequired ? `Add header Authorization: Bearer ${apiKey}` : 'No auth needed — this server is public',
					'Save and enable it in the chat composer',
				],
				note: 'Custom connectors require a supported ChatGPT plan.',
			};
			break;
		case 'cURL':
			body = { note: 'Call the server directly (Streamable HTTP):', code: curl };
			break;
	}

	return (
		<div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
			<h2 className="font-semibold text-slate-900 mb-1">Connect to a client</h2>
			<p className="text-sm text-slate-500 mb-4">Add this MCP server to your AI assistant.</p>

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

			{body.note && <p className="text-sm text-slate-600 mb-3">{body.note}</p>}

			{body.steps && (
				<ol className="list-decimal list-inside space-y-1.5 text-sm text-slate-700 mb-2">
					{body.steps.map((s, i) => (
						<li key={i}>{s}</li>
					))}
				</ol>
			)}

			{body.code && (
				<div className="relative">
					<div className="absolute right-2 top-2 z-10">
						<CopyButton value={body.code} label="Copy" />
					</div>
					<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 pt-10 overflow-x-auto">{body.code}</pre>
				</div>
			)}
		</div>
	);
}
