import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Verify the server belongs to the caller (RLS), returning true/false. */
async function ownsServer(supabase: any, id: string): Promise<boolean> {
	const { data } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	return !!data;
}

/** Normalize an `arguments` input (csv string or array) to the stored shape. */
function normalizeArgs(input: any): Array<{ name: string; required: boolean }> {
	let list: any[] = [];
	if (typeof input === 'string') list = input.split(',').map((s) => ({ name: s.trim() }));
	else if (Array.isArray(input)) list = input;
	return list
		.map((a) => (typeof a === 'string' ? { name: a } : a))
		.filter((a) => a && a.name)
		.map((a) => ({ name: String(a.name).trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40), required: a.required !== false }));
}

/** GET /api/servers/:id/prompts — list custom prompts for a server. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownsServer(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_prompts')
		.select('id, name, description, arguments, template, enabled')
		.eq('mcp_server_id', id)
		.order('name');
	if (error) return NextResponse.json([]); // table not migrated yet — degrade gracefully
	return NextResponse.json(data || []);
}

/** POST /api/servers/:id/prompts — create a custom prompt. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownsServer(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const name = String(body.name || '').trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
	if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_prompts')
		.insert({
			mcp_server_id: id,
			name,
			description: (body.description || '').slice(0, 300) || null,
			arguments: normalizeArgs(body.arguments),
			template: String(body.template || ''),
			enabled: body.enabled !== false,
		})
		.select('id, name, description, arguments, template, enabled')
		.single();

	if (error) {
		const msg = /relation .*mcp_prompts.* does not exist/i.test(error.message)
			? 'Custom prompts need migration 021. Run it in your Supabase SQL editor.'
			: error.message;
		return NextResponse.json({ error: msg }, { status: 400 });
	}
	return NextResponse.json(data, { status: 201 });
}
