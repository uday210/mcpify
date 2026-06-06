'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight } from 'lucide-react';
import { TEMPLATES, type Template } from '@/lib/templates';
import { toast } from '@/components/Toaster';

export default function TemplatesPage() {
	const router = useRouter();
	const [applying, setApplying] = useState<string | null>(null);

	const apply = async (t: Template) => {
		setApplying(t.id);
		try {
			const r = await fetch('/api/templates/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ templateId: t.id }),
			});
			const d = await r.json();
			if (!r.ok) {
				toast(d.error || 'Could not apply template', 'error');
				return;
			}
			toast('Created! Add your credentials to finish.', 'success');
			router.push(`/dashboard/connections/${d.connectionId}`);
		} finally {
			setApplying(null);
		}
	};

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
					<Sparkles className="w-7 h-7 text-cyan-500" />
					Templates
				</h1>
				<p className="text-slate-500 mt-1">
					Spin up a ready-made MCP server in one click. We create the connection and server — you just add your credentials.
				</p>
			</div>

			<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
				{TEMPLATES.map((t) => (
					<div key={t.id} className="group bg-white rounded-2xl border border-slate-200/70 shadow-card overflow-hidden hover:shadow-lift hover:-translate-y-0.5 transition-all flex flex-col">
						<div className={`h-20 bg-gradient-to-br ${t.accent} flex items-center justify-center`}>
							<span className="text-2xl font-bold text-white/95">{t.name.charAt(0)}</span>
						</div>
						<div className="p-5 flex flex-col flex-1">
							<div className="flex items-center justify-between mb-1">
								<h3 className="font-semibold text-slate-900">{t.name}</h3>
								<span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t.category}</span>
							</div>
							<p className="text-sm text-slate-500 flex-1">{t.tagline}</p>
							<button
								onClick={() => apply(t)}
								disabled={applying === t.id}
								className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-medium text-sm hover:shadow-lift transition disabled:opacity-50"
							>
								{applying === t.id ? 'Creating…' : 'Use template'}
								{applying !== t.id && <ArrowRight className="w-4 h-4" />}
							</button>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
