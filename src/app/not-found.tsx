import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
			<div className="text-center">
				<p className="text-6xl font-bold text-cyan-600">404</p>
				<h1 className="mt-4 text-xl font-semibold text-slate-900">Page not found</h1>
				<p className="mt-2 text-slate-500">That page doesn&apos;t exist.</p>
				<Link
					href="/"
					className="mt-6 inline-block px-5 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition"
				>
					Go home
				</Link>
			</div>
		</div>
	);
}
