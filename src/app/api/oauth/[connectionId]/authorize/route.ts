import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signState } from '@/lib/oauth';

export const runtime = 'nodejs';

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
	if (!user) return NextResponse.redirect(new URL('/auth/login', request.url));

	// RLS ensures the user can only read their own connection.
	const { data: connection } = await supabase
		.from('app_connections')
		.select('*')
		.eq('id', connectionId)
		.maybeSingle();

	if (!connection) {
		return NextResponse.redirect(new URL('/dashboard/connections?error=not_found', request.url));
	}

	const oauth = connection.config?.oauth || {};
	if (!oauth.authorize_url || !oauth.client_id) {
		return NextResponse.redirect(
			new URL('/dashboard/connections?error=oauth_not_configured', request.url)
		);
	}

	const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
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

	return NextResponse.redirect(authUrl.toString());
}
