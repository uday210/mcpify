'use client';

import { useState } from 'react';

const GRADIENTS = [
	'from-cyan-500 to-blue-600',
	'from-violet-500 to-purple-600',
	'from-rose-500 to-pink-600',
	'from-amber-500 to-orange-600',
	'from-emerald-500 to-teal-600',
	'from-indigo-500 to-blue-600',
];

function gradientFor(name: string): string {
	let h = 0;
	for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
	return GRADIENTS[h % GRADIENTS.length];
}

/**
 * App/connector icon: shows the favicon, falling back to a gradient
 * letter-avatar so something always renders even when the icon fails to load.
 */
export default function AppIcon({
	src,
	name,
	size = 40,
	rounded = 'rounded-lg',
}: {
	src?: string | null;
	name: string;
	size?: number;
	rounded?: string;
}) {
	const [failed, setFailed] = useState(false);
	const letter = (name || '?').trim().charAt(0).toUpperCase();

	if (!src || failed) {
		return (
			<div
				className={`${rounded} bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center text-white font-semibold shrink-0`}
				style={{ width: size, height: size, fontSize: size * 0.45 }}
			>
				{letter}
			</div>
		);
	}

	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img
			src={src}
			alt=""
			width={size}
			height={size}
			onError={() => setFailed(true)}
			className={`${rounded} object-contain bg-white border border-slate-100 shrink-0`}
			style={{ width: size, height: size }}
		/>
	);
}
