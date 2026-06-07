'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Boxes, Server, Plug, Activity, LogOut, Menu, X, Search, Home, Settings, Sparkles } from 'lucide-react';
import Toaster from '@/components/Toaster';
import CommandPalette from '@/components/CommandPalette';
import MigrationBanner from '@/components/MigrationBanner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const [email, setEmail] = useState<string>('');
	const [open, setOpen] = useState(false);
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

	const nav = [
		{ href: '/dashboard', label: 'Home', icon: Home, exact: true },
		{ href: '/dashboard/servers', label: 'Servers', icon: Server },
		{ href: '/dashboard/connections', label: 'Connections', icon: Plug },
		{ href: '/dashboard/templates', label: 'Templates', icon: Sparkles },
		{ href: '/dashboard/activity', label: 'Activity', icon: Activity },
		{ href: '/dashboard/settings', label: 'Settings', icon: Settings },
	];

	const isActive = (href: string, exact?: boolean) =>
		exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');

	const SidebarContent = (
		<>
			<Link href="/dashboard" className="flex items-center gap-2 px-2 mb-8">
				<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
					<Boxes className="w-5 h-5 text-white" />
				</div>
				<span className="text-xl font-bold text-white">mcpify</span>
			</Link>
			<button
				onClick={() => window.dispatchEvent(new Event('mcpify-cmdk'))}
				className="flex items-center gap-2 w-full px-3 py-2 mb-3 rounded-lg text-sm bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition"
			>
				<Search className="w-4 h-4" />
				<span>Search…</span>
				<kbd className="ml-auto text-[10px] border border-white/15 rounded px-1.5 py-0.5">⌘K</kbd>
			</button>
			<nav className="space-y-1 flex-1">
				{nav.map(({ href, label, icon: Icon, exact }) => (
					<Link
						key={href}
						href={href}
						onClick={() => setOpen(false)}
						className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
							isActive(href, exact)
								? 'bg-white/10 text-white'
								: 'text-slate-400 hover:text-white hover:bg-white/5'
						}`}
					>
						<Icon className="w-4 h-4" />
						{label}
					</Link>
				))}
			</nav>
			<div className="border-t border-white/10 pt-4 mt-4">
				<div className="px-3 text-xs text-slate-500 truncate mb-2">{email}</div>
				<button
					onClick={logout}
					className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 w-full transition"
				>
					<LogOut className="w-4 h-4" />
					Logout
				</button>
			</div>
		</>
	);

	return (
		<div className="min-h-screen bg-slate-50">
			{/* Desktop sidebar */}
			<aside className="hidden md:flex flex-col w-60 fixed inset-y-0 left-0 bg-slate-900 p-4">
				{SidebarContent}
			</aside>

			{/* Mobile top bar */}
			<div className="md:hidden flex items-center justify-between bg-slate-900 px-4 py-3">
				<Link href="/dashboard" className="flex items-center gap-2">
					<Boxes className="w-6 h-6 text-cyan-400" />
					<span className="font-bold text-white">mcpify</span>
				</Link>
				<button onClick={() => setOpen(true)} className="text-slate-300">
					<Menu className="w-6 h-6" />
				</button>
			</div>

			{/* Mobile drawer */}
			{open && (
				<div className="md:hidden fixed inset-0 z-40 flex">
					<div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
					<aside className="relative flex flex-col w-64 bg-slate-900 p-4">
						<button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-slate-400">
							<X className="w-5 h-5" />
						</button>
						{SidebarContent}
					</aside>
				</div>
			)}

			<main className="md:pl-60">
				<MigrationBanner />
				<div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
			</main>
			<Toaster />
			<CommandPalette />
		</div>
	);
}
