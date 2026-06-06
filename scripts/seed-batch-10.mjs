// Upsert a batch of 10 catalog apps into app_definitions.
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
		name: 'Mailgun', slug: 'mailgun', description: 'Transactional email: domains, events, lists.',
		base_url: 'https://api.mailgun.net/v3', auth_type: 'basic',
		api_documentation_url: 'https://documentation.mailgun.com/',
		config: { auth_help: 'Username is "api", password is your Mailgun Private API key (Settings → API Keys).' },
	},
	{
		name: 'Confluence', slug: 'confluence', description: 'Atlassian Confluence spaces, pages and search.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://developer.atlassian.com/cloud/confluence/rest/v1/',
		config: { needs_base_url: true, base_url_hint: 'https://YOURSITE.atlassian.net/wiki', auth_help: 'Username = your Atlassian email, password = an API token from id.atlassian.com/manage-profile/security/api-tokens.' },
	},
	{
		name: 'Freshdesk', slug: 'freshdesk', description: 'Freshdesk support tickets and contacts.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://developers.freshdesk.com/api/',
		config: { needs_base_url: true, base_url_hint: 'https://YOURDOMAIN.freshdesk.com/api/v2', auth_help: 'Username = your API key, password = X (any value). Find the key in your Freshdesk profile.' },
	},
	{
		name: 'Freshservice', slug: 'freshservice', description: 'Freshservice ITSM tickets and agents.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://api.freshservice.com/',
		config: { needs_base_url: true, base_url_hint: 'https://YOURDOMAIN.freshservice.com/api/v2', auth_help: 'Username = your API key, password = X (any value).' },
	},
	{
		name: 'ServiceNow', slug: 'servicenow', description: 'ServiceNow Table API: incidents and records.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://developer.servicenow.com/dev.do#!/reference/api/latest/rest/c_TableAPI',
		config: { needs_base_url: true, base_url_hint: 'https://YOURINSTANCE.service-now.com', auth_help: 'Use your ServiceNow username and password (or a dedicated integration user).' },
	},
	{
		name: 'WooCommerce', slug: 'woocommerce', description: 'WooCommerce products and orders.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
		config: { needs_base_url: true, base_url_hint: 'https://YOURSTORE.com/wp-json/wc/v3', auth_help: 'Username = Consumer key, password = Consumer secret (WooCommerce → Settings → Advanced → REST API).' },
	},
	{
		name: 'BigCommerce', slug: 'bigcommerce', description: 'BigCommerce catalog, categories and customers.',
		base_url: '', auth_type: 'custom',
		api_documentation_url: 'https://developer.bigcommerce.com/docs/rest-management',
		config: { needs_base_url: true, base_url_hint: 'https://api.bigcommerce.com/stores/STORE_HASH/v3', header_name: 'X-Auth-Token', auth_help: 'Create a store API account; paste its Access Token. Base URL uses your store hash.' },
	},
	{
		name: 'Pinecone', slug: 'pinecone', description: 'Pinecone vector DB: list/describe indexes.',
		base_url: 'https://api.pinecone.io', auth_type: 'api_key',
		api_documentation_url: 'https://docs.pinecone.io/reference/api',
		config: { api_key_in: 'header', api_key_name: 'Api-Key', auth_help: 'Create an API key in the Pinecone console.' },
	},
	{
		name: 'Together AI', slug: 'together', description: 'Together AI: models, chat completions, embeddings.',
		base_url: 'https://api.together.xyz/v1', auth_type: 'bearer',
		api_documentation_url: 'https://docs.together.ai/reference',
		config: { auth_help: 'Create an API key at api.together.ai/settings/api-keys.' },
	},
	{
		name: 'Chargebee', slug: 'chargebee', description: 'Chargebee subscriptions, customers, invoices.',
		base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://apidocs.chargebee.com/docs/api',
		config: { needs_base_url: true, base_url_hint: 'https://YOURSITE.chargebee.com/api/v2', auth_help: 'Username = your API key, password = empty. Find the key in Settings → Configure Chargebee → API Keys.' },
	},
];

for (const app of apps) {
	const res = await fetch(`${URL_}/rest/v1/app_definitions?on_conflict=slug`, {
		method: 'POST',
		headers: {
			apikey: KEY, Authorization: `Bearer ${KEY}`,
			'Content-Type': 'application/json',
			Prefer: 'resolution=merge-duplicates,return=representation',
		},
		body: JSON.stringify({ ...app, is_active: true }),
	});
	console.log(app.slug, res.status, (await res.text()).slice(0, 90));
}
