'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ value, label }: { value: string; label?: string }) {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<button
			onClick={copy}
			className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
			type="button"
		>
			{copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
			{copied ? 'Copied' : label || 'Copy'}
		</button>
	);
}
