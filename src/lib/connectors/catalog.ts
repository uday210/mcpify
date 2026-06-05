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
};

export function getCatalogConnector(slug: string): CatalogConnector | null {
	return CATALOG[slug] || null;
}
