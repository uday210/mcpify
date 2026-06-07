import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** GET /api/servers/:id/approvals?status=pending — list approval requests. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { data: owned } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const status = new URL(request.url).searchParams.get('status') || 'pending';
	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_approvals')
		.select('id, tool_name, args, status, client_ip, created_at')
		.eq('mcp_server_id', id)
		.eq('status', status)
		.order('created_at', { ascending: false })
		.limit(50);
	if (error) return NextResponse.json([]); // not migrated yet
	return NextResponse.json(data || []);
}
