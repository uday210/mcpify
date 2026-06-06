'use client';

import { Boxes } from 'lucide-react';

const OUTER = ['github.com', 'stripe.com', 'notion.so', 'slack.com', 'openai.com', 'figma.com', 'twilio.com', 'cloudflare.com'];
const INNER = ['anthropic.com', 'vercel.com', 'airtable.com', 'hubspot.com', 'gmail.com', 'spotify.com'];

function fav(d: string) {
	return `https://www.google.com/s2/favicons?sz=64&domain=${d}`;
}

function Ring({ apps, radius, anim }: { apps: string[]; radius: number; anim: string }) {
	return (
		<div className={`absolute inset-0 ${anim}`}>
			{apps.map((d, i) => {
				const angle = (360 / apps.length) * i;
				return (
					<div
						key={d}
						className="absolute left-1/2 top-1/2 w-10 h-10 -ml-5 -mt-5"
						style={{ transform: `rotate(${angle}deg) translateY(-${radius}px)` }}
					>
						<div className="w-10 h-10 rounded-xl bg-white shadow-md border border-slate-200 flex items-center justify-center">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={fav(d)} alt="" className="w-5 h-5" />
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function ConnectHero() {
	return (
		<div className="relative w-[320px] h-[320px] mx-auto">
			{/* orbit tracks */}
			<div className="absolute inset-0 rounded-full border border-dashed border-slate-200" />
			<div className="absolute inset-[70px] rounded-full border border-dashed border-slate-200" />

			{/* rotating rings (icons orbit the hub) */}
			<Ring apps={OUTER} radius={150} anim="animate-[spin_32s_linear_infinite]" />
			<Ring apps={INNER} radius={90} anim="animate-[spin_22s_linear_infinite_reverse]" />

			{/* center hub */}
			<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
				<span className="absolute inset-0 -m-2 rounded-2xl bg-cyan-400/30 animate-ping" />
				<span className="absolute inset-0 -m-5 rounded-full bg-cyan-400/10 animate-pulse" />
				<div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex flex-col items-center justify-center shadow-lift">
					<Boxes className="w-8 h-8 text-white" />
					<span className="text-[10px] font-bold text-white/90 mt-0.5">MCP</span>
				</div>
			</div>
		</div>
	);
}
