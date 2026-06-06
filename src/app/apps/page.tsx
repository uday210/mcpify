import Link from 'next/link';
import { Boxes } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { faviconFor } from '@/lib/favicon';
import { getCatalogConnector } from '@/lib/connectors/catalog';
import AppIcon from '@/components/AppIcon';
import ConnectHero from '@/components/ConnectHero';

export const metadata = {
	title: 'App Catalog — mcpify',
	description: 'Turn any of these cloud apps into an MCP server in seconds.',
};

export default async function AppsPage() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	const { data } = await supabase
		.from('app_definitions')
		.select('name, slug, description, base_url')
		.eq('is_active', true)
		.order('name');

	const apps = (data || []).map((a: any) => ({
		...a,
		logo_url: faviconFor(a.base_url),
		toolCount: getCatalogConnector(a.slug)?.tools.length || 0,
	}));

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="bg-white border-b border-slate-200">
				<div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
							<Boxes className="w-5 h-5 text-white" />
						</div>
						<span className="text-lg font-bold text-slate-900">mcpify</span>
					</Link>
					<div className="flex items-center gap-3 text-sm">
						{user ? (
							<Link href="/dashboard" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
								Go to Dashboard
							</Link>
						) : (
							<>
								<Link href="/auth/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
								<Link href="/auth/signup" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
									Get Started
								</Link>
							</>
						)}
					</div>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-6 py-12">
				<div className="flex flex-col items-center text-center mb-12">
					<ConnectHero />
					<h1 className="text-4xl font-bold text-slate-900 mt-6 mb-3">Connect any app as an MCP server</h1>
					<p className="text-slate-500 max-w-xl">
						{apps.length} built-in apps ready to go — or import any of 2,500+ OpenAPI specs. Pick one to see how to connect.
					</p>
					<Link
						href={user ? '/dashboard/connections/new' : '/auth/signup'}
						className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lift transition"
					>
						{user ? 'New Connection' : 'Start free'}
					</Link>
				</div>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{apps.map((a: any) => (
						<Link
							key={a.slug}
							href={`/apps/${a.slug}`}
							className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-cyan-300 hover:shadow-md transition flex items-start gap-4"
						>
							<AppIcon src={a.logo_url} name={a.name} size={44} />
							<div className="min-w-0">
								<h3 className="font-semibold text-slate-900 group-hover:text-cyan-600 transition">{a.name}</h3>
								<p className="text-sm text-slate-500 line-clamp-2">{a.description}</p>
								<p className="text-xs text-slate-400 mt-2">{a.toolCount} tools</p>
							</div>
						</Link>
					))}
				</div>
			</main>

			<footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
				<Link href="/" className="hover:text-slate-600">mcpify</Link> — the universal MCP server bridge
			</footer>
		</div>
	);
}
