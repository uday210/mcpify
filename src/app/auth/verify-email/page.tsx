import Link from 'next/link';
import { MailCheck } from 'lucide-react';

export default function VerifyEmailPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-6">
			<div className="w-full max-w-md text-center">
				<div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
					<MailCheck className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
					<h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>
					<p className="text-slate-400 mb-8">
						We sent you a confirmation link. Click it to activate your account, then
						sign in.
					</p>
					<Link
						href="/auth/login"
						className="inline-block px-6 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
					>
						Go to Sign In
					</Link>
				</div>
			</div>
		</div>
	);
}
