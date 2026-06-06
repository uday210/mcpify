import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function ownsServer(supabase: any, id: string): Promise<boolean> {
	const { data } = await supabase.from('mcp_servers').select('id').eq('id', id).maybeSingle();
	return !!data;
}

function normalizeArgs(input: any): Array<{ name: string; required: boolean }> {
	let list: any[] = [];
	if (typeof input === 'string') list = input.split(',').map((s) => ({ name: s.trim() }));
	else if (Array.isArray(input)) list = input;
	return list
		.map((a) => (typeof a === 'string' ? { name: a } : a))
		.filter((a) => a && a.name)
		.map((a) => ({ name: String(a.name).trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40), required: a.required !== false }));
}

/** PATCH /api/servers/:id/prompts/:promptId — update a custom prompt. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; promptId: string }> }) {
	const { id, promptId } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownsServer(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await request.json().catch(() => ({}));
	const update: Record<string, any> = {};
	if (typeof body.name === 'string') update.name = body.name.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60);
	if (typeof body.description === 'string') update.description = body.description.slice(0, 300);
	if (body.arguments !== undefined) update.arguments = normalizeArgs(body.arguments);
	if (typeof body.template === 'string') update.template = body.template;
	if (typeof body.enabled === 'boolean') update.enabled = body.enabled;

	const admin = createAdminClient();
	const { data, error } = await admin
		.from('mcp_prompts')
		.update(update)
		.eq('id', promptId)
		.eq('mcp_server_id', id)
		.select('id, name, description, arguments, template, enabled')
		.single();
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json(data);
}

/** DELETE /api/servers/:id/prompts/:promptId */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; promptId: string }> }) {
	const { id, promptId } = await params;
	const supabase = await createServerSupabaseClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	if (!(await ownsServer(supabase, id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const admin = createAdminClient();
	const { error } = await admin.from('mcp_prompts').delete().eq('id', promptId).eq('mcp_server_id', id);
	if (error) return NextResponse.json({ error: error.message }, { status: 400 });
	return NextResponse.json({ ok: true });
}
