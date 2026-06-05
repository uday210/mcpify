import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Boxes, ArrowLeft, ExternalLink } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { faviconFor } from '@/lib/favicon';
import { getCatalogConnector } from '@/lib/connectors/catalog';
import AppIcon from '@/components/AppIcon';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const supabase = await createServerSupabaseClient();
	const { data } = await supabase.from('app_definitions').select('name, description').eq('slug', slug).maybeSingle();
	if (!data) return { title: 'App — mcpify' };
	return { title: `${data.name} MCP server — mcpify`, description: data.description };
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: app } = await supabase
		.from('app_definitions')
		.select('name, slug, description, base_url, auth_type, api_documentation_url, config')
		.eq('slug', slug)
		.maybeSingle();

	if (!app) notFound();

	const connector = getCatalogConnector(slug);
	const tools = connector?.tools || [];
	const logo = faviconFor(app.base_url);
	const authHelp = (app.config as any)?.auth_help;

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="bg-white border-b border-slate-200">
				<div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
					<Link href="/" className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
							<Boxes className="w-5 h-5 text-white" />
						</div>
						<span className="text-lg font-bold text-slate-900">mcpify</span>
					</Link>
					<Link href="/auth/signup" className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm">
						Get Started
					</Link>
				</div>
			</header>

			<main className="max-w-4xl mx-auto px-6 py-10">
				<Link href="/apps" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
					<ArrowLeft className="w-4 h-4" /> All apps
				</Link>

				<div className="flex items-start gap-5 mb-8">
					<AppIcon src={logo} name={app.name} size={64} rounded="rounded-2xl" />
					<div>
						<h1 className="text-3xl font-bold text-slate-900">{app.name}</h1>
						<p className="text-slate-500 mt-1">{app.description}</p>
						<div className="flex items-center gap-2 mt-3">
							<span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">{app.auth_type}</span>
							<span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">{tools.length} tools</span>
						</div>
					</div>
				</div>

				<div className="grid md:grid-cols-2 gap-6">
					<div className="bg-white rounded-xl border border-slate-200 p-6">
						<h2 className="font-semibold text-slate-900 mb-2">How to connect</h2>
						<p className="text-sm text-slate-600">{authHelp || 'Add your credentials in mcpify and create a server.'}</p>
						{app.api_documentation_url && (
							<a
								href={app.api_documentation_url}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1 text-sm text-cyan-600 hover:text-cyan-700 mt-3"
							>
								Official API docs <ExternalLink className="w-3.5 h-3.5" />
							</a>
						)}
						<div className="mt-5">
							<Link
								href={`/dashboard/connections/new?app=${slug}`}
								className="inline-block px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
							>
								Connect {app.name} →
							</Link>
						</div>
					</div>

					<div className="bg-white rounded-xl border border-slate-200 p-6">
						<h2 className="font-semibold text-slate-900 mb-3">Available tools</h2>
						<div className="space-y-2">
							{tools.map((t) => (
								<div key={t.name} className="flex items-start gap-2">
									<span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 shrink-0">
										{t.http_method}
									</span>
									<div className="min-w-0">
										<div className="text-sm font-mono text-slate-800">{t.name}</div>
										<div className="text-xs text-slate-500">{t.description}</div>
									</div>
								</div>
							))}
							{tools.length === 0 && (
								<p className="text-sm text-slate-400">Tools are generated when you connect.</p>
							)}
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
