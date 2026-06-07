import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgId } from '@/lib/api-helpers';
import { buildConnectionInsert } from '@/lib/connectors/build';
import { LLM_PROVIDERS, LLM_SLUGS } from '@/lib/llm';

/**
 * GET /api/llm — the supported LLM providers with whether each is connected.
 * Used by Settings → AI and the Playground to pick a brain.
 */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: defs } = await supabase.from('app_definitions').select('id, slug').in('slug', LLM_SLUGS);
	const slugById = new Map((defs || []).map((d: any) => [d.id, d.slug]));

	const { data: conns } = await supabase
		.from('app_connections')
		.select('id, name, app_def_id, is_active')
		.in('app_def_id', (defs || []).map((d: any) => d.id));

	const bySlug = new Map<string, any>();
	for (const c of conns || []) {
		const slug = slugById.get(c.app_def_id);
		if (slug && !bySlug.has(slug)) bySlug.set(slug, c);
	}

	const providers = LLM_PROVIDERS.map((p) => {
		const c = bySlug.get(p.slug);
		return {
			slug: p.slug,
			name: p.name,
			defaultModel: p.defaultModel,
			connected: !!c,
			connectionId: c?.id || null,
			active: c?.is_active ?? false,
		};
	});
	return NextResponse.json({ providers });
}

/** POST /api/llm — connect a provider by API key. Body: { slug, apiKey }. */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const orgId = await getOrgId(supabase, user.id);
	if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const provider = LLM_PROVIDERS.find((p) => p.slug === body.slug);
	if (!provider) return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
	if (!body.apiKey) return NextResponse.json({ error: 'API key is required' }, { status: 400 });

	let built;
	try {
		built = await buildConnectionInsert(supabase, orgId, {
			connectorType: 'catalog',
			appSlug: provider.slug,
			name: provider.name,
			authType: 'bearer',
			credentials: { value: body.apiKey },
			config: {},
		});
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Could not connect' }, { status: 400 });
	}

	const { data, error } = await supabase.from('app_connections').insert(built.insert).select('id').single();
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ connectionId: data.id }, { status: 201 });
}
