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
		.select('method, resource, status_code, duration_ms, error_message, client_ip, created_at, request_body, response_body, mcp_servers(name, slug)')
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
		request_body: l.request_body ?? null,
		response_body: l.response_body ?? null,
		server_name: l.mcp_servers?.name || '—',
		server_slug: l.mcp_servers?.slug || '',
	}));

	const total = rows.length;
	const errors = rows.filter((r) => (r.status_code || 0) >= 400).length;
	const latencies = rows.map((r) => r.duration_ms || 0).filter((n) => n > 0).sort((a, b) => a - b);
	const avgLatency = latencies.length
		? Math.round(latencies.reduce((s, n) => s + n, 0) / latencies.length)
		: 0;
	const p95Latency = latencies.length
		? latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))]
		: 0;

	// Per-server breakdown.
	const byServerMap = new Map<string, { name: string; slug: string; calls: number; errors: number }>();
	for (const r of rows) {
		const key = r.server_slug || r.server_name;
		const e = byServerMap.get(key) || { name: r.server_name, slug: r.server_slug, calls: 0, errors: 0 };
		e.calls++;
		if ((r.status_code || 0) >= 400) e.errors++;
		byServerMap.set(key, e);
	}
	const byServer = [...byServerMap.values()].sort((a, b) => b.calls - a.calls);

	// Top tools (by resource name).
	const toolMap = new Map<string, { name: string; calls: number; errors: number }>();
	for (const r of rows) {
		if (!r.resource) continue;
		const e = toolMap.get(r.resource) || { name: r.resource, calls: 0, errors: 0 };
		e.calls++;
		if ((r.status_code || 0) >= 400) e.errors++;
		toolMap.set(r.resource, e);
	}
	const topTools = [...toolMap.values()].sort((a, b) => b.calls - a.calls).slice(0, 8);

	return NextResponse.json({
		rows,
		byServer,
		topTools,
		stats: {
			total,
			errors,
			errorRate: total ? Math.round((errors / total) * 100) : 0,
			successRate: total ? Math.round(((total - errors) / total) * 100) : 100,
			avgLatency,
			p95Latency,
			servers: byServer.length,
		},
	});
}
