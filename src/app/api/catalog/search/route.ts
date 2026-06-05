import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { faviconFor } from '@/lib/favicon';
import { getCatalogConnector } from '@/lib/connectors/catalog';
import { searchExternalApps } from '@/lib/connectors/apisguru';

export const runtime = 'nodejs';

/**
 * GET /api/catalog/search?q= — curated catalog matches + external (APIs.guru)
 * matches. External apps are imported via the OpenAPI connector on selection.
 */
export async function GET(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const q = (new URL(request.url).searchParams.get('q') || '').toLowerCase().trim();

	// Curated catalog (our hand-built connectors).
	const { data: defs } = await supabase
		.from('app_definitions')
		.select('name, slug, description, base_url, auth_type, api_documentation_url, config')
		.eq('is_active', true)
		.order('name');
	const curated = (defs || [])
		.filter((a: any) => !q || (a.name + ' ' + a.description).toLowerCase().includes(q))
		.map((a: any) => {
			const tools = (getCatalogConnector(a.slug)?.tools || []).map((t) => ({ name: t.name, description: t.description }));
			return {
				slug: a.slug,
				name: a.name,
				description: a.description,
				logo_url: faviconFor(a.base_url),
				base_url: a.base_url,
				auth_type: a.auth_type,
				auth_help: a.config?.auth_help || null,
				api_documentation_url: a.api_documentation_url,
				supports_oauth: !!a.config?.oauth,
				tools,
				toolCount: tools.length,
				source: 'curated' as const,
			};
		});

	// External APIs.guru directory (only when searching, to keep it focused).
	let external: any[] = [];
	if (q.length >= 2) {
		try {
			const apps = await searchExternalApps(q, 30);
			external = apps.map((a) => ({
				slug: a.slug,
				name: a.name,
				description: a.description,
				logo_url: a.logo_url || faviconFor(`https://${a.provider}`),
				provider: a.provider,
				swaggerUrl: a.swaggerUrl,
				source: 'external' as const,
			}));
		} catch {
			external = [];
		}
	}

	return NextResponse.json({ curated, external });
}
