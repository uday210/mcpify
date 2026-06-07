'use client';

import { useEffect, useState } from 'react';
import { Workflow, Plus, Trash2, X } from 'lucide-react';
import { toast } from '@/components/Toaster';

interface Tool {
	id: string;
	name: string;
	description: string | null;
	composite_steps?: any[] | null;
}
interface StepDraft {
	tool: string;
	argsText: string;
}

export default function ServerComposite({ serverId }: { serverId: string }) {
	const [tools, setTools] = useState<Tool[]>([]);
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [args, setArgs] = useState('');
	const [steps, setSteps] = useState<StepDraft[]>([{ tool: '', argsText: '{}' }]);
	const [saving, setSaving] = useState(false);

	const load = () =>
		fetch(`/api/servers/${serverId}/tools`)
			.then((r) => r.json())
			.then((d) => setTools(Array.isArray(d) ? d : []))
			.catch(() => {});

	useEffect(() => {
		load();
	}, [serverId]);

	const base = tools.filter((t) => !t.composite_steps);
	const composites = tools.filter((t) => Array.isArray(t.composite_steps) && t.composite_steps.length);

	const reset = () => {
		setName('');
		setDescription('');
		setArgs('');
		setSteps([{ tool: '', argsText: '{}' }]);
		setOpen(false);
	};

	const save = async () => {
		if (!name.trim()) return toast('Name is required', 'error');
		const parsedSteps: any[] = [];
		for (const s of steps) {
			if (!s.tool) continue;
			let a: any = {};
			try {
				a = s.argsText.trim() ? JSON.parse(s.argsText) : {};
			} catch {
				return toast(`Step "${s.tool}" args are not valid JSON`, 'error');
			}
			parsedSteps.push({ tool: s.tool, args: a });
		}
		if (!parsedSteps.length) return toast('Add at least one step', 'error');

		setSaving(true);
		const r = await fetch(`/api/servers/${serverId}/tools`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, description, arguments: args, steps: parsedSteps }),
		});
		const d = await r.json();
		setSaving(false);
		if (!r.ok) return toast(d.error || 'Could not create', 'error');
		toast('Composite tool created', 'success');
		reset();
		load();
	};

	const removeComposite = async (t: Tool) => {
		if (!confirm(`Delete composite tool "${t.name}"?`)) return;
		await fetch(`/api/servers/${serverId}/tools/${t.id}`, { method: 'DELETE' });
		toast('Deleted', 'success');
		load();
	};

	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-6">
			<div className="flex items-center justify-between mb-2">
				<h2 className="font-semibold text-slate-900 flex items-center gap-2">
					<Workflow className="w-4 h-4 text-slate-400" />
					Composite tools ({composites.length})
				</h2>
				{!open && (
					<button onClick={() => setOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition">
						<Plus className="w-3.5 h-3.5" /> New composite
					</button>
				)}
			</div>
			<p className="text-xs text-slate-400 mb-4">
				One tool that runs several others in sequence. In a step&apos;s args JSON, reference{' '}
				<code className="bg-slate-100 px-1 rounded">{'{{input.x}}'}</code> (this tool&apos;s inputs) and{' '}
				<code className="bg-slate-100 px-1 rounded">{'{{step1.field.path}}'}</code> (an earlier step&apos;s JSON result).
			</p>

			{open && (
				<div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3 bg-slate-50/50">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-slate-700">New composite tool</h3>
						<button onClick={reset} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<input value={name} onChange={(e) => setName(e.target.value)} placeholder="name (e.g. create_and_label)" className="px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-cyan-400 font-mono" />
						<input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="arguments: title, body" className="px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-cyan-400" />
					</div>
					<input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="description" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-cyan-400" />

					<div className="space-y-2">
						{steps.map((s, i) => (
							<div key={i} className="border border-slate-200 rounded-lg p-3 bg-white">
								<div className="flex items-center gap-2 mb-2">
									<span className="text-xs font-semibold text-slate-500 w-12">Step {i + 1}</span>
									<select value={s.tool} onChange={(e) => setSteps((st) => st.map((x, j) => (j === i ? { ...x, tool: e.target.value } : x)))} className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 outline-none focus:border-cyan-400">
										<option value="">Select a tool…</option>
										{base.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
									</select>
									{steps.length > 1 && (
										<button onClick={() => setSteps((st) => st.filter((_, j) => j !== i))} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
									)}
								</div>
								<textarea value={s.argsText} onChange={(e) => setSteps((st) => st.map((x, j) => (j === i ? { ...x, argsText: e.target.value } : x)))} rows={3} placeholder={'{ "title": "{{input.title}}", "id": "{{step1.id}}" }'} className="w-full px-2 py-1.5 text-xs font-mono rounded-lg border border-slate-200 outline-none focus:border-cyan-400" />
							</div>
						))}
						<button onClick={() => setSteps((st) => [...st, { tool: '', argsText: '{}' }])} className="text-sm text-cyan-600 hover:text-cyan-700 flex items-center gap-1">
							<Plus className="w-3.5 h-3.5" /> Add step
						</button>
					</div>

					<button onClick={save} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50">
						{saving ? 'Creating…' : 'Create composite tool'}
					</button>
				</div>
			)}

			{composites.length === 0 && !open ? (
				<p className="text-sm text-slate-400">No composite tools yet.</p>
			) : (
				<div className="divide-y">
					{composites.map((t) => (
						<div key={t.id} className="py-3 flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="text-sm font-mono font-medium text-slate-800">{t.name}</div>
								{t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
								<p className="text-xs text-slate-400 mt-1">{t.composite_steps!.length} steps: {t.composite_steps!.map((s: any) => s.tool).join(' → ')}</p>
							</div>
							<button onClick={() => removeComposite(t)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"><Trash2 className="w-4 h-4" /></button>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
