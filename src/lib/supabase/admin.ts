import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for trusted server-side contexts that are NOT
 * tied to a logged-in user session (the MCP runtime, OAuth callbacks, etc).
 * Bypasses RLS — never expose its results directly to an untrusted caller
 * without checking ownership first.
 */
export function createAdminClient() {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!,
		{ auth: { persistSession: false, autoRefreshToken: false } }
	);
}
