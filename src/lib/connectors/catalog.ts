import type { GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

// Predefined tool sets for the seeded catalog connectors (app_definitions rows
// in migration 003). Each connection of connector_type='catalog' copies these
// into mcp_tools at creation time. Keeping them small and curated gives a
// good out-of-the-box experience without parsing a huge vendor OpenAPI spec.

export interface CatalogConnector {
	baseUrl: string;
	tools: GeneratedTool[];
}

function tool(
	name: string,
	description: string,
	method: string,
	path: string,
	params: Array<{ name: string; in: 'path' | 'query' | 'header' | 'body'; required?: boolean; type?: string; description?: string }>
): GeneratedTool {
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
			tool('list_charges', 'List recent charges.', 'GET', '/v1/charges', [
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
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
};

export function getCatalogConnector(slug: string): CatalogConnector | null {
	return CATALOG[slug] || null;
}
