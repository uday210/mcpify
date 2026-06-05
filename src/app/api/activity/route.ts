import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/activity — recent MCP calls across all of the user's servers, with
 * server names and aggregate stats. RLS scopes mcp_access_logs to the user.
 */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const { data: logs, error } = await supabase
		.from('mcp_access_logs')
		.select('method, resource, status_code, duration_ms, error_message, client_ip, created_at, mcp_servers(name, slug)')
		.order('created_at', { ascending: false })
		.limit(200);

	if (error) return NextResponse.json({ error: error.message }, { status: 400 });

	const rows = (logs || []).map((l: any) => ({
		method: l.method,
		resource: l.resource,
		status_code: l.status_code,
		duration_ms: l.duration_ms,
		error_message: l.error_message,
		client_ip: l.client_ip,
		created_at: l.created_at,
		server_name: l.mcp_servers?.name || '—',
		server_slug: l.mcp_servers?.slug || '',
	}));

	const total = rows.length;
	const errors = rows.filter((r) => (r.status_code || 0) >= 400).length;
	const avgLatency = total
		? Math.round(rows.reduce((s, r) => s + (r.duration_ms || 0), 0) / total)
		: 0;

	return NextResponse.json({
		rows,
		stats: { total, errors, errorRate: total ? Math.round((errors / total) * 100) : 0, avgLatency },
	});
}
