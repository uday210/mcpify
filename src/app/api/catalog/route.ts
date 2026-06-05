import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/catalog — seeded catalog apps for the connection wizard. */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const { data, error } = await supabase
		.from('app_definitions')
		.select('id, name, slug, description, logo_url, base_url, auth_type, api_documentation_url, config')
		.eq('is_active', true)
		.order('name');

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	const apps = (data || []).map((a: any) => ({
		id: a.id,
		name: a.name,
		slug: a.slug,
		description: a.description,
		logo_url: a.logo_url,
		base_url: a.base_url,
		auth_type: a.auth_type,
		api_documentation_url: a.api_documentation_url,
		auth_help: a.config?.auth_help || null,
		supports_oauth: !!a.config?.oauth,
	}));
	return NextResponse.json(apps);
}
