'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Boxes, Server, Plug, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [email, setEmail] = useState<string>('');
	const router = useRouter();
	const pathname = usePathname();
	const supabase = createClient();

	useEffect(() => {
		supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || ''));
	}, [supabase]);

	const logout = async () => {
		await supabase.auth.signOut();
		router.push('/');
	};

	const navItem = (href: string, label: string, Icon: any) => {
		const active = pathname === href || pathname.startsWith(href + '/');
		return (
			<Link
				href={href}
				className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
					active ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-100'
				}`}
			>
				<Icon className="w-4 h-4" />
				{label}
			</Link>
		);
	};

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="bg-white border-b border-slate-200 sticky top-0 z-10">
				<div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
					<div className="flex items-center gap-6">
						<Link href="/dashboard" className="flex items-center gap-2">
							<Boxes className="w-7 h-7 text-cyan-600" />
							<span className="text-xl font-bold text-slate-900">mcpify</span>
						</Link>
						<nav className="hidden sm:flex items-center gap-1">
							{navItem('/dashboard', 'Servers', Server)}
							{navItem('/dashboard/connections', 'Connections', Plug)}
						</nav>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-sm text-slate-500 hidden sm:inline">{email}</span>
						<button
							onClick={logout}
							className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition"
						>
							<LogOut className="w-4 h-4" />
							Logout
						</button>
					</div>
				</div>
			</header>
			<main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
		</div>
	);
}
