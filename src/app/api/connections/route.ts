import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgId } from '@/lib/api-helpers';
import { buildConnectionInsert } from '@/lib/connectors/build';
import { faviconFor } from '@/lib/favicon';

/** GET /api/connections — list the user's connections (with app definition). */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data, error } = await supabase
		.from('app_connections')
		.select('id, name, auth_type, connector_type, base_url, is_active, last_verified_at, error_message, config, app_def_id, created_at, app_definitions(logo_url)')
		.order('created_at', { ascending: false });

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	// Strip secrets; expose only tool count + safe config fields.
	const safe = (data || []).map((c: any) => ({
		...c,
		toolCount: Array.isArray(c.config?.tools) ? c.config.tools.length : 0,
		logo_url: faviconFor(c.base_url) || c.app_definitions?.logo_url || null,
		config: undefined,
		app_definitions: undefined,
	}));
	return NextResponse.json(safe);
}

/** POST /api/connections — create a connection (catalog | openapi | manual). */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const orgId = await getOrgId(supabase, user.id);
	if (!orgId) return NextResponse.json({ error: 'No organization found' }, { status: 404 });

	let body: any;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

	let built;
	try {
		built = await buildConnectionInsert(supabase, orgId, body);
	} catch (err: any) {
		return NextResponse.json({ error: err?.message || 'Invalid connection' }, { status: 400 });
	}

	const { data, error } = await supabase
		.from('app_connections')
		.insert(built.insert)
		.select('id, name, auth_type, connector_type, base_url, is_active')
		.single();

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ...data, toolCount: built.toolCount }, { status: 201 });
}
