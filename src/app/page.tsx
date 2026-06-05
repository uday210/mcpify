'use client';

import Link from 'next/link';
import { Zap, Shield, Boxes, Code2, Gauge, Plug } from 'lucide-react';

export default function Home() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
			{/* Navigation */}
			<nav className="px-6 py-4 border-b border-slate-700/50">
				<div className="max-w-7xl mx-auto flex justify-between items-center">
					<div className="flex items-center gap-2">
						<Boxes className="w-8 h-8 text-cyan-500" />
						<span className="text-xl font-bold text-white">mcpify</span>
					</div>
					<Link
						href="/auth/login"
						className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
					>
						Get Started
					</Link>
				</div>
			</nav>

			{/* Hero Section */}
			<section className="px-6 py-24 max-w-7xl mx-auto">
				<div className="text-center mb-16">
					<h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
						Connect Any Cloud App as{' '}
						<span className="text-gradient">MCP Server</span>
					</h1>
					<p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
						Transform any cloud application into a Model Context Protocol server
						with a single click. No coding required.
					</p>
					<Link
						href="/auth/signup"
						className="inline-block px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition"
					>
						Start Building →
					</Link>
				</div>

				{/* Features Grid */}
				<div className="grid md:grid-cols-3 gap-6 mt-20">
					{[
						{
							icon: Zap,
							title: 'Instant Bridge',
							description:
								'Connect to any cloud application and instantly expose it as an MCP server',
						},
						{
							icon: Shield,
							title: 'Secure Auth',
							description:
								'OAuth, API keys, and custom authentication - all encrypted and secure',
						},
						{
							icon: Code2,
							title: 'Multiple Protocols',
							description:
								'Support SSE, HTTP streams, and WebSocket transports out of the box',
						},
						{
							icon: Gauge,
							title: 'Real-time Monitoring',
							description:
								'Track usage, errors, and performance of your MCP servers',
						},
						{
							icon: Plug,
							title: 'Easy Integration',
							description:
								'Generated clients for Python, JavaScript, and CLI tools',
						},
						{
							icon: Shield,
							title: 'Enterprise Ready',
							description:
								'Multi-tenant, role-based access, audit logs, and compliance',
						},
					].map((feature, idx) => (
						<div
							key={idx}
							className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 transition"
						>
							<feature.icon className="w-8 h-8 text-cyan-500 mb-4" />
							<h3 className="text-lg font-semibold text-white mb-2">
								{feature.title}
							</h3>
							<p className="text-slate-300 text-sm">{feature.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* How It Works */}
			<section className="px-6 py-24 bg-slate-800/50 border-t border-slate-700">
				<div className="max-w-7xl mx-auto">
					<h2 className="text-4xl font-bold text-white text-center mb-16">
						How It Works
					</h2>
					<div className="grid md:grid-cols-4 gap-8">
						{[
							{ step: '1', title: 'Connect', desc: 'Add your cloud app' },
							{ step: '2', title: 'Configure', desc: 'Set up authentication' },
							{
								step: '3',
								title: 'Generate',
								desc: 'Create MCP server',
							},
							{ step: '4', title: 'Deploy', desc: 'Use anywhere' },
						].map((item, idx) => (
							<div key={idx} className="text-center">
								<div className="w-12 h-12 bg-cyan-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
									{item.step}
								</div>
								<h3 className="text-lg font-semibold text-white mb-2">
									{item.title}
								</h3>
								<p className="text-slate-400">{item.desc}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="px-6 py-24 max-w-7xl mx-auto">
				<div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg p-12 text-center">
					<h2 className="text-3xl font-bold text-white mb-4">
						Ready to build your MCP servers?
					</h2>
					<p className="text-cyan-100 mb-8">
						Join thousands of developers using mcpify to connect their cloud
						apps
					</p>
					<Link
						href="/auth/signup"
						className="inline-block px-8 py-4 bg-white text-cyan-600 rounded-lg font-semibold hover:bg-slate-100 transition"
					>
						Get Started Free →
					</Link>
				</div>
			</section>

			{/* Footer */}
			<footer className="px-6 py-12 border-t border-slate-700 text-center text-slate-400">
				<p>© 2024 mcpify. Build MCP servers for any cloud application.</p>
			</footer>
		</div>
	);
}
