'use client';

import { useEffect, useState } from 'react';
import { User, ShieldCheck, SlidersHorizontal, KeyRound, Copy, Check, RefreshCw, Lock, Bell, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/components/Toaster';
import { getPrefs, setPrefs, type Preferences } from '@/lib/preferences';

type Tab = 'account' | 'security' | 'preferences' | 'notifications';

const input =
	'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 outline-none';
const label = 'block text-xs font-medium text-slate-500 mb-1';

export default function SettingsPage() {
	const [tab, setTab] = useState<Tab>('account');

	const tabs: { id: Tab; label: string; icon: any }[] = [
		{ id: 'account', label: 'Account', icon: User },
		{ id: 'security', label: 'Security & keys', icon: ShieldCheck },
		{ id: 'notifications', label: 'Notifications', icon: Bell },
		{ id: 'preferences', label: 'Preferences', icon: SlidersHorizontal },
	];

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
				<p className="text-slate-500 mt-1">Manage your account, security and preferences.</p>
			</div>

			<div className="flex flex-col md:flex-row gap-8">
				{/* Tab rail */}
				<nav className="md:w-52 shrink-0 flex md:flex-col gap-1 overflow-x-auto">
					{tabs.map((t) => (
						<button
							key={t.id}
							onClick={() => setTab(t.id)}
							className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
								tab === t.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
							}`}
						>
							<t.icon className="w-4 h-4" />
							{t.label}
						</button>
					))}
				</nav>

				<div className="flex-1 min-w-0 max-w-2xl">
					{tab === 'account' && <AccountTab />}
					{tab === 'security' && <SecurityTab />}
					{tab === 'notifications' && <NotificationsTab />}
					{tab === 'preferences' && <PreferencesTab />}
				</div>
			</div>
		</div>
	);
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
	return (
		<div className="bg-white rounded-2xl border border-slate-200/70 shadow-card p-6 mb-6">
			<h3 className="font-semibold text-slate-900">{title}</h3>
			{desc && <p className="text-sm text-slate-500 mt-0.5 mb-4">{desc}</p>}
			<div className={desc ? '' : 'mt-4'}>{children}</div>
		</div>
	);
}

function AccountTab() {
	const supabase = createClient();
	const [profile, setProfile] = useState<any>(null);
	const [fullName, setFullName] = useState('');
	const [company, setCompany] = useState('');
	const [orgName, setOrgName] = useState('');
	const [saving, setSaving] = useState(false);

	const [pw, setPw] = useState('');
	const [pw2, setPw2] = useState('');
	const [pwSaving, setPwSaving] = useState(false);

	useEffect(() => {
		fetch('/api/profile')
			.then((r) => r.json())
			.then((d) => {
				setProfile(d);
				setFullName(d.full_name || '');
				setCompany(d.company_name || '');
				setOrgName(d.org?.name || '');
			})
			.catch(() => {});
	}, []);

	const saveProfile = async () => {
		setSaving(true);
		const r = await fetch('/api/profile', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ full_name: fullName, company_name: company, org_name: orgName, org_id: profile?.org?.id }),
		});
		setSaving(false);
		if (r.ok) toast('Profile saved', 'success');
		else toast('Could not save profile', 'error');
	};

	const changePassword = async () => {
		if (pw.length < 8) return toast('Password must be at least 8 characters', 'error');
		if (pw !== pw2) return toast('Passwords do not match', 'error');
		setPwSaving(true);
		const { error } = await supabase.auth.updateUser({ password: pw });
		setPwSaving(false);
		if (error) return toast(error.message, 'error');
		setPw('');
		setPw2('');
		toast('Password updated', 'success');
	};

	const signOutEverywhere = async () => {
		await supabase.auth.signOut({ scope: 'global' } as any);
		window.location.href = '/';
	};

	return (
		<>
			<Section title="Profile" desc="How you appear in mcpify.">
				<div className="space-y-4">
					<div>
						<label className={label}>Email</label>
						<input className={`${input} bg-slate-50 text-slate-500`} value={profile?.email || ''} disabled />
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className={label}>Display name</label>
							<input className={input} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
						</div>
						<div>
							<label className={label}>Company</label>
							<input className={input} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
						</div>
					</div>
					<div>
						<label className={label}>Organization name</label>
						<input className={input} value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="My workspace" />
					</div>
					<button
						onClick={saveProfile}
						disabled={saving}
						className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save changes'}
					</button>
				</div>
			</Section>

			<Section title="Password" desc="Use at least 8 characters.">
				<div className="space-y-4">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className={label}>New password</label>
							<input className={input} type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" />
						</div>
						<div>
							<label className={label}>Confirm password</label>
							<input className={input} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="••••••••" />
						</div>
					</div>
					<button
						onClick={changePassword}
						disabled={pwSaving || !pw}
						className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
					>
						{pwSaving ? 'Updating…' : 'Update password'}
					</button>
				</div>
			</Section>

			<Section title="Sessions">
				<div className="flex items-center justify-between">
					<p className="text-sm text-slate-500">Sign out of mcpify on every device.</p>
					<button onClick={signOutEverywhere} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition">
						Sign out everywhere
					</button>
				</div>
			</Section>
		</>
	);
}

function SecurityTab() {
	const [servers, setServers] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);
	const [revealed, setRevealed] = useState<Record<string, string>>({});
	const [busy, setBusy] = useState<string | null>(null);
	const [copied, setCopied] = useState<string | null>(null);

	useEffect(() => {
		fetch('/api/servers')
			.then((r) => r.json())
			.then((s) => setServers(Array.isArray(s) ? s : []))
			.catch(() => {})
			.finally(() => setLoading(false));
	}, []);

	const rotate = async (id: string) => {
		if (!confirm('Rotate this server key? The old key stops working immediately.')) return;
		setBusy(id);
		const r = await fetch(`/api/servers/${id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ regenerateKey: true }),
		});
		const d = await r.json();
		setBusy(null);
		if (r.ok && d.apiKey) {
			setRevealed((m) => ({ ...m, [id]: d.apiKey }));
			toast('New key generated — copy it now', 'success');
		} else {
			toast('Could not rotate key', 'error');
		}
	};

	const copy = (id: string, val: string) => {
		navigator.clipboard.writeText(val);
		setCopied(id);
		setTimeout(() => setCopied(null), 1500);
	};

	return (
		<>
			<Section title="Encryption" desc="How mcpify protects your stored credentials.">
				<div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
					<Lock className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
					<div className="text-sm text-slate-700">
						<span className="font-medium text-emerald-700">Encrypted at rest.</span> Every connection’s API keys,
						tokens and OAuth secrets are sealed with AES-256-GCM before they’re stored, and only decrypted in
						memory when a tool call runs.
					</div>
				</div>
			</Section>

			<Section title="Server keys" desc="Bearer keys MCP clients use to call your servers. Rotate if one leaks.">
				{loading ? (
					<p className="text-sm text-slate-400">Loading…</p>
				) : servers.length === 0 ? (
					<p className="text-sm text-slate-400">No servers yet.</p>
				) : (
					<div className="space-y-3">
						{servers.map((s) => (
							<div key={s.id} className="border border-slate-100 rounded-xl p-3">
								<div className="flex items-center justify-between gap-3">
									<div className="min-w-0 flex items-center gap-2">
										<KeyRound className="w-4 h-4 text-slate-400 shrink-0" />
										<div className="min-w-0">
											<div className="text-sm font-medium text-slate-900 truncate">{s.name}</div>
											<div className="text-xs font-mono text-slate-400 truncate">/{s.slug}</div>
										</div>
									</div>
									<button
										onClick={() => rotate(s.id)}
										disabled={busy === s.id}
										className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 shrink-0"
									>
										<RefreshCw className={`w-3.5 h-3.5 ${busy === s.id ? 'animate-spin' : ''}`} />
										Rotate key
									</button>
								</div>
								{revealed[s.id] && (
									<div className="mt-3 flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-2">
										<code className="text-xs text-emerald-300 font-mono truncate flex-1">{revealed[s.id]}</code>
										<button onClick={() => copy(s.id, revealed[s.id])} className="text-slate-300 hover:text-white shrink-0">
											{copied === s.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
										</button>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</Section>
		</>
	);
}

function NotificationsTab() {
	const [orgId, setOrgId] = useState<string | null>(null);
	const [webhook, setWebhook] = useState('');
	const [alertOnError, setAlertOnError] = useState(false);
	const [saving, setSaving] = useState(false);
	const [testing, setTesting] = useState(false);

	useEffect(() => {
		fetch('/api/profile')
			.then((r) => r.json())
			.then((d) => {
				setOrgId(d.org?.id || null);
				setWebhook(d.notification_config?.webhook_url || '');
				setAlertOnError(!!d.notification_config?.alert_on_error);
			})
			.catch(() => {});
	}, []);

	const save = async () => {
		setSaving(true);
		const r = await fetch('/api/profile', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ org_id: orgId, notification_config: { webhook_url: webhook, alert_on_error: alertOnError } }),
		});
		setSaving(false);
		toast(r.ok ? 'Notifications saved' : 'Could not save', r.ok ? 'success' : 'error');
	};

	const sendTest = async () => {
		setTesting(true);
		const r = await fetch('/api/notifications/test', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ webhook_url: webhook }),
		});
		const d = await r.json();
		setTesting(false);
		toast(d.message || (d.ok ? 'Sent' : 'Failed'), d.ok ? 'success' : 'error');
	};

	return (
		<Section title="Error alerts" desc="POST a JSON alert to a webhook (Slack, Discord, your own endpoint) whenever a tool call fails.">
			<div className="space-y-4">
				<label className="flex items-center gap-3 cursor-pointer">
					<input type="checkbox" checked={alertOnError} onChange={(e) => setAlertOnError(e.target.checked)} className="w-4 h-4 rounded accent-cyan-600" />
					<span className="text-sm text-slate-700">Send a webhook when a tool call errors</span>
				</label>
				<div>
					<label className={label}>Webhook URL</label>
					<input className={input} value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/…" />
				</div>
				<div className="flex gap-3">
					<button
						onClick={save}
						disabled={saving}
						className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lift transition disabled:opacity-50"
					>
						{saving ? 'Saving…' : 'Save'}
					</button>
					<button
						onClick={sendTest}
						disabled={testing || !webhook}
						className="px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 flex items-center gap-2"
					>
						<Send className="w-4 h-4" />
						{testing ? 'Sending…' : 'Send test'}
					</button>
				</div>
				<p className="text-xs text-slate-400">
					Requires the ops migration (020). Payload: <code className="text-slate-500">{`{type, server, tool, status_code, error, at}`}</code>
				</p>
			</div>
		</Section>
	);
}

function PreferencesTab() {
	const [prefs, setLocal] = useState<Preferences | null>(null);

	useEffect(() => {
		setLocal(getPrefs());
	}, []);

	const update = (patch: Partial<Preferences>) => {
		const next = setPrefs(patch);
		setLocal(next);
		toast('Preferences saved', 'success');
	};

	if (!prefs) return null;

	const refreshOptions = [
		{ v: 5000, label: '5s' },
		{ v: 10000, label: '10s' },
		{ v: 30000, label: '30s' },
		{ v: 0, label: 'Off' },
	];

	return (
		<>
			<Section title="Default transport" desc="Pre-selected when you create a new MCP server.">
				<div className="grid grid-cols-2 gap-3">
					{[
						{ v: 'http_stream' as const, label: 'Streamable HTTP', desc: 'Modern, single endpoint' },
						{ v: 'sse' as const, label: 'SSE', desc: 'Legacy server-sent events' },
					].map((t) => (
						<button
							key={t.v}
							onClick={() => update({ defaultTransport: t.v })}
							className={`text-left p-3 rounded-xl border transition ${
								prefs.defaultTransport === t.v ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-slate-300'
							}`}
						>
							<div className="text-sm font-medium text-slate-900">{t.label}</div>
							<div className="text-xs text-slate-500">{t.desc}</div>
						</button>
					))}
				</div>
			</Section>

			<Section title="Activity auto-refresh" desc="How often the Activity page polls for new calls when Live is on.">
				<div className="flex flex-wrap gap-2">
					{refreshOptions.map((o) => (
						<button
							key={o.v}
							onClick={() => update({ activityRefreshMs: o.v })}
							className={`px-4 py-2 text-sm rounded-lg border transition ${
								prefs.activityRefreshMs === o.v ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
							}`}
						>
							{o.label}
						</button>
					))}
				</div>
			</Section>
		</>
	);
}
