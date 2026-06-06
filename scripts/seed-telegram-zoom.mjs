// One-off: upsert Telegram + Zoom catalog apps into app_definitions.
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
	readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => l.includes('=') && !l.trim().startsWith('#'))
		.map((l) => {
			const i = l.indexOf('=');
			return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
		})
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const apps = [
	{
		name: 'Telegram',
		slug: 'telegram',
		description: 'Send messages and interact with chats via a Telegram bot.',
		base_url: 'https://api.telegram.org',
		auth_type: 'token_path',
		api_documentation_url: 'https://core.telegram.org/bots/api',
		is_active: true,
		config: {
			token_path_template: '/bot{token}',
			auth_help: 'Create a bot with @BotFather and paste the token it gives you (looks like 123456:ABC-DEF…).',
		},
	},
	{
		name: 'Zoom',
		slug: 'zoom',
		description: 'Manage Zoom users and meetings via Server-to-Server OAuth.',
		base_url: 'https://api.zoom.us/v2',
		auth_type: 'oauth2_account',
		api_documentation_url: 'https://developers.zoom.us/docs/internal-apps/',
		is_active: true,
		config: {
			oauth: { token_url: 'https://zoom.us/oauth/token' },
			auth_help: 'Create a Server-to-Server OAuth app in the Zoom Marketplace; copy the Account ID, Client ID and Client Secret.',
		},
	},
];

for (const app of apps) {
	const res = await fetch(`${URL_}/rest/v1/app_definitions?on_conflict=slug`, {
		method: 'POST',
		headers: {
			apikey: KEY,
			Authorization: `Bearer ${KEY}`,
			'Content-Type': 'application/json',
			Prefer: 'resolution=merge-duplicates,return=representation',
		},
		body: JSON.stringify(app),
	});
	const text = await res.text();
	console.log(app.slug, res.status, text.slice(0, 200));
}
