'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	const supabase = createClient();

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});

			if (error) {
				setError(error.message);
			} else {
				router.push('/dashboard');
			}
		} catch (err) {
			setError('An unexpected error occurred');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
			<div className="w-full max-w-md">
				<div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
					<h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
					<p className="text-slate-400 mb-8">
						Sign in to your mcpify account
					</p>

					{error && (
						<div className="mb-6 p-4 bg-red-900/20 border border-red-700/50 rounded-lg flex gap-3">
							<AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
							<p className="text-red-200 text-sm">{error}</p>
						</div>
					)}

					<form onSubmit={handleLogin} className="space-y-4">
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Email Address
							</label>
							<div className="relative">
								<Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
									placeholder="you@example.com"
									required
								/>
							</div>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">
								Password
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
									placeholder="••••••••"
									required
								/>
							</div>
						</div>

						<button
							type="submit"
							disabled={loading}
							className="w-full py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition disabled:opacity-50"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</form>

					<div className="mt-8 text-center text-slate-400">
						<p>
							Don't have an account?{' '}
							<Link href="/auth/signup" className="text-cyan-500 hover:text-cyan-400">
								Sign up
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
