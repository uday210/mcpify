import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** POST /api/servers/:id/approvals/:approvalId — { decision: 'approved'|'denied' } */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; approvalId: string }> }) {
	const { id, approvalId } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { data: owned } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const decision = body.decision === 'approved' ? 'approved' : body.decision === 'denied' ? 'denied' : null;
	if (!decision) return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });

	const admin = createAdminClient();
	const { error } = await admin
		.from('mcp_approvals')
		.update({ status: decision, decided_at: new Date().toISOString() })
		.eq('id', approvalId)
		.eq('mcp_server_id', id)
		.eq('status', 'pending');
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
