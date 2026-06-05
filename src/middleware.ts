import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase auth session on every request and gates the
 * dashboard behind authentication. MCP runtime routes (/api/mcp/**) and
 * OAuth callbacks authenticate themselves and are intentionally excluded
 * via the matcher below.
 */
export async function middleware(request: NextRequest) {
	let response = NextResponse.next({ request });

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet: CookieToSet[]) {
					cookiesToSet.forEach(({ name, value }: CookieToSet) =>
						request.cookies.set(name, value)
					);
					response = NextResponse.next({ request });
					cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
						response.cookies.set(name, value, options)
					);
				},
			},
		}
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const { pathname } = request.nextUrl;

	if (!user && pathname.startsWith('/dashboard')) {
		const url = request.nextUrl.clone();
		url.pathname = '/auth/login';
		url.searchParams.set('redirect', pathname);
		return NextResponse.redirect(url);
	}

	if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
		const url = request.nextUrl.clone();
		url.pathname = '/dashboard';
		return NextResponse.redirect(url);
	}

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all paths except:
		 * - _next/static, _next/image, favicon
		 * - /api/mcp/** (MCP clients authenticate with their own bearer key)
		 * - /api/oauth/** (OAuth provider callbacks)
		 */
		'/((?!_next/static|_next/image|favicon.ico|api/mcp|api/oauth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
	],
};
