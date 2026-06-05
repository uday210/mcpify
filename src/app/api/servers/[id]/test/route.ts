import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { handleRpc } from '@/lib/mcp/runtime';

/**
 * POST /api/servers/:id/test — in-dashboard test console. Verifies ownership
 * via the user's session, then runs a JSON-RPC method (tools/list or
 * tools/call) through the same runtime an external MCP client would hit.
 * Body: { method: 'tools/list' } | { method: 'tools/call', name, arguments }
 */
export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	// Ownership check (RLS-scoped).
	const { data: owned } = await supabase
		.from('mcp_servers')
		.select('id')
		.eq('id', id)
		.maybeSingle();
	if (!owned) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json();
	const method = body.method || 'tools/list';

	// Load server + connection (with credentials) via admin for execution.
	const admin = createAdminClient();
	const { data: server } = await admin
		.from('mcp_servers')
		.select('*, app_connections(*)')
		.eq('id', id)
		.maybeSingle();
	if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const authed = { server, connection: (server as any).app_connections };
	const rpc =
		method === 'tools/call'
			? { jsonrpc: '2.0' as const, id: 1, method, params: { name: body.name, arguments: body.arguments || {} } }
			: { jsonrpc: '2.0' as const, id: 1, method: 'tools/list' };

	const result = await handleRpc(authed, rpc);
	return NextResponse.json(result);
}
