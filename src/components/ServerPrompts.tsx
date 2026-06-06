'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, X, MessageSquareText } from 'lucide-react';
import { toast } from '@/components/Toaster';

interface Prompt {
	id: string;
	name: string;
	description: string | null;
	arguments: Array<{ name: string; required?: boolean }>;
	template: string;
	enabled: boolean;
}

const blank = { name: '', description: '', args: '', template: '' };

export default function ServerPrompts({ serverId }: { serverId: string }) {
	const [prompts, setPrompts] = useState<Prompt[]>([]);
	const [open, setOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	const [form, setForm] = useState({ ...blank });
	const [saving, setSaving] = useState(false);

	const load = () =>
		fetch(`/api/servers/${serverId}/prompts`)
			.then((r) => r.json())
			.then((d) => setPrompts(Array.isArray(d) ? d : []))
			.catch(() => setPrompts([]));

	useEffect(() => {
		load();
	}, [serverId]);

	const startNew = () => {
		setEditingId(null);
		setForm({ ...blank });
		setOpen(true);
	};
	const startEdit = (p: Prompt) => {
		setEditingId(p.id);
		setForm({
			name: p.name,
			description: p.description || '',
			args: (p.arguments || []).map((a) => a.name).join(', '),
			template: p.template || '',
		});
		setOpen(true);
	};

	const save = async () => {
		if (!form.name.trim()) return toast('Name is required', 'error');
		setSaving(true);
		const payload = { name: form.name, description: form.description, arguments: form.args, template: form.template };
		const url = editingId ? `/api/servers/${serverId}/prompts/${editingId}` : `/api/servers/${serverId}/prompts`;
		const r = await fetch(url, {
			method: editingId ? 'PATCH' : 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});
		const d = await r.json();
		setSaving(false);
		if (!r.ok) return toast(d.error || 'Could not save prompt', 'error');
		toast(editingId ? 'Prompt updated' : 'Prompt added', 'success');
		setOpen(false);
		setForm({ ...blank });
		setEditingId(null);
		load();
	};

	const remove = async (p: Prompt) => {
		if (!confirm(`Delete prompt "${p.name}"?`)) return;
		await fetch(`/api/servers/${serverId}/prompts/${p.id}`, { method: 'DELETE' });
		toast('Prompt deleted', 'success');
		load();
	};

	const detectedArgs = Array.from(form.template.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)).map((m) => m[1]);

	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-6">
			<div className="flex items-center justify-between mb-2">
				<h2 className="font-semibold text-slate-900 flex items-center gap-2">
					<MessageSquareText className="w-4 h-4 text-slate-400" />
					Prompts ({prompts.length})
				</h2>
				{!open && (
					<button onClick={startNew} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition">
						<Plus className="w-3.5 h-3.5" />
						Add prompt
					</button>
				)}
			</div>
			<p className="text-xs text-slate-400 mb-4">
				Reusable prompt templates exposed to MCP clients (they appear as slash-command prompts). Use{' '}
				<code className="bg-slate-100 px-1 rounded">{'{{argument}}'}</code> placeholders for inputs the client fills in.
			</p>

			{open && (
				<div className="border border-slate-200 rounded-xl p-4 mb-4 space-y-3 bg-slate-50/50">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-semibold text-slate-700">{editingId ? 'Edit prompt' : 'New prompt'}</h3>
						<button onClick={() => { setOpen(false); setEditingId(null); }} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="block text-xs font-medium text-slate-500 mb-1">Name</label>
							<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="triage_issue" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none font-mono" />
						</div>
						<div>
							<label className="block text-xs font-medium text-slate-500 mb-1">Arguments (comma-separated)</label>
							<input value={form.args} onChange={(e) => setForm({ ...form, args: e.target.value })} placeholder="issue_url, priority" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none" />
						</div>
					</div>
					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
						<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Triage a GitHub issue and suggest labels" className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none" />
					</div>
					<div>
						<label className="block text-xs font-medium text-slate-500 mb-1">Template</label>
						<textarea value={form.template} onChange={(e) => setForm({ ...form, template: e.target.value })} rows={5} placeholder={'Read the issue at {{issue_url}} and propose a priority and labels.'} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none font-mono" />
						{detectedArgs.length > 0 && (
							<p className="text-xs text-slate-400 mt-1">Detected placeholders: {detectedArgs.map((a) => <code key={a} className="bg-slate-100 px-1 rounded mr-1">{a}</code>)}</p>
						)}
					</div>
					<button onClick={save} disabled={saving} className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50">
						{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add prompt'}
					</button>
				</div>
			)}

			{prompts.length === 0 && !open ? (
				<p className="text-sm text-slate-400">No custom prompts yet. (Clients still get built-in <code className="bg-slate-100 px-1 rounded">getting_started</code> and <code className="bg-slate-100 px-1 rounded">run_tool</code> prompts.)</p>
			) : (
				<div className="divide-y">
					{prompts.map((p) => (
						<div key={p.id} className="py-3 flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="text-sm font-mono font-medium text-slate-800">{p.name}</span>
									{(p.arguments || []).map((a) => (
										<span key={a.name} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{a.name}</span>
									))}
								</div>
								{p.description && <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>}
								<p className="text-xs text-slate-400 mt-1 font-mono line-clamp-2 whitespace-pre-wrap">{p.template}</p>
							</div>
							<div className="flex items-center gap-1 shrink-0">
								<button onClick={() => startEdit(p)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition" title="Edit"><Pencil className="w-4 h-4" /></button>
								<button onClick={() => remove(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
