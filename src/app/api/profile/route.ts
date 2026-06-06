import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** GET /api/profile — the signed-in user's profile + org summary. */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name, company_name, avatar_url, created_at')
		.eq('id', user.id)
		.maybeSingle();

	// First org the user belongs to (personal org by default).
	const { data: member } = await supabase
		.from('org_members')
		.select('role, organizations(id, name, slug)')
		.limit(1)
		.maybeSingle();

	const org = (member as any)?.organizations || null;

	// notification_config is added by migration 020; fetch it best-effort so this
	// route keeps working if the migration hasn't been applied yet.
	let notificationConfig: any = {};
	if (org?.id) {
		const { data: nc } = await supabase
			.from('organizations')
			.select('notification_config')
			.eq('id', org.id)
			.maybeSingle();
		notificationConfig = (nc as any)?.notification_config || {};
	}

	return NextResponse.json({
		email: user.email,
		created_at: user.created_at,
		full_name: profile?.full_name || '',
		company_name: profile?.company_name || '',
		avatar_url: profile?.avatar_url || null,
		org: org ? { id: org.id, name: org.name, slug: org.slug } : null,
		notification_config: notificationConfig,
		role: (member as any)?.role || null,
	});
}

/** PATCH /api/profile — update display name / company, and optionally the org name. */
export async function PATCH(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const update: Record<string, any> = {};
	if (typeof body.full_name === 'string') update.full_name = body.full_name.slice(0, 120);
	if (typeof body.company_name === 'string') update.company_name = body.company_name.slice(0, 120);

	if (Object.keys(update).length) {
		const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	}

	if (typeof body.org_name === 'string' && body.org_id) {
		const { error } = await supabase
			.from('organizations')
			.update({ name: body.org_name.slice(0, 120) })
			.eq('id', body.org_id);
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	}

	if (body.notification_config && body.org_id) {
		const nc = body.notification_config;
		const clean = {
			alert_on_error: !!nc.alert_on_error,
			webhook_url: typeof nc.webhook_url === 'string' ? nc.webhook_url.slice(0, 500) : '',
		};
		const { error } = await supabase
			.from('organizations')
			.update({ notification_config: clean })
			.eq('id', body.org_id);
		if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ ok: true });
}
