'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Server, Plug, Activity, Boxes, Plus, ArrowRight, Home, Settings } from 'lucide-react';

interface Item {
	id: string;
	label: string;
	sub?: string;
	icon: any;
	href: string;
	group: string;
}

export default function CommandPalette() {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [active, setActive] = useState(0);
	const [servers, setServers] = useState<any[]>([]);
	const [connections, setConnections] = useState<any[]>([]);
	const inputRef = useRef<HTMLInputElement>(null);

	// Global ⌘K / Ctrl+K toggle.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault();
				setOpen((o) => !o);
			}
			if (e.key === 'Escape') setOpen(false);
		};
		const onOpen = () => setOpen(true);
		window.addEventListener('keydown', onKey);
		window.addEventListener('mcpify-cmdk', onOpen as EventListener);
		return () => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('mcpify-cmdk', onOpen as EventListener);
		};
	}, []);

	// Load data when first opened.
	useEffect(() => {
		if (!open) return;
		setQuery('');
		setActive(0);
		setTimeout(() => inputRef.current?.focus(), 20);
		Promise.all([
			fetch('/api/servers').then((r) => r.json()).catch(() => []),
			fetch('/api/connections').then((r) => r.json()).catch(() => []),
		]).then(([s, c]) => {
			setServers(Array.isArray(s) ? s : []);
			setConnections(Array.isArray(c) ? c : []);
		});
	}, [open]);

	const items: Item[] = useMemo(() => {
		const nav: Item[] = [
			{ id: 'n1', label: 'New Server', icon: Plus, href: '/dashboard/servers/new', group: 'Actions' },
			{ id: 'n2', label: 'New Connection', icon: Plus, href: '/dashboard/connections/new', group: 'Actions' },
			{ id: 'g0', label: 'Home', icon: Home, href: '/dashboard', group: 'Go to' },
			{ id: 'g1', label: 'Servers', icon: Server, href: '/dashboard/servers', group: 'Go to' },
			{ id: 'g2', label: 'Connections', icon: Plug, href: '/dashboard/connections', group: 'Go to' },
			{ id: 'g3', label: 'Activity', icon: Activity, href: '/dashboard/activity', group: 'Go to' },
			{ id: 'g4', label: 'App Catalog', icon: Boxes, href: '/apps', group: 'Go to' },
			{ id: 'g5', label: 'Settings', icon: Settings, href: '/dashboard/settings', group: 'Go to' },
		];
		const srv: Item[] = servers.map((s) => ({
			id: `s-${s.id}`,
			label: s.name,
			sub: `/${s.slug}`,
			icon: Server,
			href: `/dashboard/servers/${s.id}`,
			group: 'Servers',
		}));
		const conn: Item[] = connections.map((c) => ({
			id: `c-${c.id}`,
			label: c.name,
			sub: c.connector_type,
			icon: Plug,
			href: `/dashboard/connections/${c.id}`,
			group: 'Connections',
		}));
		return [...nav, ...srv, ...conn];
	}, [servers, connections]);

	const filtered = useMemo(() => {
		const q = query.toLowerCase().trim();
		if (!q) return items;
		return items.filter((i) => (i.label + ' ' + (i.sub || '')).toLowerCase().includes(q));
	}, [items, query]);

	const go = (href: string) => {
		setOpen(false);
		router.push(href);
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, filtered.length - 1));
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === 'Enter' && filtered[active]) {
			go(filtered[active].href);
		}
	};

	if (!open) return null;

	let lastGroup = '';
	return (
		<div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4" onClick={() => setOpen(false)}>
			<div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" />
			<div
				className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-up"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3 px-4 border-b border-slate-100">
					<Search className="w-4 h-4 text-slate-400" />
					<input
						ref={inputRef}
						value={query}
						onChange={(e) => {
							setQuery(e.target.value);
							setActive(0);
						}}
						onKeyDown={onKeyDown}
						placeholder="Search servers, connections, actions…"
						className="flex-1 py-3.5 text-sm outline-none placeholder-slate-400"
					/>
					<kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">ESC</kbd>
				</div>
				<div className="max-h-80 overflow-y-auto py-2">
					{filtered.length === 0 && <div className="px-4 py-6 text-center text-sm text-slate-400">No results</div>}
					{filtered.map((item, i) => {
						const showGroup = item.group !== lastGroup;
						lastGroup = item.group;
						const Icon = item.icon;
						return (
							<div key={item.id}>
								{showGroup && (
									<div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide text-slate-400">{item.group}</div>
								)}
								<button
									onMouseEnter={() => setActive(i)}
									onClick={() => go(item.href)}
									className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
										active === i ? 'bg-cyan-50' : 'hover:bg-slate-50'
									}`}
								>
									<Icon className={`w-4 h-4 ${active === i ? 'text-cyan-600' : 'text-slate-400'}`} />
									<span className="text-sm text-slate-800 flex-1 truncate">{item.label}</span>
									{item.sub && <span className="text-xs text-slate-400 font-mono truncate">{item.sub}</span>}
									{active === i && <ArrowRight className="w-3.5 h-3.5 text-cyan-600" />}
								</button>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
