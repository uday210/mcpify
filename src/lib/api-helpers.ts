// Small shared helpers for the dashboard management API routes.

/** Returns the first organization id the user belongs to (their personal org). */
export async function getOrgId(supabase: any, userId: string): Promise<string | null> {
	const { data } = await supabase
		.from('org_members')
		.select('org_id')
		.eq('user_id', userId)
		.limit(1)
		.maybeSingle();
	return data?.org_id ?? null;
}

/** URL/MCP-safe slug: lowercase, alphanumeric + dashes. */
export function slugify(input: string): string {
	const s = (input || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40);
	return s || 'server';
}
