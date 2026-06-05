'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, AlertCircle, Boxes } from 'lucide-react';
import BrandPanel from '@/components/BrandPanel';

export default function LoginPage() {
	return (
		<Suspense fallback={null}>
			<LoginInner />
		</Suspense>
	);
}

function LoginInner() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const searchParams = useSearchParams();
	const supabase = createClient();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) setError(error.message);
			else router.push(searchParams.get('redirect') || '/dashboard');
		} catch {
			setError('An unexpected error occurred');
		} finally {
			setLoading(false);
		}
	};

	const input =
		'w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition';

	return (
		<div className="min-h-screen flex">
			<BrandPanel />
			<div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50">
				<div className="w-full max-w-sm">
					<Link href="/" className="lg:hidden flex items-center gap-2 mb-8">
						<div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
							<Boxes className="w-5 h-5 text-white" />
						</div>
						<span className="font-bold text-slate-900">mcpify</span>
					</Link>
					<h1 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h1>
					<p className="text-slate-500 mb-8">Sign in to your mcpify account.</p>

					{error && (
						<div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 text-sm text-red-700">
							<AlertCircle className="w-5 h-5 shrink-0" />
							{error}
						</div>
					)}

					<form onSubmit={handleLogin} className="space-y-4">
						<div className="relative">
							<Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
							<input className={input} type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
						</div>
						<div className="relative">
							<Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
							<input className={input} type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
						</div>
						<button
							type="submit"
							disabled={loading}
							className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lift transition disabled:opacity-50"
						>
							{loading ? 'Signing in…' : 'Sign In'}
						</button>
					</form>

					<p className="mt-8 text-center text-sm text-slate-500">
						Don&apos;t have an account?{' '}
						<Link href="/auth/signup" className="text-cyan-600 font-medium hover:text-cyan-700">
							Sign up
						</Link>
					</p>
				</div>
			</div>
		</div>
	);
}
