import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrgId } from '@/lib/api-helpers';
import { buildConnectionInsert } from '@/lib/connectors/build';
import { pingConnection } from '@/lib/proxy';

/**
 * POST /api/connections/test — dry-run a connection's credentials WITHOUT
 * saving it. Builds the same insert payload the create route would, then pings
 * the upstream. OAuth (authorization-code) can't be tested before the flow runs.
 */
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

	if (body.authType === 'oauth') {
		return NextResponse.json({
			ok: false,
			skipped: true,
			status: 0,
			message: 'OAuth connections are tested after you authorize. Save and connect first.',
		});
	}

	let built;
	try {
		built = await buildConnectionInsert(supabase, orgId, { ...body, name: body.name || 'test' });
	} catch (err: any) {
		return NextResponse.json({ ok: false, status: 0, message: err?.message || 'Invalid connection' }, { status: 400 });
	}

	// pingConnection reads base_url / auth_type / credentials / config off the record.
	const result = await pingConnection(built.insert);
	return NextResponse.json(result);
}
