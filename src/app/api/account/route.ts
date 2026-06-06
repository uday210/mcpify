import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * DELETE /api/account — permanently delete the signed-in user and all data they
 * own. Deleting the auth user cascades to profiles / org_members / organizations
 * (and their connections + servers) via ON DELETE CASCADE.
 */
export async function DELETE() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const admin = createAdminClient();
	const { error } = await admin.auth.admin.deleteUser(user.id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	await supabase.auth.signOut().catch(() => {});
	return NextResponse.json({ ok: true });
}
