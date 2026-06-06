import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** POST /api/notifications/test — send a sample alert to the given webhook URL. */
export async function POST(request: NextRequest) {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	let body: any;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	const url = String(body.webhook_url || '');
	if (!/^https?:\/\//.test(url)) return NextResponse.json({ ok: false, message: 'Enter a valid http(s) URL' }, { status: 400 });

	try {
		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				type: 'mcpify.test',
				message: 'This is a test alert from mcpify.',
				at: new Date().toISOString(),
			}),
		});
		return NextResponse.json({ ok: resp.ok, message: resp.ok ? `Delivered (HTTP ${resp.status})` : `Webhook returned HTTP ${resp.status}` });
	} catch (e: any) {
		return NextResponse.json({ ok: false, message: e?.message || 'Could not reach webhook' });
	}
}
