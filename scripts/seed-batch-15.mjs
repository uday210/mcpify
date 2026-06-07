// Upsert a batch of new catalog apps into app_definitions.
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

const nb = (hint) => ({ needs_base_url: true, base_url_hint: hint });

const apps = [
	{ name: 'Gitea', slug: 'gitea', description: 'Self-hosted Git: repos, issues.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://docs.gitea.com/api/1.20/', config: { ...nb('https://gitea.example.com/api/v1'), auth_help: 'Create a token in Settings → Applications.' } },
	{ name: 'Jenkins', slug: 'jenkins', description: 'CI: jobs and builds.', base_url: '', auth_type: 'basic',
		api_documentation_url: 'https://www.jenkins.io/doc/book/using/remote-access-api/', config: { ...nb('https://jenkins.example.com'), auth_help: 'Username + an API token (User → Configure → API Token).' } },
	{ name: 'Mastodon', slug: 'mastodon', description: 'Post and read on your Mastodon instance.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://docs.joinmastodon.org/api/', config: { ...nb('https://mastodon.social'), auth_help: 'Preferences → Development → New application → copy the access token.' } },
	{ name: 'MailerLite', slug: 'mailerlite', description: 'Email marketing: subscribers, groups, campaigns.', base_url: 'https://connect.mailerlite.com/api', auth_type: 'bearer',
		api_documentation_url: 'https://developers.mailerlite.com/docs', config: { auth_help: 'Create an API token in Integrations → API.' } },
	{ name: 'ActiveCampaign', slug: 'activecampaign', description: 'CRM + email automation: contacts, deals.', base_url: '', auth_type: 'custom',
		api_documentation_url: 'https://developers.activecampaign.com/reference', config: { ...nb('https://YOURACCOUNT.api-us1.com'), header_name: 'Api-Token', auth_help: 'Settings → Developer → copy your API URL (base) and Key (header value).' } },
	{ name: 'Wise', slug: 'wise', description: 'Wise (TransferWise): profiles.', base_url: 'https://api.wise.com', auth_type: 'bearer',
		api_documentation_url: 'https://docs.wise.com/api-docs', config: { auth_help: 'Create an API token in your Wise account settings.' } },
	{ name: 'Strapi', slug: 'strapi', description: 'Headless CMS: entries in any collection.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://docs.strapi.io/dev-docs/api/rest', config: { ...nb('https://your-strapi.com/api'), auth_help: 'Settings → API Tokens → create a token.' } },
	{ name: 'Directus', slug: 'directus', description: 'Headless CMS: items and collections.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://docs.directus.io/reference/introduction.html', config: { ...nb('https://your-directus.com'), auth_help: 'Create a static access token on your user in the Directus app.' } },
	{ name: 'Meilisearch', slug: 'meilisearch', description: 'Search engine: indexes and search.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://www.meilisearch.com/docs/reference/api/overview', config: { ...nb('http://localhost:7700'), auth_help: 'Use a master/API key as the bearer token.' } },
	{ name: 'Grafana', slug: 'grafana', description: 'Dashboards, data sources, health.', base_url: '', auth_type: 'bearer',
		api_documentation_url: 'https://grafana.com/docs/grafana/latest/developers/http_api/', config: { ...nb('https://your-grafana.com'), auth_help: 'Create a Service Account token (Administration → Service accounts).' } },
	{ name: 'Jina AI', slug: 'jina', description: 'Embeddings and reranking.', base_url: 'https://api.jina.ai/v1', auth_type: 'bearer',
		api_documentation_url: 'https://jina.ai/embeddings/', config: { auth_help: 'Get a key at jina.ai.' } },
	{ name: 'xAI (Grok)', slug: 'xai', description: 'Grok models: chat completions.', base_url: 'https://api.x.ai/v1', auth_type: 'bearer',
		api_documentation_url: 'https://docs.x.ai/api', config: { auth_help: 'Create a key at console.x.ai.' } },
	{ name: 'Ghost', slug: 'ghost', description: 'Ghost blog Content API: posts and tags.', base_url: '', auth_type: 'api_key',
		api_documentation_url: 'https://ghost.org/docs/content-api/', config: { ...nb('https://yourblog.ghost.io'), api_key_in: 'query', api_key_name: 'key', auth_help: 'Create a Content API key under Settings → Integrations.' } },
	{ name: 'ConvertKit', slug: 'convertkit', description: 'Creator email: subscribers, forms, tags.', base_url: 'https://api.convertkit.com/v3', auth_type: 'api_key',
		api_documentation_url: 'https://developers.convertkit.com/', config: { api_key_in: 'query', api_key_name: 'api_key', auth_help: 'Find your API key in Account → Advanced.' } },
	{ name: 'Wikipedia', slug: 'wikipedia', description: 'Article summaries and search (no auth).', base_url: 'https://en.wikipedia.org', auth_type: 'none',
		api_documentation_url: 'https://www.mediawiki.org/wiki/API:REST_API', config: { auth_help: 'No authentication required.' } },
];

for (const app of apps) {
	const res = await fetch(`${URL_}/rest/v1/app_definitions?on_conflict=slug`, {
		method: 'POST',
		headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
		body: JSON.stringify({ ...app, is_active: true }),
	});
	console.log(app.slug, res.status, (await res.text()).slice(0, 80));
}
