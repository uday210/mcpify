import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** DELETE /api/servers/:id/tools/:toolId — remove a tool (e.g. a composite). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; toolId: string }> }) {
	const { id, toolId } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	const { data: owned } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const { error } = await admin.from('mcp_tools').delete().eq('id', toolId).eq('mcp_server_id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
