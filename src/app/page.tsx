'use client';

import Link from 'next/link';
import { Zap, Shield, Boxes, Code2, Gauge, Plug, ArrowRight, Check } from 'lucide-react';
import ConnectHero from '@/components/ConnectHero';

const APPS = [
	'github.com', 'stripe.com', 'notion.so', 'slack.com', 'airtable.com', 'hubspot.com',
	'openai.com', 'anthropic.com', 'gitlab.com', 'cloudflare.com', 'vercel.com', 'figma.com',
	'todoist.com', 'asana.com', 'twilio.com', 'discord.com',
];

export default function Home() {
	return (
		<div className="min-h-screen bg-slate-950 text-white overflow-hidden">
			{/* glow */}
			<div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/20 rounded-full blur-[160px]" />

			<div className="relative">
				{/* Nav */}
				<nav className="px-6 py-5 max-w-7xl mx-auto flex justify-between items-center">
					<div className="flex items-center gap-2">
						<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
							<Boxes className="w-5 h-5 text-white" />
						</div>
						<span className="text-xl font-bold">mcpify</span>
					</div>
					<div className="flex items-center gap-3">
						<Link href="/auth/login" className="px-4 py-2 text-slate-300 hover:text-white transition">
							Sign in
						</Link>
						<Link
							href="/auth/signup"
							className="px-4 py-2 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition"
						>
							Get Started
						</Link>
					</div>
				</nav>

				{/* Hero */}
				<section className="px-6 pt-20 pb-16 max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-6">
						<span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
						Turn any API into an MCP server
					</div>
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
						Any cloud app,
						<br />
						<span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 bg-clip-text text-transparent">
							instantly an MCP server
						</span>
					</h1>
					<p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
						Connect a catalog app, an OpenAPI spec, or your own endpoints. mcpify exposes them over SSE
						or Streamable HTTP — auth handled, monitoring built in. Point Claude at the URL and go.
					</p>
					<div className="flex items-center justify-center gap-4">
						<Link
							href="/auth/signup"
							className="group px-7 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition flex items-center gap-2"
						>
							Start building free
							<ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
						</Link>
						<a
							href="https://github.com/uday210/mcpify"
							target="_blank"
							rel="noreferrer"
							className="px-7 py-3.5 border border-white/15 rounded-xl font-semibold hover:bg-white/5 transition"
						>
							View on GitHub
						</a>
					</div>

					{/* Animated orbit: apps connecting to the MCP hub */}
					<div className="mt-20 flex justify-center">
						<ConnectHero />
					</div>
				</section>

				{/* App logo strip */}
				<section className="px-6 pb-20 max-w-4xl mx-auto">
					<p className="text-center text-sm text-slate-500 mb-6">100+ built-in apps — or import any of 2,500+ OpenAPI specs</p>
					<div className="flex flex-wrap justify-center gap-3">
						{APPS.map((d) => (
							<div
								key={d}
								className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
							>
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img src={`https://www.google.com/s2/favicons?sz=64&domain=${d}`} alt="" className="w-6 h-6" />
							</div>
						))}
					</div>
				</section>

				{/* Features */}
				<section className="px-6 py-16 max-w-6xl mx-auto">
					<div className="grid md:grid-cols-3 gap-5">
						{[
							{ icon: Plug, title: '3 ways to connect', desc: 'Pick a catalog app, import an OpenAPI/Swagger spec, or define endpoints by hand.' },
							{ icon: Shield, title: 'Auth handled', desc: 'API key, Bearer, Basic, custom headers, and full OAuth 2.0 — encrypted at rest.' },
							{ icon: Code2, title: 'SSE + Streamable HTTP', desc: 'Standards-compliant JSON-RPC 2.0. Works with Claude, Cursor, VS Code, ChatGPT.' },
							{ icon: Boxes, title: 'One server, all apps', desc: 'Aggregate every connection into a single MCP endpoint — or keep them separate.' },
							{ icon: Gauge, title: 'Live monitoring', desc: 'Watch incoming calls, latency, and errors in real time per server.' },
							{ icon: Zap, title: 'No code', desc: 'Generate a server in seconds and get a ready-to-paste client config.' },
						].map((f, i) => (
							<div
								key={i}
								className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.05] transition"
							>
								<div className="w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/20 flex items-center justify-center mb-4">
									<f.icon className="w-5 h-5 text-cyan-400" />
								</div>
								<h3 className="text-lg font-semibold mb-1.5">{f.title}</h3>
								<p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
							</div>
						))}
					</div>
				</section>

				{/* How it works */}
				<section className="px-6 py-16 max-w-5xl mx-auto">
					<h2 className="text-3xl font-bold text-center mb-12">From API to MCP in 4 steps</h2>
					<div className="grid md:grid-cols-4 gap-6">
						{[
							{ n: '1', t: 'Connect', d: 'Add a cloud app' },
							{ n: '2', t: 'Authorize', d: 'Drop in a key or OAuth' },
							{ n: '3', t: 'Generate', d: 'Pick tools + transport' },
							{ n: '4', t: 'Use anywhere', d: 'Paste into your AI client' },
						].map((s) => (
							<div key={s.n} className="text-center">
								<div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-lg">
									{s.n}
								</div>
								<h3 className="font-semibold mb-1">{s.t}</h3>
								<p className="text-slate-400 text-sm">{s.d}</p>
							</div>
						))}
					</div>
				</section>

				{/* CTA */}
				<section className="px-6 py-20 max-w-4xl mx-auto">
					<div className="rounded-3xl bg-gradient-to-br from-cyan-500/10 to-blue-600/10 border border-white/10 p-12 text-center">
						<h2 className="text-3xl md:text-4xl font-bold mb-4">Ship your first MCP server today</h2>
						<p className="text-slate-400 mb-8 max-w-xl mx-auto">
							Free to start. No code. Works with every MCP-compatible assistant.
						</p>
						<div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-300 mb-8">
							{['No credit card', 'OpenAPI import', 'Real-time monitoring'].map((b) => (
								<span key={b} className="flex items-center gap-1.5">
									<Check className="w-4 h-4 text-cyan-400" /> {b}
								</span>
							))}
						</div>
						<Link
							href="/auth/signup"
							className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-900 rounded-xl font-semibold hover:bg-slate-100 transition"
						>
							Get Started Free
							<ArrowRight className="w-4 h-4" />
						</Link>
					</div>
				</section>

				<footer className="px-6 py-10 border-t border-white/10 text-center text-slate-500 text-sm">
					<p>mcpify — the universal MCP server bridge. Built with Next.js + Supabase.</p>
				</footer>
			</div>
		</div>
	);
}
