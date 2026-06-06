import { NextRequest, NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signState } from '@/lib/oauth';
import { appBaseUrl } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';

function base64url(buf: Buffer): string {
	return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Starts the OAuth 2.0 authorization-code flow for a connection: redirects the
 * user to the provider's authorize URL with a signed state parameter.
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ connectionId: string }> }
) {
	const { connectionId } = await params;

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.redirect(new URL('/auth/login', appBaseUrl(request.url)));

	// RLS ensures the user can only read their own connection.
	const { data: connection } = await supabase
		.from('app_connections')
		.select('*')
		.eq('id', connectionId)
		.maybeSingle();

	if (!connection) {
		return NextResponse.redirect(new URL('/dashboard/connections?error=not_found', appBaseUrl(request.url)));
	}

	const oauth = connection.config?.oauth || {};
	if (!oauth.authorize_url || !oauth.client_id) {
		return NextResponse.redirect(
			new URL('/dashboard/connections?error=oauth_not_configured', appBaseUrl(request.url))
		);
	}

	const appUrl = appBaseUrl(request.url);
	const redirectUri = `${appUrl}/api/oauth/callback`;
	const state = signState({ connectionId });

	const authUrl = new URL(oauth.authorize_url);
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', oauth.client_id);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	if (Array.isArray(oauth.scopes) && oauth.scopes.length) {
		authUrl.searchParams.set('scope', oauth.scopes.join(' '));
	}
	authUrl.searchParams.set('state', state);
	if (oauth.access_type) authUrl.searchParams.set('access_type', oauth.access_type);
	if (oauth.prompt) authUrl.searchParams.set('prompt', oauth.prompt);

	// Provider-specific extra authorize params (e.g. Reddit duration=permanent).
	if (oauth.authorize_params && typeof oauth.authorize_params === 'object') {
		for (const [k, v] of Object.entries(oauth.authorize_params)) authUrl.searchParams.set(k, String(v));
	}

	// PKCE (required by X/Twitter, Xero). Persist the verifier on the connection
	// so the callback can complete the exchange.
	if (oauth.pkce) {
		const verifier = base64url(randomBytes(48));
		const challenge = base64url(createHash('sha256').update(verifier).digest());
		authUrl.searchParams.set('code_challenge', challenge);
		authUrl.searchParams.set('code_challenge_method', 'S256');
		await supabase
			.from('app_connections')
			.update({ config: { ...connection.config, oauth: { ...oauth, pkce_verifier: verifier } } })
			.eq('id', connectionId);
	}

	return NextResponse.redirect(authUrl.toString());
}
