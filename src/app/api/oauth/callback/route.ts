import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyState } from '@/lib/oauth';
import { encryptCredentials, decryptCredentials } from '@/lib/encryption';
import { appBaseUrl } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';

/**
 * OAuth 2.0 redirect handler: verifies the signed state, exchanges the code for
 * tokens at the provider token endpoint, and stores the (encrypted) tokens on
 * the connection. Uses the admin client because the provider redirect is not
 * guaranteed to carry the user's session cookies — trust is established by the
 * HMAC-signed state instead.
 */
export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const code = url.searchParams.get('code');
	const stateRaw = url.searchParams.get('state');
	const providerError = url.searchParams.get('error');

	const connectionsUrl = new URL('/dashboard/connections', appBaseUrl(request.url));

	if (providerError) {
		connectionsUrl.searchParams.set('error', providerError);
		return NextResponse.redirect(connectionsUrl);
	}

	const state = stateRaw ? verifyState(stateRaw) : null;
	if (!code || !state?.connectionId) {
		connectionsUrl.searchParams.set('error', 'invalid_state');
		return NextResponse.redirect(connectionsUrl);
	}

	const admin = createAdminClient();
	const { data: connection } = await admin
		.from('app_connections')
		.select('*')
		.eq('id', state.connectionId)
		.maybeSingle();

	if (!connection) {
		connectionsUrl.searchParams.set('error', 'not_found');
		return NextResponse.redirect(connectionsUrl);
	}

	const oauth = connection.config?.oauth || {};
	const clientSecret = oauth.client_secret
		? safeDecryptValue(oauth.client_secret)
		: undefined;
	const appUrl = appBaseUrl(request.url);

	const tokenParams = new URLSearchParams({
		grant_type: 'authorization_code',
		code,
		client_id: oauth.client_id || '',
		redirect_uri: `${appUrl}/api/oauth/callback`,
	});
	if (clientSecret) tokenParams.set('client_secret', clientSecret);

	try {
		const resp = await fetch(oauth.token_url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json',
			},
			body: tokenParams.toString(),
		});
		const tokens = await resp.json();

		if (!resp.ok || !tokens.access_token) {
			connectionsUrl.searchParams.set('error', 'token_exchange_failed');
			return NextResponse.redirect(connectionsUrl);
		}

		const update: Record<string, any> = {
			oauth_token: encryptCredentials({ value: tokens.access_token }),
			is_active: true,
			last_verified_at: new Date().toISOString(),
			error_message: null,
		};
		if (tokens.refresh_token) {
			update.oauth_refresh_token = encryptCredentials({ value: tokens.refresh_token });
		}
		if (tokens.expires_in) {
			update.oauth_expires_at = new Date(
				Date.now() + Number(tokens.expires_in) * 1000
			).toISOString();
		}

		await admin.from('app_connections').update(update).eq('id', connection.id);

		connectionsUrl.searchParams.set('connected', connection.id);
		return NextResponse.redirect(connectionsUrl);
	} catch {
		connectionsUrl.searchParams.set('error', 'token_exchange_failed');
		return NextResponse.redirect(connectionsUrl);
	}
}

function safeDecryptValue(hex: string): string | undefined {
	try {
		return decryptCredentials(hex).value;
	} catch {
		return undefined;
	}
}
