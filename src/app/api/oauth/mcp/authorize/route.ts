import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { signToken } from '@/lib/oauth';
import { slugFromResource } from '@/lib/mcp-oauth';

export const runtime = 'nodejs';

/**
 * Authorization endpoint (authorization_code + PKCE). Requires the mcpify
 * owner to be signed in and to own the target server, then shows a consent
 * screen. On approval it issues a signed code bound to the redirect_uri and
 * PKCE challenge.
 */
export async function GET(request: NextRequest) {
	const url = new URL(request.url);
	const p = url.searchParams;
	const clientId = p.get('client_id') || '';
	const redirectUri = p.get('redirect_uri') || '';
	const codeChallenge = p.get('code_challenge') || '';
	const state = p.get('state') || '';
	const resource = p.get('resource') || p.get('aud') || '';
	const approve = p.get('approve');

	const slug = slugFromResource(resource) || p.get('slug');
	if (!redirectUri || !codeChallenge || !slug) {
		return html('Invalid request: missing redirect_uri, code_challenge, or resource.', 400);
	}

	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		// Bounce through login, then return to this exact authorize URL.
		const login = new URL('/auth/login', url.origin);
		login.searchParams.set('redirect', url.pathname + url.search);
		return NextResponse.redirect(login);
	}

	// Ownership check (RLS scopes mcp_servers to the user's orgs).
	const { data: server } = await supabase
		.from('mcp_servers')
		.select('name, slug, auth_mode')
		.eq('slug', slug)
		.maybeSingle();
	if (!server) {
		return html('You do not have access to this MCP server, or it does not exist.', 403);
	}

	if (approve === '1') {
		const code = signToken({ slug, ru: redirectUri, cc: codeChallenge, u: user.id });
		const back = new URL(redirectUri);
		back.searchParams.set('code', code);
		if (state) back.searchParams.set('state', state);
		return NextResponse.redirect(back);
	}

	// Consent screen.
	const approveUrl = url.pathname + url.search + '&approve=1';
	return html(
		`<div class="card">
			<div class="logo">mcpify</div>
			<h1>Authorize access</h1>
			<p><strong>${escapeHtml(clientId || 'An MCP client')}</strong> wants to access your MCP server
			<strong>${escapeHtml(server.name)}</strong> as <strong>${escapeHtml(user.email || 'you')}</strong>.</p>
			<div class="row">
				<a class="btn primary" href="${escapeHtml(approveUrl)}">Approve</a>
				<a class="btn" href="${escapeHtml(redirectUri)}?error=access_denied${state ? '&state=' + encodeURIComponent(state) : ''}">Deny</a>
			</div>
		</div>`,
		200
	);
}

function html(inner: string, status: number) {
	const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authorize — mcpify</title>
<style>
body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:32px;max-width:420px;width:90%}
.logo{font-weight:700;color:#22d3ee;margin-bottom:16px}
h1{font-size:20px;margin:0 0 12px}
p{color:#94a3b8;line-height:1.5}
.row{display:flex;gap:12px;margin-top:24px}
.btn{flex:1;text-align:center;padding:10px 16px;border-radius:10px;text-decoration:none;border:1px solid #475569;color:#e2e8f0}
.btn.primary{background:linear-gradient(135deg,#06b6d4,#2563eb);border:none;color:#fff;font-weight:600}
</style></head><body>${inner}</body></html>`;
	return new Response(page, { status, headers: { 'Content-Type': 'text/html' } });
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
