'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';
interface Toast {
	id: number;
	message: string;
	type: ToastType;
}

// Module-level pub/sub so any component can call toast() without context.
let counter = 0;
const listeners = new Set<(t: Toast) => void>();

export function toast(message: string, type: ToastType = 'info') {
	const t = { id: ++counter, message, type };
	listeners.forEach((l) => l(t));
}
toast.success = (m: string) => toast(m, 'success');
toast.error = (m: string) => toast(m, 'error');

export default function Toaster() {
	const [items, setItems] = useState<Toast[]>([]);

	useEffect(() => {
		const onToast = (t: Toast) => {
			setItems((cur) => [...cur, t]);
			setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== t.id)), 4000);
		};
		listeners.add(onToast);
		return () => {
			listeners.delete(onToast);
		};
	}, []);

	const dismiss = (id: number) => setItems((cur) => cur.filter((x) => x.id !== id));

	const icon = (type: ToastType) =>
		type === 'success' ? (
			<CheckCircle2 className="w-5 h-5 text-emerald-500" />
		) : type === 'error' ? (
			<XCircle className="w-5 h-5 text-red-500" />
		) : (
			<Info className="w-5 h-5 text-cyan-500" />
		);

	return (
		<div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-80 max-w-[calc(100vw-2.5rem)]">
			{items.map((t) => (
				<div
					key={t.id}
					className="animate-slide-up flex items-start gap-3 bg-white border border-slate-200 shadow-lg rounded-xl p-3.5"
				>
					{icon(t.type)}
					<p className="text-sm text-slate-700 flex-1">{t.message}</p>
					<button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600">
						<X className="w-4 h-4" />
					</button>
				</div>
			))}
		</div>
	);
}
