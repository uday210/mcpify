import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { pingConnection } from '@/lib/proxy';

/** POST /api/connections/:id/verify — test that credentials reach the upstream. */
export async function POST(
	_request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: connection } = await supabase
		.from('app_connections')
		.select('*')
		.eq('id', id)
		.maybeSingle();
	if (!connection) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const result = await pingConnection(connection);

	await supabase
		.from('app_connections')
		.update({
			last_verified_at: new Date().toISOString(),
			error_message: result.ok ? null : result.message,
		})
		.eq('id', id);

	return NextResponse.json(result);
}
