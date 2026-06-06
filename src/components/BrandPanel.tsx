import { Boxes, Check } from 'lucide-react';

const APPS = ['github.com', 'stripe.com', 'notion.so', 'slack.com', 'openai.com', 'anthropic.com', 'cloudflare.com', 'vercel.com'];

/** Left-side marketing panel for the auth pages. */
export default function BrandPanel() {
	return (
		<div className="hidden lg:flex flex-col justify-between w-[45%] max-w-xl bg-slate-950 text-white p-12 relative overflow-hidden">
			<div className="pointer-events-none absolute -top-32 -left-32 w-[480px] h-[480px] bg-cyan-500/20 rounded-full blur-[120px]" />
			<div className="relative">
				<div className="flex items-center gap-2">
					<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
						<Boxes className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl font-bold">mcpify</span>
				</div>
			</div>

			<div className="relative">
				<h2 className="text-3xl font-bold leading-tight mb-5">
					Turn any cloud app into an <span className="text-gradient">MCP server</span>.
				</h2>
				<ul className="space-y-2.5 text-slate-300">
					{['100+ built-in apps, plus 2,500+ via OpenAPI', 'SSE & Streamable HTTP, auth handled', 'Live monitoring built in'].map((t) => (
						<li key={t} className="flex items-center gap-2">
							<Check className="w-4 h-4 text-cyan-400" /> {t}
						</li>
					))}
				</ul>
				<div className="flex flex-wrap gap-2 mt-8">
					{APPS.map((d) => (
						<div key={d} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img src={`https://www.google.com/s2/favicons?sz=64&domain=${d}`} alt="" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
						</div>
					))}
				</div>
			</div>

			<div className="relative text-sm text-slate-500">Inspired by Pipedream MCP · Built with Next.js + Supabase</div>
		</div>
	);
}
