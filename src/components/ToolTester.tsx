'use client';

import { useMemo, useState } from 'react';
import { Play, Code2, ListTree } from 'lucide-react';

interface Tool {
	name: string;
	description?: string | null;
	http_method: string;
	enabled: boolean;
	input_schema?: any;
	param_map?: Array<{ name: string; in: string }>;
}

export default function ToolTester({ serverId, tools }: { serverId: string; tools: Tool[] }) {
	const enabled = tools.filter((t) => t.enabled);
	const [toolName, setToolName] = useState(enabled[0]?.name || '');
	const [values, setValues] = useState<Record<string, any>>({});
	const [raw, setRaw] = useState(false);
	const [rawText, setRawText] = useState('{}');
	const [running, setRunning] = useState(false);
	const [result, setResult] = useState<any>(null);

	const tool = enabled.find((t) => t.name === toolName);
	const props: Record<string, any> = tool?.input_schema?.properties || {};
	const required: string[] = tool?.input_schema?.required || [];
	const locationOf = useMemo(() => {
		const m: Record<string, string> = {};
		(tool?.param_map || []).forEach((p) => (m[p.name] = p.in));
		return m;
	}, [tool]);

	const selectTool = (n: string) => {
		setToolName(n);
		// Pre-fill object/array params with their example payload (if the
		// description is valid JSON) so users edit a template, not free-text.
		const t = enabled.find((x) => x.name === n);
		const init: Record<string, any> = {};
		for (const [name, schema] of Object.entries<any>(t?.input_schema?.properties || {})) {
			if ((schema.type === 'object' || schema.type === 'array') && schema.description) {
				try {
					JSON.parse(schema.description);
					init[name] = schema.description;
				} catch {
					/* not JSON — leave blank */
				}
			}
		}
		setValues(init);
		setResult(null);
	};

	const buildArgs = (): Record<string, any> => {
		if (raw) {
			try {
				return JSON.parse(rawText || '{}');
			} catch {
				throw new Error('Arguments must be valid JSON');
			}
		}
		const args: Record<string, any> = {};
		for (const [name, schema] of Object.entries<any>(props)) {
			const v = values[name];
			if (v === undefined || v === '') continue;
			const t = schema.type;
			if (t === 'integer' || t === 'number') args[name] = Number(v);
			else if (t === 'boolean') args[name] = !!v;
			else if (t === 'array' || t === 'object') {
				try {
					args[name] = JSON.parse(v);
				} catch {
					throw new Error(`"${name}" must be valid JSON (e.g. ${schema.description || '{ ... }'})`);
				}
			} else args[name] = v;
		}
		return args;
	};

	const run = async (method: 'tools/call' | 'tools/list') => {
		setRunning(true);
		setResult(null);
		try {
			const body: any = { method };
			if (method === 'tools/call') {
				body.name = toolName;
				body.arguments = buildArgs();
			}
			const r = await fetch(`/api/servers/${serverId}/test`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			});
			setResult(await r.json());
		} catch (e: any) {
			setResult({ error: { message: e?.message || 'Request failed' } });
		} finally {
			setRunning(false);
		}
	};

	// Pull human-friendly content text out of a tools/call result.
	const contentText: string | null = useMemo(() => {
		const c = result?.result?.content;
		if (Array.isArray(c)) return c.map((x: any) => x.text).filter(Boolean).join('\n');
		return null;
	}, [result]);

	const inputCls =
		'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-200';
	const tagColor: Record<string, string> = {
		path: 'bg-violet-100 text-violet-700',
		query: 'bg-blue-100 text-blue-700',
		body: 'bg-emerald-100 text-emerald-700',
		header: 'bg-amber-100 text-amber-700',
	};

	return (
		<div className="bg-white rounded-2xl border border-slate-200 p-6">
			<div className="flex items-center justify-between mb-4">
				<h2 className="font-semibold text-slate-900 flex items-center gap-2">
					<Play className="w-4 h-4 text-cyan-600" /> Test console
				</h2>
				<button
					onClick={() => run('tools/list')}
					className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
				>
					<ListTree className="w-3.5 h-3.5" /> List tools
				</button>
			</div>

			{enabled.length === 0 ? (
				<p className="text-sm text-slate-400">No enabled tools to test.</p>
			) : (
				<>
					<div className="flex items-center gap-2 mb-4">
						<select value={toolName} onChange={(e) => selectTool(e.target.value)} className={inputCls}>
							{enabled.map((t) => (
								<option key={t.name} value={t.name}>
									{t.name}
								</option>
							))}
						</select>
						<span className="text-xs font-mono px-2 py-1 bg-slate-100 rounded text-slate-600 shrink-0">
							{tool?.http_method}
						</span>
					</div>

					{tool?.description && <p className="text-sm text-slate-500 mb-4">{tool.description}</p>}

					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Arguments</span>
						<button
							onClick={() => setRaw((r) => !r)}
							className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
						>
							<Code2 className="w-3.5 h-3.5" /> {raw ? 'Form' : 'Raw JSON'}
						</button>
					</div>

					{raw ? (
						<textarea
							className={`${inputCls} font-mono text-xs h-28 mb-3`}
							value={rawText}
							onChange={(e) => setRawText(e.target.value)}
							placeholder='{ "city": "London" }'
						/>
					) : Object.keys(props).length === 0 ? (
						<p className="text-sm text-slate-400 mb-3">This tool takes no arguments.</p>
					) : (
						<div className="space-y-3 mb-4">
							{Object.entries<any>(props).map(([name, schema]) => {
								const isReq = required.includes(name);
								const loc = locationOf[name];
								const type = schema.type || 'string';
								return (
									<div key={name}>
										<label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1">
											<span className="font-mono">{name}</span>
											{isReq && <span className="text-red-500">*</span>}
											{loc && (
												<span className={`px-1.5 py-0.5 rounded text-[10px] ${tagColor[loc] || 'bg-slate-100 text-slate-600'}`}>
													{loc}
												</span>
											)}
											<span className="text-[10px] text-slate-400">{type}</span>
										</label>
										{type === 'boolean' ? (
											<select
												className={inputCls}
												value={values[name] ?? ''}
												onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value === 'true' }))}
											>
												<option value="">—</option>
												<option value="true">true</option>
												<option value="false">false</option>
											</select>
										) : schema.enum ? (
											<select
												className={inputCls}
												value={values[name] ?? ''}
												onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
											>
												<option value="">—</option>
												{schema.enum.map((o: any) => (
													<option key={String(o)} value={String(o)}>
														{String(o)}
													</option>
												))}
											</select>
										) : type === 'object' || type === 'array' ? (
											<textarea
												className={`${inputCls} font-mono text-xs h-28`}
												value={values[name] ?? ''}
												onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
												placeholder={schema.description || '{ ... }  (JSON)'}
											/>
										) : (
											<input
												className={inputCls}
												type={type === 'integer' || type === 'number' ? 'number' : 'text'}
												value={values[name] ?? ''}
												onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
												placeholder={schema.description || ''}
											/>
										)}
										{schema.description && type !== 'object' && type !== 'array' && (
											<p className="text-xs text-slate-400 mt-1">{schema.description}</p>
										)}
									</div>
								);
							})}
						</div>
					)}

					<button
						onClick={() => run('tools/call')}
						disabled={running}
						className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 disabled:opacity-50"
					>
						<Play className="w-4 h-4" />
						{running ? 'Running…' : 'Run tool'}
					</button>

					{result && (
						<div className="mt-4">
							{result.error ? (
								<div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
									{result.error.message || JSON.stringify(result.error)}
								</div>
							) : (
								<>
									{result.result?.isError && (
										<div className="mb-2 text-xs text-amber-600">⚠ The tool returned an error response.</div>
									)}
									<pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto max-h-96">
										{contentText || JSON.stringify(result, null, 2)}
									</pre>
								</>
							)}
						</div>
					)}
				</>
			)}
		</div>
	);
}
