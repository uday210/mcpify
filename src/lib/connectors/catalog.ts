import type { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

// Predefined tool sets for the seeded catalog connectors (app_definitions rows
// in migrations 003/006). Each connection of connector_type='catalog' copies
// these into mcp_tools at creation time. Curated + small so every app works
// out of the box without parsing a huge vendor OpenAPI spec.

export interface CatalogConnector {
	baseUrl: string;
	tools: GeneratedTool[];
}

type P = { name: string; in: 'path' | 'query' | 'header' | 'body'; required?: boolean; type?: string; description?: string };

function tool(name: string, description: string, method: string, path: string, params: P[]): GeneratedTool {
	const properties: Record<string, any> = {};
	const required: string[] = [];
	const param_map: GeneratedTool['param_map'] = [];
	for (const p of params) {
		properties[p.name] = { type: p.type || 'string', ...(p.description ? { description: p.description } : {}) };
		if (p.required) required.push(p.name);
		param_map.push({ name: p.name, in: p.in, required: !!p.required });
	}
	return {
		name,
		description,
		input_schema: { type: 'object', properties, ...(required.length ? { required } : {}) },
		http_method: method,
		path_template: path,
		param_map,
	};
}

export const CATALOG: Record<string, CatalogConnector> = {
	github: {
		baseUrl: 'https://api.github.com',
		tools: [
			tool('get_authenticated_user', 'Get the authenticated GitHub user.', 'GET', '/user', []),
			tool('list_my_repos', 'List repositories for the authenticated user.', 'GET', '/user/repos', [
				{ name: 'per_page', in: 'query', type: 'integer', description: 'Results per page (max 100)' },
				{ name: 'sort', in: 'query', description: 'created, updated, pushed, full_name' },
				{ name: 'visibility', in: 'query', description: 'all, public, or private' },
			]),
			tool('get_repo', 'Get a repository by owner and name.', 'GET', '/repos/{owner}/{repo}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('list_issues', 'List issues in a repository.', 'GET', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'open, closed, or all' },
			]),
			tool('create_issue', 'Create an issue in a repository.', 'POST', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'title', in: 'body', required: true },
				{ name: 'body', in: 'body', description: 'Issue body (markdown)' },
			]),
			tool('search_repositories', 'Search public repositories.', 'GET', '/search/repositories', [
				{ name: 'q', in: 'query', required: true, description: 'Search query' },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
		],
	},
	stripe: {
		baseUrl: 'https://api.stripe.com',
		tools: [
			tool('list_customers', 'List Stripe customers.', 'GET', '/v1/customers', [
				{ name: 'limit', in: 'query', type: 'integer', description: '1-100' },
				{ name: 'email', in: 'query', description: 'Filter by email' },
			]),
			tool('get_customer', 'Retrieve a Stripe customer by id.', 'GET', '/v1/customers/{id}', [
				{ name: 'id', in: 'path', required: true },
			]),
			tool('list_charges', 'List recent charges.', 'GET', '/v1/charges', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_invoices', 'List invoices.', 'GET', '/v1/invoices', [
				{ name: 'limit', in: 'query', type: 'integer' },
				{ name: 'status', in: 'query', description: 'draft, open, paid, uncollectible, void' },
			]),
			tool('list_subscriptions', 'List subscriptions.', 'GET', '/v1/subscriptions', [
				{ name: 'limit', in: 'query', type: 'integer' },
				{ name: 'status', in: 'query' },
			]),
		],
	},
	openweather: {
		baseUrl: 'https://api.openweathermap.org',
		tools: [
			tool('current_weather', 'Current weather for a city.', 'GET', '/data/2.5/weather', [
				{ name: 'q', in: 'query', required: true, description: 'City name, e.g. "London,uk"' },
				{ name: 'units', in: 'query', description: 'standard, metric, or imperial' },
			]),
			tool('forecast', '5 day / 3 hour forecast for a city.', 'GET', '/data/2.5/forecast', [
				{ name: 'q', in: 'query', required: true, description: 'City name' },
				{ name: 'units', in: 'query', description: 'standard, metric, or imperial' },
			]),
		],
	},
	notion: {
		baseUrl: 'https://api.notion.com',
		tools: [
			tool('search', 'Search pages and databases.', 'POST', '/v1/search', [
				{ name: 'query', in: 'body', description: 'Text to search for' },
			]),
			tool('list_users', 'List workspace users.', 'GET', '/v1/users', []),
			tool('get_page', 'Retrieve a page by id.', 'GET', '/v1/pages/{page_id}', [
				{ name: 'page_id', in: 'path', required: true },
			]),
			tool('get_database', 'Retrieve a database by id.', 'GET', '/v1/databases/{database_id}', [
				{ name: 'database_id', in: 'path', required: true },
			]),
			tool('query_database', 'Query rows in a database.', 'POST', '/v1/databases/{database_id}/query', [
				{ name: 'database_id', in: 'path', required: true },
				{ name: 'page_size', in: 'body', type: 'integer' },
			]),
		],
	},
	slack: {
		baseUrl: 'https://slack.com/api',
		tools: [
			tool('list_conversations', 'List channels/conversations.', 'GET', '/conversations.list', [
				{ name: 'types', in: 'query', description: 'public_channel,private_channel,im,mpim' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('conversations_history', 'Fetch a channel’s messages.', 'GET', '/conversations.history', [
				{ name: 'channel', in: 'query', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('post_message', 'Post a message to a channel.', 'POST', '/chat.postMessage', [
				{ name: 'channel', in: 'body', required: true },
				{ name: 'text', in: 'body', required: true },
			]),
			tool('list_users', 'List workspace users.', 'GET', '/users.list', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	airtable: {
		baseUrl: 'https://api.airtable.com/v0',
		tools: [
			tool('list_bases', 'List accessible bases.', 'GET', '/meta/bases', []),
			tool('list_records', 'List records in a table.', 'GET', '/{baseId}/{table}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true, description: 'Table id or name' },
				{ name: 'maxRecords', in: 'query', type: 'integer' },
				{ name: 'view', in: 'query' },
			]),
			tool('create_record', 'Create a record.', 'POST', '/{baseId}/{table}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true },
				{ name: 'fields', in: 'body', required: true, type: 'object' },
			]),
		],
	},
	hubspot: {
		baseUrl: 'https://api.hubapi.com',
		tools: [
			tool('list_contacts', 'List CRM contacts.', 'GET', '/crm/v3/objects/contacts', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_contact', 'Get a contact by id.', 'GET', '/crm/v3/objects/contacts/{contactId}', [
				{ name: 'contactId', in: 'path', required: true },
			]),
			tool('create_contact', 'Create a contact.', 'POST', '/crm/v3/objects/contacts', [
				{ name: 'properties', in: 'body', required: true, type: 'object', description: 'e.g. { "email": "a@b.com" }' },
			]),
			tool('list_deals', 'List CRM deals.', 'GET', '/crm/v3/objects/deals', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	gitlab: {
		baseUrl: 'https://gitlab.com/api/v4',
		tools: [
			tool('list_projects', 'List projects you are a member of.', 'GET', '/projects', [
				{ name: 'membership', in: 'query', description: 'true to limit to yours' },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('get_project', 'Get a project by id or path.', 'GET', '/projects/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_issues', 'List a project’s issues.', 'GET', '/projects/{id}/issues', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'opened or closed' },
			]),
		],
	},
	sendgrid: {
		baseUrl: 'https://api.sendgrid.com/v3',
		tools: [
			tool('list_templates', 'List email templates.', 'GET', '/templates', [
				{ name: 'generations', in: 'query', description: 'legacy or dynamic' },
			]),
			tool('get_stats', 'Email statistics.', 'GET', '/stats', [
				{ name: 'start_date', in: 'query', required: true, description: 'YYYY-MM-DD' },
				{ name: 'end_date', in: 'query', description: 'YYYY-MM-DD' },
			]),
		],
	},
	resend: {
		baseUrl: 'https://api.resend.com',
		tools: [
			tool('send_email', 'Send an email.', 'POST', '/emails', [
				{ name: 'from', in: 'body', required: true, description: 'sender, e.g. you@domain.com' },
				{ name: 'to', in: 'body', required: true, type: 'array', description: 'recipient address(es)' },
				{ name: 'subject', in: 'body', required: true },
				{ name: 'html', in: 'body', description: 'HTML body' },
				{ name: 'text', in: 'body', description: 'Plain-text body' },
			]),
		],
	},
	nasa: {
		baseUrl: 'https://api.nasa.gov',
		tools: [
			tool('astronomy_picture_of_the_day', 'NASA APOD.', 'GET', '/planetary/apod', [
				{ name: 'date', in: 'query', description: 'YYYY-MM-DD' },
			]),
			tool('near_earth_objects', 'Near-Earth asteroids for a date range.', 'GET', '/neo/rest/v1/feed', [
				{ name: 'start_date', in: 'query', description: 'YYYY-MM-DD' },
				{ name: 'end_date', in: 'query', description: 'YYYY-MM-DD' },
			]),
		],
	},
	tmdb: {
		baseUrl: 'https://api.themoviedb.org/3',
		tools: [
			tool('search_movie', 'Search for movies.', 'GET', '/search/movie', [{ name: 'query', in: 'query', required: true }]),
			tool('movie_details', 'Get movie details.', 'GET', '/movie/{movie_id}', [{ name: 'movie_id', in: 'path', required: true }]),
			tool('trending_movies', 'Trending movies today.', 'GET', '/trending/movie/day', []),
		],
	},
	todoist: {
		baseUrl: 'https://api.todoist.com/api/v1',
		tools: [
			tool('get_tasks', 'List active tasks.', 'GET', '/tasks', [
				{ name: 'project_id', in: 'query' },
				{ name: 'filter', in: 'query', description: 'e.g. "today"' },
			]),
			tool('create_task', 'Create a task.', 'POST', '/tasks', [
				{ name: 'content', in: 'body', required: true, description: 'Task text' },
				{ name: 'due_string', in: 'body', description: 'e.g. "tomorrow 9am"' },
			]),
			tool('get_projects', 'List projects.', 'GET', '/projects', []),
		],
	},
	asana: {
		baseUrl: 'https://app.asana.com/api/1.0',
		tools: [
			tool('get_me', 'Get the authenticated user.', 'GET', '/users/me', []),
			tool('list_workspaces', 'List workspaces.', 'GET', '/workspaces', []),
			tool('list_projects', 'List projects in a workspace.', 'GET', '/projects', [{ name: 'workspace', in: 'query' }]),
		],
	},
	calendly: {
		baseUrl: 'https://api.calendly.com',
		tools: [
			tool('get_current_user', 'Get the current Calendly user.', 'GET', '/users/me', []),
			tool('list_scheduled_events', 'List scheduled events.', 'GET', '/scheduled_events', [
				{ name: 'user', in: 'query', required: true, description: 'User URI (from get_current_user)' },
			]),
		],
	},
	intercom: {
		baseUrl: 'https://api.intercom.io',
		tools: [
			tool('list_contacts', 'List contacts.', 'GET', '/contacts', []),
			tool('list_conversations', 'List conversations.', 'GET', '/conversations', []),
			tool('list_admins', 'List workspace admins.', 'GET', '/admins', []),
		],
	},
	digitalocean: {
		baseUrl: 'https://api.digitalocean.com/v2',
		tools: [
			tool('account', 'Get account info.', 'GET', '/account', []),
			tool('list_droplets', 'List droplets.', 'GET', '/droplets', [{ name: 'per_page', in: 'query', type: 'integer' }]),
			tool('list_domains', 'List domains.', 'GET', '/domains', []),
		],
	},
	cloudflare: {
		baseUrl: 'https://api.cloudflare.com/client/v4',
		tools: [
			tool('verify_token', 'Verify the API token.', 'GET', '/user/tokens/verify', []),
			tool('list_zones', 'List zones.', 'GET', '/zones', [{ name: 'name', in: 'query' }]),
		],
	},
	openai: {
		baseUrl: 'https://api.openai.com/v1',
		tools: [
			tool('list_models', 'List available models.', 'GET', '/models', []),
			tool('get_model', 'Retrieve a model.', 'GET', '/models/{model}', [{ name: 'model', in: 'path', required: true }]),
		],
	},
	anthropic: {
		baseUrl: 'https://api.anthropic.com',
		tools: [tool('list_models', 'List available Claude models.', 'GET', '/v1/models', [])],
	},
	twilio: {
		baseUrl: 'https://api.twilio.com',
		tools: [
			tool('list_messages', 'List recent SMS messages.', 'GET', '/2010-04-01/Accounts/{AccountSid}/Messages.json', [
				{ name: 'AccountSid', in: 'path', required: true },
				{ name: 'PageSize', in: 'query', type: 'integer' },
			]),
		],
	},
	brave: {
		baseUrl: 'https://api.search.brave.com',
		tools: [
			tool('web_search', 'Brave web search.', 'GET', '/res/v1/web/search', [
				{ name: 'q', in: 'query', required: true, description: 'Search query' },
				{ name: 'count', in: 'query', type: 'integer' },
			]),
		],
	},
	vercel: {
		baseUrl: 'https://api.vercel.com',
		tools: [
			tool('get_user', 'Get the authenticated user.', 'GET', '/v2/user', []),
			tool('list_projects', 'List projects.', 'GET', '/v9/projects', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_deployments', 'List recent deployments.', 'GET', '/v6/deployments', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	linear: {
		baseUrl: 'https://api.linear.app',
		tools: [
			tool('run_graphql', 'Run a Linear GraphQL query.', 'POST', '/graphql', [
				{ name: 'query', in: 'body', required: true, description: 'GraphQL query, e.g. { viewer { id name } }' },
				{ name: 'variables', in: 'body', type: 'object' },
			]),
		],
	},
	figma: {
		baseUrl: 'https://api.figma.com',
		tools: [
			tool('get_me', 'Get the authenticated user.', 'GET', '/v1/me', []),
			tool('get_file', 'Get a Figma file by key.', 'GET', '/v1/files/{file_key}', [{ name: 'file_key', in: 'path', required: true }]),
		],
	},
	unsplash: {
		baseUrl: 'https://api.unsplash.com',
		tools: [
			tool('search_photos', 'Search photos.', 'GET', '/search/photos', [
				{ name: 'query', in: 'query', required: true },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('random_photo', 'Get a random photo.', 'GET', '/photos/random', [{ name: 'query', in: 'query' }]),
		],
	},
	giphy: {
		baseUrl: 'https://api.giphy.com',
		tools: [
			tool('search_gifs', 'Search GIFs.', 'GET', '/v1/gifs/search', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('trending_gifs', 'Trending GIFs.', 'GET', '/v1/gifs/trending', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	discord: {
		baseUrl: 'https://discord.com/api/v10',
		tools: [
			tool('get_me', 'Get the bot/user.', 'GET', '/users/@me', []),
			tool('list_guilds', 'List the bot/user’s servers.', 'GET', '/users/@me/guilds', []),
		],
	},
	newsapi: {
		baseUrl: 'https://newsapi.org/v2',
		tools: [
			tool('top_headlines', 'Top news headlines.', 'GET', '/top-headlines', [
				{ name: 'country', in: 'query', description: 'e.g. us' },
				{ name: 'category', in: 'query', description: 'business, technology, …' },
			]),
			tool('search_news', 'Search all articles.', 'GET', '/everything', [{ name: 'q', in: 'query', required: true }]),
		],
	},
	pexels: {
		baseUrl: 'https://api.pexels.com',
		tools: [
			tool('search_photos', 'Search photos.', 'GET', '/v1/search', [
				{ name: 'query', in: 'query', required: true },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('curated_photos', 'Curated photos.', 'GET', '/v1/curated', [{ name: 'per_page', in: 'query', type: 'integer' }]),
		],
	},
	supabase: {
		baseUrl: 'https://api.supabase.com',
		tools: [
			tool('list_projects', 'List your Supabase projects.', 'GET', '/v1/projects', []),
			tool('list_organizations', 'List your organizations.', 'GET', '/v1/organizations', []),
		],
	},
	dropbox: {
		baseUrl: 'https://api.dropboxapi.com/2',
		tools: [
			tool('list_folder', 'List files/folders in a path.', 'POST', '/files/list_folder', [
				{ name: 'path', in: 'body', required: true, description: 'e.g. "" for root or "/Docs"' },
			]),
			tool('get_current_account', 'Get the current account.', 'POST', '/users/get_current_account', []),
		],
	},
	clickup: {
		baseUrl: 'https://api.clickup.com/api/v2',
		tools: [
			tool('get_authorized_user', 'Get the authorized user.', 'GET', '/user', []),
			tool('get_teams', 'List workspaces (teams).', 'GET', '/team', []),
			tool('get_tasks', 'List tasks in a list.', 'GET', '/list/{list_id}/task', [{ name: 'list_id', in: 'path', required: true }]),
		],
	},
	monday: {
		baseUrl: 'https://api.monday.com/v2',
		tools: [
			tool('run_graphql', 'Run a monday.com GraphQL query.', 'POST', '/', [
				{ name: 'query', in: 'body', required: true, description: 'GraphQL, e.g. { boards(limit:5){ id name } }' },
			]),
		],
	},
	webflow: {
		baseUrl: 'https://api.webflow.com/v2',
		tools: [
			tool('list_sites', 'List your Webflow sites.', 'GET', '/sites', []),
			tool('list_collections', 'List collections for a site.', 'GET', '/sites/{site_id}/collections', [
				{ name: 'site_id', in: 'path', required: true },
			]),
		],
	},
	pipedrive: {
		baseUrl: 'https://api.pipedrive.com/v1',
		tools: [
			tool('list_deals', 'List deals.', 'GET', '/deals', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_persons', 'List persons.', 'GET', '/persons', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('search_deals', 'Search deals.', 'GET', '/deals/search', [{ name: 'term', in: 'query', required: true }]),
		],
	},
	sentry: {
		baseUrl: 'https://sentry.io/api/0',
		tools: [
			tool('list_projects', 'List your projects.', 'GET', '/projects/', []),
			tool('list_issues', 'List issues for a project.', 'GET', '/projects/{org}/{project}/issues/', [
				{ name: 'org', in: 'path', required: true },
				{ name: 'project', in: 'path', required: true },
			]),
		],
	},
	posthog: {
		baseUrl: 'https://us.posthog.com',
		tools: [
			tool('list_projects', 'List your projects.', 'GET', '/api/projects/', []),
			tool('list_insights', 'List insights for a project.', 'GET', '/api/projects/{project_id}/insights/', [
				{ name: 'project_id', in: 'path', required: true },
			]),
		],
	},
	mapbox: {
		baseUrl: 'https://api.mapbox.com',
		tools: [
			tool('geocode', 'Forward geocode a place name.', 'GET', '/geocoding/v5/mapbox.places/{query}.json', [
				{ name: 'query', in: 'path', required: true, description: 'Place to look up' },
			]),
		],
	},
	// --- No-auth utility APIs (work out of the box, no credentials) ---
	coingecko: {
		baseUrl: 'https://api.coingecko.com/api/v3',
		tools: [
			tool('simple_price', 'Crypto prices.', 'GET', '/simple/price', [
				{ name: 'ids', in: 'query', required: true, description: 'e.g. bitcoin,ethereum' },
				{ name: 'vs_currencies', in: 'query', required: true, description: 'e.g. usd,eur' },
			]),
			tool('coins_markets', 'Market data for coins.', 'GET', '/coins/markets', [
				{ name: 'vs_currency', in: 'query', required: true, description: 'e.g. usd' },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
		],
	},
	openmeteo: {
		baseUrl: 'https://api.open-meteo.com/v1',
		tools: [
			tool('forecast', 'Weather forecast by coordinates.', 'GET', '/forecast', [
				{ name: 'latitude', in: 'query', required: true, type: 'number' },
				{ name: 'longitude', in: 'query', required: true, type: 'number' },
				{ name: 'current', in: 'query', description: 'e.g. temperature_2m,wind_speed_10m' },
				{ name: 'daily', in: 'query', description: 'e.g. temperature_2m_max' },
			]),
		],
	},
	restcountries: {
		baseUrl: 'https://restcountries.com/v3.1',
		tools: [
			tool('by_name', 'Look up a country by name.', 'GET', '/name/{name}', [{ name: 'name', in: 'path', required: true }]),
			tool('all_countries', 'List countries (fields required).', 'GET', '/all', [
				{ name: 'fields', in: 'query', required: true, description: 'e.g. name,capital,region' },
			]),
		],
	},
	frankfurter: {
		baseUrl: 'https://api.frankfurter.dev/v1',
		tools: [
			tool('latest_rates', 'Latest FX rates.', 'GET', '/latest', [
				{ name: 'base', in: 'query', description: 'e.g. USD' },
				{ name: 'symbols', in: 'query', description: 'e.g. EUR,GBP' },
			]),
		],
	},
	hackernews: {
		baseUrl: 'https://hacker-news.firebaseio.com/v0',
		tools: [
			tool('top_stories', 'IDs of the top stories.', 'GET', '/topstories.json', []),
			tool('get_item', 'Get a story/comment by id.', 'GET', '/item/{id}.json', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	// --- Keyed ---
	ipinfo: {
		baseUrl: 'https://ipinfo.io',
		tools: [tool('lookup_ip', 'Geolocate an IP address.', 'GET', '/{ip}/json', [{ name: 'ip', in: 'path', required: true }])],
	},
	shortcut: {
		baseUrl: 'https://api.app.shortcut.com/api/v3',
		tools: [
			tool('get_current_member', 'Get the current member.', 'GET', '/member', []),
			tool('list_projects', 'List projects.', 'GET', '/projects', []),
		],
	},
	bitbucket: {
		baseUrl: 'https://api.bitbucket.org/2.0',
		tools: [
			tool('get_user', 'Get the authenticated user.', 'GET', '/user', []),
			tool('list_workspaces', 'List your workspaces.', 'GET', '/workspaces', []),
		],
	},
	// --- More no-auth APIs ---
	pokeapi: {
		baseUrl: 'https://pokeapi.co/api/v2',
		tools: [
			tool('get_pokemon', 'Get a Pokémon by name or id.', 'GET', '/pokemon/{name}', [{ name: 'name', in: 'path', required: true }]),
			tool('list_pokemon', 'List Pokémon.', 'GET', '/pokemon', [
				{ name: 'limit', in: 'query', type: 'integer' },
				{ name: 'offset', in: 'query', type: 'integer' },
			]),
		],
	},
	openlibrary: {
		baseUrl: 'https://openlibrary.org',
		tools: [
			tool('search_books', 'Search books.', 'GET', '/search.json', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
		],
	},
	jsonplaceholder: {
		baseUrl: 'https://jsonplaceholder.typicode.com',
		tools: [
			tool('list_posts', 'List sample posts.', 'GET', '/posts', [{ name: 'userId', in: 'query', type: 'integer' }]),
			tool('get_post', 'Get a post by id.', 'GET', '/posts/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('create_post', 'Create a (fake) post.', 'POST', '/posts', [
				{ name: 'title', in: 'body', required: true },
				{ name: 'body', in: 'body' },
				{ name: 'userId', in: 'body', type: 'integer' },
			]),
		],
	},
	dogceo: {
		baseUrl: 'https://dog.ceo/api',
		tools: [
			tool('random_dog', 'Random dog image.', 'GET', '/breeds/image/random', []),
			tool('list_breeds', 'List all breeds.', 'GET', '/breeds/list/all', []),
		],
	},
	// --- Finance / media (keyed) ---
	alphavantage: {
		baseUrl: 'https://www.alphavantage.co',
		tools: [
			tool('quote', 'Stock data. Set function (e.g. GLOBAL_QUOTE) + symbol.', 'GET', '/query', [
				{ name: 'function', in: 'query', required: true, description: 'e.g. GLOBAL_QUOTE, TIME_SERIES_DAILY' },
				{ name: 'symbol', in: 'query', required: true, description: 'e.g. IBM' },
			]),
		],
	},
	finnhub: {
		baseUrl: 'https://finnhub.io/api/v1',
		tools: [
			tool('quote', 'Real-time stock quote.', 'GET', '/quote', [{ name: 'symbol', in: 'query', required: true }]),
			tool('company_profile', 'Company profile.', 'GET', '/stock/profile2', [{ name: 'symbol', in: 'query', required: true }]),
		],
	},
	weatherapi: {
		baseUrl: 'https://api.weatherapi.com/v1',
		tools: [
			tool('current', 'Current weather.', 'GET', '/current.json', [{ name: 'q', in: 'query', required: true, description: 'City / lat,lon' }]),
			tool('forecast', 'Weather forecast.', 'GET', '/forecast.json', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'days', in: 'query', type: 'integer' },
			]),
		],
	},
	youtube: {
		baseUrl: 'https://www.googleapis.com/youtube/v3',
		tools: [
			tool('search', 'Search YouTube.', 'GET', '/search', [
				{ name: 'part', in: 'query', required: true, description: 'snippet' },
				{ name: 'q', in: 'query', required: true },
				{ name: 'maxResults', in: 'query', type: 'integer' },
			]),
		],
	},
	gnews: {
		baseUrl: 'https://gnews.io/api/v4',
		tools: [
			tool('search', 'Search news articles.', 'GET', '/search', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'lang', in: 'query', description: 'e.g. en' },
			]),
			tool('top_headlines', 'Top headlines.', 'GET', '/top-headlines', [{ name: 'category', in: 'query' }]),
		],
	},
	// --- Shipping & accounting (enterprise) ---
	fedex: {
		baseUrl: 'https://apis.fedex.com',
		tools: [
			tool('track_by_number', 'Track shipments by tracking number.', 'POST', '/track/v1/trackingnumbers', [
				{
					name: 'body',
					in: 'body',
					required: true,
					type: 'object',
					description:
						'FedEx track payload, e.g. {"trackingInfo":[{"trackingNumberInfo":{"trackingNumber":"123456789012"}}],"includeDetailedScans":true}',
				},
			]),
			tool('validate_address', 'Resolve/validate an address.', 'POST', '/address/v1/addresses/resolve', [
				{
					name: 'body',
					in: 'body',
					required: true,
					type: 'object',
					description:
						'{"addressesToValidate":[{"address":{"streetLines":["7372 PARKRIDGE BLVD"],"city":"IRVING","stateOrProvinceCode":"TX","postalCode":"75063","countryCode":"US"}}]}',
				},
			]),
		],
	},
	quickbooks: {
		baseUrl: 'https://quickbooks.api.intuit.com',
		tools: [
			tool('query', 'Run a QuickBooks query (SQL-like).', 'GET', '/v3/company/{realmId}/query', [
				{ name: 'realmId', in: 'path', required: true, description: 'Company (realm) id from the OAuth connection' },
				{ name: 'query', in: 'query', required: true, description: 'e.g. select * from Customer maxresults 10' },
				{ name: 'minorversion', in: 'query', description: 'e.g. 65' },
			]),
			tool('company_info', 'Get company info.', 'GET', '/v3/company/{realmId}/companyinfo/{realmId}', [
				{ name: 'realmId', in: 'path', required: true },
			]),
		],
	},
	square: {
		baseUrl: 'https://connect.squareup.com',
		tools: [
			tool('list_locations', 'List business locations.', 'GET', '/v2/locations', []),
			tool('list_payments', 'List payments.', 'GET', '/v2/payments', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_customers', 'List customers.', 'GET', '/v2/customers', []),
		],
	},
	shippo: {
		baseUrl: 'https://api.goshippo.com',
		tools: [
			tool('list_shipments', 'List shipments.', 'GET', '/shipments', []),
			tool('track_status', 'Track a shipment.', 'GET', '/tracks/{carrier}/{tracking_number}', [
				{ name: 'carrier', in: 'path', required: true, description: 'e.g. usps, fedex, ups' },
				{ name: 'tracking_number', in: 'path', required: true },
			]),
		],
	},
	easypost: {
		baseUrl: 'https://api.easypost.com/v2',
		tools: [
			tool('list_trackers', 'List trackers.', 'GET', '/trackers', [{ name: 'page_size', in: 'query', type: 'integer' }]),
			tool('get_tracker', 'Retrieve a tracker.', 'GET', '/trackers/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	shipengine: {
		baseUrl: 'https://api.shipengine.com',
		tools: [
			tool('list_carriers', 'List connected carriers.', 'GET', '/v1/carriers', []),
			tool('track', 'Track a package.', 'GET', '/v1/tracking', [
				{ name: 'carrier_code', in: 'query', required: true, description: 'e.g. ups, fedex, usps' },
				{ name: 'tracking_number', in: 'query', required: true },
			]),
		],
	},
	// --- Payments / dev / AI / Google / Microsoft ---
	paypal: {
		baseUrl: 'https://api-m.paypal.com',
		tools: [
			tool('list_invoices', 'List invoices.', 'GET', '/v2/invoicing/invoices', [
				{ name: 'page_size', in: 'query', type: 'integer' },
				{ name: 'total_required', in: 'query', description: 'true/false' },
			]),
			tool('list_transactions', 'List transactions (last 31 days max).', 'GET', '/v1/reporting/transactions', [
				{ name: 'start_date', in: 'query', required: true, description: 'RFC3339, e.g. 2026-05-01T00:00:00Z' },
				{ name: 'end_date', in: 'query', required: true, description: 'RFC3339' },
			]),
		],
	},
	netlify: {
		baseUrl: 'https://api.netlify.com/api/v1',
		tools: [
			tool('list_sites', 'List your sites.', 'GET', '/sites', []),
			tool('get_site', 'Get a site by id.', 'GET', '/sites/{site_id}', [{ name: 'site_id', in: 'path', required: true }]),
			tool('list_deploys', 'List a site’s deploys.', 'GET', '/sites/{site_id}/deploys', [{ name: 'site_id', in: 'path', required: true }]),
		],
	},
	brevo: {
		baseUrl: 'https://api.brevo.com/v3',
		tools: [
			tool('get_account', 'Get account info.', 'GET', '/account', []),
			tool('list_contacts', 'List contacts.', 'GET', '/contacts', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('send_email', 'Send a transactional email.', 'POST', '/smtp/email', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "sender":{"email":"a@b.com"}, "to":[{"email":"c@d.com"}], "subject":"Hi", "htmlContent":"<p>Hi</p>" }' },
			]),
		],
	},
	postmark: {
		baseUrl: 'https://api.postmarkapp.com',
		tools: [
			tool('get_server', 'Get the server config.', 'GET', '/server', []),
			tool('send_email', 'Send an email.', 'POST', '/email', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "From":"a@b.com", "To":"c@d.com", "Subject":"Hi", "TextBody":"Hello" }' },
			]),
		],
	},
	cohere: {
		baseUrl: 'https://api.cohere.com',
		tools: [
			tool('list_models', 'List available models.', 'GET', '/v1/models', []),
			tool('chat', 'Chat completion.', 'POST', '/v2/chat', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "model":"command-r", "messages":[{"role":"user","content":"hi"}] }' },
			]),
		],
	},
	huggingface: {
		baseUrl: 'https://huggingface.co',
		tools: [
			tool('whoami', 'Get the authenticated user.', 'GET', '/api/whoami-v2', []),
			tool('list_models', 'Search models.', 'GET', '/api/models', [
				{ name: 'search', in: 'query' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
		],
	},
	replicate: {
		baseUrl: 'https://api.replicate.com/v1',
		tools: [
			tool('list_models', 'List public models.', 'GET', '/models', []),
			tool('get_prediction', 'Get a prediction.', 'GET', '/predictions/{prediction_id}', [
				{ name: 'prediction_id', in: 'path', required: true },
			]),
			tool('create_prediction', 'Run a model.', 'POST', '/predictions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "version":"<model version>", "input":{...} }' },
			]),
		],
	},
	elevenlabs: {
		baseUrl: 'https://api.elevenlabs.io',
		tools: [
			tool('list_voices', 'List available voices.', 'GET', '/v1/voices', []),
			tool('get_user', 'Get the user/subscription.', 'GET', '/v1/user', []),
		],
	},
	google_sheets: {
		baseUrl: 'https://sheets.googleapis.com/v4',
		tools: [
			tool('get_spreadsheet', 'Get spreadsheet metadata.', 'GET', '/spreadsheets/{spreadsheetId}', [
				{ name: 'spreadsheetId', in: 'path', required: true },
			]),
			tool('get_values', 'Read a range of cells.', 'GET', '/spreadsheets/{spreadsheetId}/values/{range}', [
				{ name: 'spreadsheetId', in: 'path', required: true },
				{ name: 'range', in: 'path', required: true, description: 'e.g. Sheet1!A1:C10' },
			]),
		],
	},
	gmail: {
		baseUrl: 'https://gmail.googleapis.com/gmail/v1',
		tools: [
			tool('list_messages', 'List/search messages.', 'GET', '/users/me/messages', [
				{ name: 'q', in: 'query', description: 'Gmail search, e.g. from:foo is:unread' },
				{ name: 'maxResults', in: 'query', type: 'integer' },
			]),
			tool('get_message', 'Get a message by id.', 'GET', '/users/me/messages/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	google_calendar: {
		baseUrl: 'https://www.googleapis.com/calendar/v3',
		tools: [
			tool('list_calendars', 'List calendars.', 'GET', '/users/me/calendarList', []),
			tool('list_events', 'List events on a calendar.', 'GET', '/calendars/{calendarId}/events', [
				{ name: 'calendarId', in: 'path', required: true, description: 'e.g. primary' },
				{ name: 'maxResults', in: 'query', type: 'integer' },
				{ name: 'timeMin', in: 'query', description: 'RFC3339 lower bound' },
			]),
		],
	},
	microsoft_graph: {
		baseUrl: 'https://graph.microsoft.com/v1.0',
		tools: [
			tool('me', 'Get the signed-in user.', 'GET', '/me', []),
			tool('list_messages', 'List Outlook messages.', 'GET', '/me/messages', [{ name: '$top', in: 'query', type: 'integer' }]),
			tool('list_events', 'List calendar events.', 'GET', '/me/events', [{ name: '$top', in: 'query', type: 'integer' }]),
		],
	},
	spotify: {
		baseUrl: 'https://api.spotify.com/v1',
		tools: [
			tool('get_me', 'Get the current user profile.', 'GET', '/me', []),
			tool('search', 'Search Spotify.', 'GET', '/search', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'type', in: 'query', required: true, description: 'track, artist, album, playlist' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('my_playlists', 'List the current user’s playlists.', 'GET', '/me/playlists', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	typeform: {
		baseUrl: 'https://api.typeform.com',
		tools: [
			tool('list_forms', 'List your forms.', 'GET', '/forms', [{ name: 'page_size', in: 'query', type: 'integer' }]),
			tool('get_responses', 'Get a form’s responses.', 'GET', '/forms/{form_id}/responses', [
				{ name: 'form_id', in: 'path', required: true },
				{ name: 'page_size', in: 'query', type: 'integer' },
			]),
		],
	},
	coda: {
		baseUrl: 'https://coda.io/apis/v1',
		tools: [
			tool('list_docs', 'List your docs.', 'GET', '/docs', []),
			tool('list_tables', 'List tables in a doc.', 'GET', '/docs/{docId}/tables', [{ name: 'docId', in: 'path', required: true }]),
		],
	},
	contentful: {
		baseUrl: 'https://api.contentful.com',
		tools: [
			tool('list_spaces', 'List spaces.', 'GET', '/spaces', []),
			tool('list_entries', 'List entries in a space.', 'GET', '/spaces/{space_id}/environments/master/entries', [
				{ name: 'space_id', in: 'path', required: true },
			]),
		],
	},
	storyblok: {
		baseUrl: 'https://api.storyblok.com/v2/cdn',
		tools: [
			tool('get_stories', 'List stories.', 'GET', '/stories', [{ name: 'per_page', in: 'query', type: 'integer' }]),
			tool('get_story', 'Get a story by slug.', 'GET', '/stories/{slug}', [{ name: 'slug', in: 'path', required: true }]),
		],
	},
	helpscout: {
		baseUrl: 'https://api.helpscout.net/v2',
		tools: [
			tool('list_mailboxes', 'List mailboxes.', 'GET', '/mailboxes', []),
			tool('list_conversations', 'List conversations.', 'GET', '/conversations', [{ name: 'status', in: 'query', description: 'active, closed, …' }]),
		],
	},
	pagerduty: {
		baseUrl: 'https://api.pagerduty.com',
		tools: [
			tool('list_incidents', 'List incidents.', 'GET', '/incidents', [{ name: 'statuses[]', in: 'query', description: 'triggered, acknowledged, resolved' }]),
			tool('list_services', 'List services.', 'GET', '/services', [{ name: 'limit', in: 'query', type: 'integer' }]),
		],
	},
	opsgenie: {
		baseUrl: 'https://api.opsgenie.com',
		tools: [
			tool('list_alerts', 'List alerts.', 'GET', '/v2/alerts', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_alert', 'Get an alert by id.', 'GET', '/v2/alerts/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	render: {
		baseUrl: 'https://api.render.com/v1',
		tools: [
			tool('list_services', 'List your services.', 'GET', '/services', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_deploys', 'List a service’s deploys.', 'GET', '/services/{serviceId}/deploys', [{ name: 'serviceId', in: 'path', required: true }]),
		],
	},
	lemonsqueezy: {
		baseUrl: 'https://api.lemonsqueezy.com/v1',
		tools: [
			tool('list_products', 'List products.', 'GET', '/products', []),
			tool('list_orders', 'List orders.', 'GET', '/orders', []),
		],
	},
	plausible: {
		baseUrl: 'https://plausible.io/api',
		tools: [
			tool('aggregate', 'Aggregate stats for a site.', 'GET', '/v1/stats/aggregate', [
				{ name: 'site_id', in: 'query', required: true, description: 'your domain' },
				{ name: 'metrics', in: 'query', description: 'e.g. visitors,pageviews' },
				{ name: 'period', in: 'query', description: 'e.g. 7d, 30d, month' },
			]),
			tool('timeseries', 'Stats over time.', 'GET', '/v1/stats/timeseries', [
				{ name: 'site_id', in: 'query', required: true },
				{ name: 'metrics', in: 'query' },
				{ name: 'period', in: 'query' },
			]),
		],
	},
	// --- AI providers ---
	groq: {
		baseUrl: 'https://api.groq.com/openai/v1',
		tools: [
			tool('list_models', 'List models.', 'GET', '/models', []),
			tool('chat', 'Chat completion (OpenAI-compatible).', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "model":"llama-3.3-70b-versatile", "messages":[{"role":"user","content":"hi"}] }' },
			]),
		],
	},
	mistral: {
		baseUrl: 'https://api.mistral.ai/v1',
		tools: [
			tool('list_models', 'List models.', 'GET', '/models', []),
			tool('chat', 'Chat completion.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "model":"mistral-small-latest", "messages":[{"role":"user","content":"hi"}] }' },
			]),
		],
	},
	perplexity: {
		baseUrl: 'https://api.perplexity.ai',
		tools: [
			tool('chat', 'Answer with citations.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "model":"sonar", "messages":[{"role":"user","content":"..."}] }' },
			]),
		],
	},
	together: {
		baseUrl: 'https://api.together.xyz/v1',
		tools: [
			tool('list_models', 'List models.', 'GET', '/models', []),
			tool('chat', 'Chat completion.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "model":"...", "messages":[...] }' },
			]),
		],
	},
	deepl: {
		baseUrl: 'https://api-free.deepl.com/v2',
		tools: [
			tool('usage', 'Check translation usage.', 'GET', '/usage', []),
			tool('translate', 'Translate text.', 'POST', '/translate', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{ "text":["Hello"], "target_lang":"DE" }' },
			]),
		],
	},
	stability: {
		baseUrl: 'https://api.stability.ai',
		tools: [tool('list_engines', 'List image engines.', 'GET', '/v1/engines/list', [])],
	},
	assemblyai: {
		baseUrl: 'https://api.assemblyai.com/v2',
		tools: [
			tool('list_transcripts', 'List transcripts.', 'GET', '/transcript', []),
			tool('get_transcript', 'Get a transcript by id.', 'GET', '/transcript/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	// --- Data / places / search ---
	yelp: {
		baseUrl: 'https://api.yelp.com/v3',
		tools: [
			tool('business_search', 'Search businesses.', 'GET', '/businesses/search', [
				{ name: 'location', in: 'query', required: true },
				{ name: 'term', in: 'query', description: 'e.g. coffee' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('business_details', 'Get a business by id.', 'GET', '/businesses/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	guardian: {
		baseUrl: 'https://content.guardianapis.com',
		tools: [
			tool('search', 'Search Guardian content.', 'GET', '/search', [
				{ name: 'q', in: 'query', description: 'Search query' },
				{ name: 'section', in: 'query' },
			]),
		],
	},
	omdb: {
		baseUrl: 'https://www.omdbapi.com',
		tools: [
			tool('by_title', 'Look up a movie by title.', 'GET', '/', [
				{ name: 't', in: 'query', required: true, description: 'Movie title' },
				{ name: 'y', in: 'query', description: 'Year' },
			]),
			tool('search', 'Search movies.', 'GET', '/', [{ name: 's', in: 'query', required: true, description: 'Search term' }]),
		],
	},
	ticketmaster: {
		baseUrl: 'https://app.ticketmaster.com/discovery/v2',
		tools: [
			tool('search_events', 'Search events.', 'GET', '/events.json', [
				{ name: 'keyword', in: 'query' },
				{ name: 'city', in: 'query' },
			]),
			tool('search_venues', 'Search venues.', 'GET', '/venues.json', [{ name: 'keyword', in: 'query' }]),
		],
	},
	hunter: {
		baseUrl: 'https://api.hunter.io/v2',
		tools: [
			tool('domain_search', 'Find emails for a domain.', 'GET', '/domain-search', [{ name: 'domain', in: 'query', required: true }]),
			tool('email_verifier', 'Verify an email address.', 'GET', '/email-verifier', [{ name: 'email', in: 'query', required: true }]),
		],
	},
	// --- Productivity / dev / marketing / billing ---
	clockify: {
		baseUrl: 'https://api.clockify.me/api/v1',
		tools: [
			tool('get_user', 'Get the current user.', 'GET', '/user', []),
			tool('list_workspaces', 'List workspaces.', 'GET', '/workspaces', []),
		],
	},
	miro: {
		baseUrl: 'https://api.miro.com/v2',
		tools: [
			tool('list_boards', 'List boards.', 'GET', '/boards', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_board', 'Get a board by id.', 'GET', '/boards/{board_id}', [{ name: 'board_id', in: 'path', required: true }]),
		],
	},
	front: {
		baseUrl: 'https://api2.frontapp.com',
		tools: [
			tool('list_conversations', 'List conversations.', 'GET', '/conversations', []),
			tool('list_contacts', 'List contacts.', 'GET', '/contacts', []),
		],
	},
	productboard: {
		baseUrl: 'https://api.productboard.com',
		tools: [
			tool('list_features', 'List features.', 'GET', '/features', []),
			tool('list_products', 'List products.', 'GET', '/products', []),
		],
	},
	klaviyo: {
		baseUrl: 'https://a.klaviyo.com/api',
		tools: [
			tool('get_profiles', 'List profiles.', 'GET', '/profiles', []),
			tool('get_lists', 'List lists.', 'GET', '/lists', []),
		],
	},
	newrelic: {
		baseUrl: 'https://api.newrelic.com/v2',
		tools: [tool('list_applications', 'List APM applications.', 'GET', '/applications.json', [])],
	},
	neon: {
		baseUrl: 'https://console.neon.tech/api/v2',
		tools: [
			tool('list_projects', 'List Neon projects.', 'GET', '/projects', []),
			tool('get_project', 'Get a project by id.', 'GET', '/projects/{project_id}', [{ name: 'project_id', in: 'path', required: true }]),
		],
	},
	telnyx: {
		baseUrl: 'https://api.telnyx.com/v2',
		tools: [
			tool('list_messaging_profiles', 'List messaging profiles.', 'GET', '/messaging_profiles', []),
			tool('list_phone_numbers', 'List phone numbers.', 'GET', '/phone_numbers', []),
		],
	},
	gumroad: {
		baseUrl: 'https://api.gumroad.com/v2',
		tools: [
			tool('list_products', 'List products.', 'GET', '/products', []),
			tool('list_sales', 'List sales.', 'GET', '/sales', []),
		],
	},
	paddle: {
		baseUrl: 'https://api.paddle.com',
		tools: [
			tool('list_products', 'List products.', 'GET', '/products', []),
			tool('list_transactions', 'List transactions.', 'GET', '/transactions', []),
		],
	},
	messagebird: {
		baseUrl: 'https://rest.messagebird.com',
		tools: [
			tool('get_balance', 'Check account balance.', 'GET', '/balance', []),
			tool('list_messages', 'List SMS messages.', 'GET', '/messages', []),
		],
	},
	calcom: {
		baseUrl: 'https://api.cal.com/v2',
		tools: [
			tool('get_me', 'Get the current user.', 'GET', '/me', []),
			tool('list_bookings', 'List bookings.', 'GET', '/bookings', []),
		],
	},
	// --- CRM / search / finance / media ---
	salesforce: {
		baseUrl: 'https://login.salesforce.com',
		tools: [
			tool('soql_query', 'Run a SOQL query.', 'GET', '/services/data/v60.0/query', [
				{ name: 'q', in: 'query', required: true, description: 'e.g. SELECT Id, Name FROM Account LIMIT 10' },
			]),
			tool('list_sobjects', 'List available objects.', 'GET', '/services/data/v60.0/sobjects', []),
			tool('get_record', 'Get a record by type + id.', 'GET', '/services/data/v60.0/sobjects/{sobject}/{id}', [
				{ name: 'sobject', in: 'path', required: true, description: 'e.g. Account, Contact' },
				{ name: 'id', in: 'path', required: true },
			]),
		],
	},
	tavily: {
		baseUrl: 'https://api.tavily.com',
		tools: [
			tool('search', 'AI web search.', 'POST', '/search', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"query":"latest AI news","max_results":5}' },
			]),
		],
	},
	serpapi: {
		baseUrl: 'https://serpapi.com',
		tools: [
			tool('search', 'Search engine results.', 'GET', '/search', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'engine', in: 'query', description: 'google, bing, duckduckgo…' },
			]),
		],
	},
	apify: {
		baseUrl: 'https://api.apify.com/v2',
		tools: [
			tool('list_actors', 'List your actors.', 'GET', '/acts', []),
			tool('list_datasets', 'List datasets.', 'GET', '/datasets', []),
		],
	},
	coinmarketcap: {
		baseUrl: 'https://pro-api.coinmarketcap.com/v1',
		tools: [
			tool('listings_latest', 'Latest crypto listings.', 'GET', '/cryptocurrency/listings/latest', [
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('quotes_latest', 'Quotes for symbols.', 'GET', '/cryptocurrency/quotes/latest', [
				{ name: 'symbol', in: 'query', required: true, description: 'e.g. BTC,ETH' },
			]),
		],
	},
	polygon: {
		baseUrl: 'https://api.polygon.io',
		tools: [
			tool('list_tickers', 'List/search tickers.', 'GET', '/v3/reference/tickers', [
				{ name: 'search', in: 'query' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('ticker_details', 'Ticker details.', 'GET', '/v3/reference/tickers/{ticker}', [{ name: 'ticker', in: 'path', required: true }]),
		],
	},
	newsdata: {
		baseUrl: 'https://newsdata.io/api/1',
		tools: [
			tool('latest_news', 'Latest news.', 'GET', '/news', [
				{ name: 'q', in: 'query' },
				{ name: 'country', in: 'query', description: 'e.g. us,in' },
			]),
		],
	},
	pixabay: {
		baseUrl: 'https://pixabay.com/api',
		tools: [tool('search_images', 'Search free images.', 'GET', '/', [{ name: 'q', in: 'query', required: true }])],
	},
	lastfm: {
		baseUrl: 'https://ws.audioscrobbler.com/2.0',
		tools: [
			tool('artist_info', 'Get artist info.', 'GET', '/', [
				{ name: 'method', in: 'query', required: true, description: 'e.g. artist.getinfo' },
				{ name: 'artist', in: 'query', description: 'Artist name' },
				{ name: 'format', in: 'query', description: 'use json' },
			]),
		],
	},
	tenor: {
		baseUrl: 'https://tenor.googleapis.com/v2',
		tools: [tool('search_gifs', 'Search GIFs.', 'GET', '/search', [{ name: 'q', in: 'query', required: true }])],
	},
	wordpress: {
		baseUrl: 'https://public-api.wordpress.com/rest/v1.1',
		tools: [
			tool('get_me', 'Get the WordPress.com user.', 'GET', '/me', []),
			tool('list_sites', 'List your sites.', 'GET', '/me/sites', []),
		],
	},
};

// QuickBooks sandbox shares the same tools but a different API base host.
CATALOG.quickbooks_sandbox = {
	baseUrl: 'https://sandbox-quickbooks.api.intuit.com',
	tools: CATALOG.quickbooks.tools,
};

// FedEx sandbox shares the same tools but the test host.
CATALOG.fedex_sandbox = {
	baseUrl: 'https://apis-sandbox.fedex.com',
	tools: CATALOG.fedex.tools,
};

// PayPal & Square sandboxes use distinct test hosts.
CATALOG.paypal_sandbox = { baseUrl: 'https://api-m.sandbox.paypal.com', tools: CATALOG.paypal.tools };
CATALOG.square_sandbox = { baseUrl: 'https://connect.squareupsandbox.com', tools: CATALOG.square.tools };

export function getCatalogConnector(slug: string): CatalogConnector | null {
	return CATALOG[slug] || null;
}
