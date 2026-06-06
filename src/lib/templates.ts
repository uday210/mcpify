// One-click server templates. Each bundles a catalog app + a recommended MCP
// server setup. Applying one creates the connection (you add credentials after)
// and a server exposing the app's tools.

export interface Template {
	id: string;
	name: string;
	tagline: string;
	appSlug: string;
	transport: 'http_stream' | 'sse';
	category: string;
	accent: string; // tailwind gradient classes
}

export const TEMPLATES: Template[] = [
	{ id: 'github-assistant', name: 'GitHub Assistant', tagline: 'Browse issues, PRs, repos and code search.', appSlug: 'github', transport: 'http_stream', category: 'Dev', accent: 'from-slate-700 to-slate-900' },
	{ id: 'stripe-ops', name: 'Stripe Ops', tagline: 'Look up customers, payments and subscriptions.', appSlug: 'stripe', transport: 'http_stream', category: 'Payments', accent: 'from-indigo-500 to-violet-600' },
	{ id: 'notion-workspace', name: 'Notion Workspace', tagline: 'Search and read pages across your workspace.', appSlug: 'notion', transport: 'http_stream', category: 'Docs', accent: 'from-slate-600 to-slate-800' },
	{ id: 'slack-bot', name: 'Slack Bot', tagline: 'Post messages and read channels.', appSlug: 'slack', transport: 'http_stream', category: 'Comms', accent: 'from-fuchsia-500 to-purple-600' },
	{ id: 'ai-toolkit', name: 'OpenAI Toolkit', tagline: 'Chat completions, embeddings and models.', appSlug: 'openai', transport: 'http_stream', category: 'AI', accent: 'from-emerald-500 to-teal-600' },
	{ id: 'web-search', name: 'Web Search', tagline: 'Live web results via Brave Search.', appSlug: 'brave', transport: 'http_stream', category: 'Search', accent: 'from-orange-500 to-amber-600' },
	{ id: 'weather', name: 'Weather', tagline: 'Current conditions and forecasts.', appSlug: 'openweather', transport: 'http_stream', category: 'Data', accent: 'from-sky-500 to-blue-600' },
	{ id: 'email-sender', name: 'Email Sender', tagline: 'Send transactional email via Resend.', appSlug: 'resend', transport: 'http_stream', category: 'Email', accent: 'from-rose-500 to-pink-600' },
];

export function getTemplate(id: string): Template | null {
	return TEMPLATES.find((t) => t.id === id) || null;
}
