// Upsert the OAuth-social catalog apps into app_definitions.
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
		name: 'X (Twitter)',
		slug: 'twitter',
		description: 'Read and post tweets, look up users via the X API v2.',
		base_url: 'https://api.twitter.com/2',
		auth_type: 'oauth',
		api_documentation_url: 'https://developer.twitter.com/en/docs/twitter-api',
		config: {
			oauth: {
				authorize_url: 'https://twitter.com/i/oauth2/authorize',
				token_url: 'https://api.twitter.com/2/oauth2/token',
				scopes: ['tweet.read', 'users.read', 'tweet.write', 'offline.access'],
				pkce: true,
				token_auth: 'basic',
			},
			auth_help: 'Create an app in the X Developer Portal (OAuth 2.0, Confidential client). Add the redirect URI shown here.',
		},
	},
	{
		name: 'LinkedIn',
		slug: 'linkedin',
		description: 'Read the authenticated member’s LinkedIn profile.',
		base_url: 'https://api.linkedin.com/v2',
		auth_type: 'oauth',
		api_documentation_url: 'https://learn.microsoft.com/en-us/linkedin/',
		config: {
			oauth: {
				authorize_url: 'https://www.linkedin.com/oauth/v2/authorization',
				token_url: 'https://www.linkedin.com/oauth/v2/accessToken',
				scopes: ['openid', 'profile', 'email'],
			},
			auth_help: 'Create an app at linkedin.com/developers, enable “Sign In with LinkedIn using OpenID Connect”, and add the redirect URI.',
		},
	},
	{
		name: 'Reddit',
		slug: 'reddit',
		description: 'Read your Reddit identity, subscriptions and posts.',
		base_url: 'https://oauth.reddit.com',
		auth_type: 'oauth',
		api_documentation_url: 'https://www.reddit.com/dev/api/',
		config: {
			oauth: {
				authorize_url: 'https://www.reddit.com/api/v1/authorize',
				token_url: 'https://www.reddit.com/api/v1/access_token',
				scopes: ['identity', 'read', 'mysubreddits'],
				token_auth: 'basic',
				authorize_params: { duration: 'permanent' },
			},
			static_headers: { 'User-Agent': 'mcpify/1.0' },
			auth_help: 'Create a “web app” at reddit.com/prefs/apps and add the redirect URI shown here.',
		},
	},
	{
		name: 'Zoho CRM',
		slug: 'zoho_crm',
		description: 'Read and create CRM records (Leads, Contacts, Deals…).',
		base_url: 'https://www.zohoapis.com/crm/v3',
		auth_type: 'oauth',
		api_documentation_url: 'https://www.zoho.com/crm/developer/docs/api/v3/',
		config: {
			oauth: {
				authorize_url: 'https://accounts.zoho.com/oauth/v2/auth',
				token_url: 'https://accounts.zoho.com/oauth/v2/token',
				scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.users.READ'],
				authorize_params: { access_type: 'offline', prompt: 'consent' },
			},
			auth_help: 'Create a “Server-based” client at api-console.zoho.com and add the redirect URI. (For .eu/.in accounts, change the base URL after connecting.)',
		},
	},
	{
		name: 'Xero',
		slug: 'xero',
		description: 'Read Xero accounting data (contacts, invoices, accounts).',
		base_url: 'https://api.xero.com/api.xro/2.0',
		auth_type: 'oauth',
		api_documentation_url: 'https://developer.xero.com/documentation/api/accounting/overview',
		config: {
			oauth: {
				authorize_url: 'https://login.xero.com/identity/connect/authorize',
				token_url: 'https://identity.xero.com/connect/token',
				scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
				token_auth: 'basic',
				capture_tenant: true,
			},
			auth_help: 'Create an app at developer.xero.com/app/manage and add the redirect URI. mcpify captures your tenant automatically.',
		},
	},
	{
		name: 'Google Analytics (GA4)',
		slug: 'ga4',
		description: 'Run GA4 reports via the Analytics Data API.',
		base_url: 'https://analyticsdata.googleapis.com/v1beta',
		auth_type: 'oauth',
		api_documentation_url: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
		config: {
			oauth: {
				authorize_url: 'https://accounts.google.com/o/oauth2/v2/auth',
				token_url: 'https://oauth2.googleapis.com/token',
				scopes: ['https://www.googleapis.com/auth/analytics.readonly', 'openid'],
				authorize_params: { access_type: 'offline', prompt: 'consent' },
			},
			auth_help: 'Create an OAuth client (Web application) in Google Cloud Console, enable the Analytics Data API, and add the redirect URI.',
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
		body: JSON.stringify({ ...app, is_active: true }),
	});
	const text = await res.text();
	console.log(app.slug, res.status, text.slice(0, 120));
}
