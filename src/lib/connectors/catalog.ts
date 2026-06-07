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
			tool('get_user', 'Get a user by username.', 'GET', '/users/{username}', [{ name: 'username', in: 'path', required: true }]),
			tool('list_my_repos', 'List repositories for the authenticated user.', 'GET', '/user/repos', [
				{ name: 'per_page', in: 'query', type: 'integer', description: 'Results per page (max 100)' },
				{ name: 'sort', in: 'query', description: 'created, updated, pushed, full_name' },
				{ name: 'visibility', in: 'query', description: 'all, public, or private' },
			]),
			tool('list_org_repos', 'List an organization’s repositories.', 'GET', '/orgs/{org}/repos', [
				{ name: 'org', in: 'path', required: true },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('get_repo', 'Get a repository by owner and name.', 'GET', '/repos/{owner}/{repo}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('list_branches', 'List a repo’s branches.', 'GET', '/repos/{owner}/{repo}/branches', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('list_commits', 'List commits on a repo.', 'GET', '/repos/{owner}/{repo}/commits', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'sha', in: 'query', description: 'Branch or commit SHA' },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('get_readme', 'Get a repo’s README (base64).', 'GET', '/repos/{owner}/{repo}/readme', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('list_issues', 'List issues in a repository.', 'GET', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'open, closed, or all' },
				{ name: 'labels', in: 'query', description: 'comma-separated label names' },
			]),
			tool('get_issue', 'Get a single issue.', 'GET', '/repos/{owner}/{repo}/issues/{issue_number}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'issue_number', in: 'path', required: true },
			]),
			tool('create_issue', 'Create an issue in a repository.', 'POST', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'title', in: 'body', required: true },
				{ name: 'body', in: 'body', description: 'Issue body (markdown)' },
				{ name: 'labels', in: 'body', type: 'array' },
				{ name: 'assignees', in: 'body', type: 'array' },
			]),
			tool('update_issue', 'Update or close an issue.', 'PATCH', '/repos/{owner}/{repo}/issues/{issue_number}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'issue_number', in: 'path', required: true },
				{ name: 'title', in: 'body' },
				{ name: 'body', in: 'body' },
				{ name: 'state', in: 'body', description: 'open or closed' },
			]),
			tool('list_issue_comments', 'List comments on an issue.', 'GET', '/repos/{owner}/{repo}/issues/{issue_number}/comments', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'issue_number', in: 'path', required: true },
			]),
			tool('create_issue_comment', 'Comment on an issue or PR.', 'POST', '/repos/{owner}/{repo}/issues/{issue_number}/comments', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'issue_number', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true },
			]),
			tool('list_pull_requests', 'List pull requests.', 'GET', '/repos/{owner}/{repo}/pulls', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'open, closed, all' },
			]),
			tool('get_pull_request', 'Get a pull request.', 'GET', '/repos/{owner}/{repo}/pulls/{pull_number}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'pull_number', in: 'path', required: true },
			]),
			tool('create_pull_request', 'Open a pull request.', 'POST', '/repos/{owner}/{repo}/pulls', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'title', in: 'body', required: true },
				{ name: 'head', in: 'body', required: true, description: 'source branch' },
				{ name: 'base', in: 'body', required: true, description: 'target branch' },
				{ name: 'body', in: 'body' },
			]),
			tool('merge_pull_request', 'Merge a pull request.', 'PUT', '/repos/{owner}/{repo}/pulls/{pull_number}/merge', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'pull_number', in: 'path', required: true },
				{ name: 'merge_method', in: 'body', description: 'merge, squash, or rebase' },
			]),
			tool('list_workflow_runs', 'List GitHub Actions runs.', 'GET', '/repos/{owner}/{repo}/actions/runs', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('search_repositories', 'Search public repositories.', 'GET', '/search/repositories', [
				{ name: 'q', in: 'query', required: true, description: 'Search query' },
				{ name: 'per_page', in: 'query', type: 'integer' },
			]),
			tool('search_code', 'Search code.', 'GET', '/search/code', [
				{ name: 'q', in: 'query', required: true, description: 'e.g. addClass repo:owner/name' },
			]),
			tool('search_issues', 'Search issues and PRs.', 'GET', '/search/issues', [
				{ name: 'q', in: 'query', required: true, description: 'e.g. is:open is:issue repo:owner/name' },
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
			tool('get_customer', 'Retrieve a Stripe customer by id.', 'GET', '/v1/customers/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('search_customers', 'Search customers (query language).', 'GET', '/v1/customers/search', [
				{ name: 'query', in: 'query', required: true, description: "e.g. email:'a@b.com'" },
			]),
			tool('list_charges', 'List recent charges.', 'GET', '/v1/charges', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_charge', 'Retrieve a charge.', 'GET', '/v1/charges/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_payment_intents', 'List payment intents.', 'GET', '/v1/payment_intents', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_payment_intent', 'Retrieve a payment intent.', 'GET', '/v1/payment_intents/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_invoices', 'List invoices.', 'GET', '/v1/invoices', [
				{ name: 'limit', in: 'query', type: 'integer' },
				{ name: 'status', in: 'query', description: 'draft, open, paid, uncollectible, void' },
			]),
			tool('get_invoice', 'Retrieve an invoice.', 'GET', '/v1/invoices/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_subscriptions', 'List subscriptions.', 'GET', '/v1/subscriptions', [
				{ name: 'limit', in: 'query', type: 'integer' },
				{ name: 'status', in: 'query' },
			]),
			tool('get_subscription', 'Retrieve a subscription.', 'GET', '/v1/subscriptions/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_products', 'List products.', 'GET', '/v1/products', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_prices', 'List prices.', 'GET', '/v1/prices', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_refunds', 'List refunds.', 'GET', '/v1/refunds', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_payouts', 'List payouts.', 'GET', '/v1/payouts', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_disputes', 'List disputes.', 'GET', '/v1/disputes', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_events', 'List recent events.', 'GET', '/v1/events', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_balance', 'Retrieve account balance.', 'GET', '/v1/balance', []),
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
				{ name: 'filter', in: 'body', type: 'object', description: '{"property":"object","value":"page"}' },
			]),
			tool('list_users', 'List workspace users.', 'GET', '/v1/users', []),
			tool('get_user', 'Retrieve a user.', 'GET', '/v1/users/{user_id}', [{ name: 'user_id', in: 'path', required: true }]),
			tool('get_page', 'Retrieve a page by id.', 'GET', '/v1/pages/{page_id}', [{ name: 'page_id', in: 'path', required: true }]),
			tool('create_page', 'Create a page.', 'POST', '/v1/pages', [
				{ name: 'body', in: 'body', required: true, description: '{"parent":{"database_id":"..."},"properties":{...}}' },
			]),
			tool('update_page', 'Update page properties or archive it.', 'PATCH', '/v1/pages/{page_id}', [
				{ name: 'page_id', in: 'path', required: true },
				{ name: 'properties', in: 'body', type: 'object' },
				{ name: 'archived', in: 'body', type: 'boolean' },
			]),
			tool('get_database', 'Retrieve a database by id.', 'GET', '/v1/databases/{database_id}', [{ name: 'database_id', in: 'path', required: true }]),
			tool('query_database', 'Query rows in a database.', 'POST', '/v1/databases/{database_id}/query', [
				{ name: 'database_id', in: 'path', required: true },
				{ name: 'filter', in: 'body', type: 'object' },
				{ name: 'sorts', in: 'body', type: 'array' },
				{ name: 'page_size', in: 'body', type: 'integer' },
			]),
			tool('get_block_children', 'List a block/page’s child blocks.', 'GET', '/v1/blocks/{block_id}/children', [
				{ name: 'block_id', in: 'path', required: true },
			]),
			tool('append_block_children', 'Append blocks to a page/block.', 'PATCH', '/v1/blocks/{block_id}/children', [
				{ name: 'block_id', in: 'path', required: true },
				{ name: 'children', in: 'body', required: true, type: 'array' },
			]),
			tool('create_comment', 'Add a comment to a page.', 'POST', '/v1/comments', [
				{ name: 'body', in: 'body', required: true, description: '{"parent":{"page_id":"..."},"rich_text":[{"text":{"content":"hi"}}]}' },
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
			tool('conversations_info', 'Get a channel’s info.', 'GET', '/conversations.info', [{ name: 'channel', in: 'query', required: true }]),
			tool('conversations_history', 'Fetch a channel’s messages.', 'GET', '/conversations.history', [
				{ name: 'channel', in: 'query', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('conversations_replies', 'Fetch a thread’s replies.', 'GET', '/conversations.replies', [
				{ name: 'channel', in: 'query', required: true },
				{ name: 'ts', in: 'query', required: true, description: 'Parent message ts' },
			]),
			tool('conversations_members', 'List members of a channel.', 'GET', '/conversations.members', [{ name: 'channel', in: 'query', required: true }]),
			tool('post_message', 'Post a message to a channel.', 'POST', '/chat.postMessage', [
				{ name: 'channel', in: 'body', required: true },
				{ name: 'text', in: 'body', required: true },
				{ name: 'thread_ts', in: 'body', description: 'Reply in a thread' },
				{ name: 'blocks', in: 'body', type: 'array' },
			]),
			tool('update_message', 'Edit a message.', 'POST', '/chat.update', [
				{ name: 'channel', in: 'body', required: true },
				{ name: 'ts', in: 'body', required: true },
				{ name: 'text', in: 'body', required: true },
			]),
			tool('delete_message', 'Delete a message.', 'POST', '/chat.delete', [
				{ name: 'channel', in: 'body', required: true },
				{ name: 'ts', in: 'body', required: true },
			]),
			tool('add_reaction', 'Add an emoji reaction.', 'POST', '/reactions.add', [
				{ name: 'channel', in: 'body', required: true },
				{ name: 'timestamp', in: 'body', required: true },
				{ name: 'name', in: 'body', required: true, description: 'emoji name without colons' },
			]),
			tool('list_users', 'List workspace users.', 'GET', '/users.list', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('users_info', 'Get a user’s profile.', 'GET', '/users.info', [{ name: 'user', in: 'query', required: true }]),
			tool('search_messages', 'Search messages (user token).', 'GET', '/search.messages', [{ name: 'query', in: 'query', required: true }]),
		],
	},
	airtable: {
		baseUrl: 'https://api.airtable.com/v0',
		tools: [
			tool('list_bases', 'List accessible bases.', 'GET', '/meta/bases', []),
			tool('list_tables', 'List tables/fields in a base.', 'GET', '/meta/bases/{baseId}/tables', [{ name: 'baseId', in: 'path', required: true }]),
			tool('list_records', 'List records in a table.', 'GET', '/{baseId}/{table}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true, description: 'Table id or name' },
				{ name: 'maxRecords', in: 'query', type: 'integer' },
				{ name: 'view', in: 'query' },
				{ name: 'filterByFormula', in: 'query', description: "e.g. {Status}='Done'" },
			]),
			tool('get_record', 'Get one record.', 'GET', '/{baseId}/{table}/{recordId}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true },
				{ name: 'recordId', in: 'path', required: true },
			]),
			tool('create_record', 'Create a record.', 'POST', '/{baseId}/{table}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true },
				{ name: 'fields', in: 'body', required: true, type: 'object' },
			]),
			tool('update_record', 'Update a record’s fields.', 'PATCH', '/{baseId}/{table}/{recordId}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true },
				{ name: 'recordId', in: 'path', required: true },
				{ name: 'fields', in: 'body', required: true, type: 'object' },
			]),
			tool('delete_record', 'Delete a record.', 'DELETE', '/{baseId}/{table}/{recordId}', [
				{ name: 'baseId', in: 'path', required: true },
				{ name: 'table', in: 'path', required: true },
				{ name: 'recordId', in: 'path', required: true },
			]),
		],
	},
	hubspot: {
		baseUrl: 'https://api.hubapi.com',
		tools: [
			tool('list_contacts', 'List CRM contacts.', 'GET', '/crm/v3/objects/contacts', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_contact', 'Get a contact by id.', 'GET', '/crm/v3/objects/contacts/{contactId}', [{ name: 'contactId', in: 'path', required: true }]),
			tool('create_contact', 'Create a contact.', 'POST', '/crm/v3/objects/contacts', [
				{ name: 'properties', in: 'body', required: true, type: 'object', description: 'e.g. { "email": "a@b.com" }' },
			]),
			tool('update_contact', 'Update a contact.', 'PATCH', '/crm/v3/objects/contacts/{contactId}', [
				{ name: 'contactId', in: 'path', required: true },
				{ name: 'properties', in: 'body', required: true, type: 'object' },
			]),
			tool('search_contacts', 'Search contacts.', 'POST', '/crm/v3/objects/contacts/search', [
				{ name: 'body', in: 'body', required: true, description: '{"filterGroups":[{"filters":[{"propertyName":"email","operator":"EQ","value":"a@b.com"}]}]}' },
			]),
			tool('list_companies', 'List companies.', 'GET', '/crm/v3/objects/companies', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_company', 'Get a company.', 'GET', '/crm/v3/objects/companies/{companyId}', [{ name: 'companyId', in: 'path', required: true }]),
			tool('list_deals', 'List CRM deals.', 'GET', '/crm/v3/objects/deals', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_deal', 'Get a deal.', 'GET', '/crm/v3/objects/deals/{dealId}', [{ name: 'dealId', in: 'path', required: true }]),
			tool('create_deal', 'Create a deal.', 'POST', '/crm/v3/objects/deals', [
				{ name: 'properties', in: 'body', required: true, type: 'object', description: 'e.g. { "dealname": "New deal", "amount": "1000" }' },
			]),
			tool('list_tickets', 'List support tickets.', 'GET', '/crm/v3/objects/tickets', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_owners', 'List CRM owners/users.', 'GET', '/crm/v3/owners', []),
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
			tool('get_issue', 'Get one issue.', 'GET', '/projects/{id}/issues/{issue_iid}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'issue_iid', in: 'path', required: true },
			]),
			tool('create_issue', 'Create an issue.', 'POST', '/projects/{id}/issues', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'title', in: 'body', required: true },
				{ name: 'description', in: 'body' },
				{ name: 'labels', in: 'body', description: 'comma-separated' },
			]),
			tool('list_merge_requests', 'List merge requests.', 'GET', '/projects/{id}/merge_requests', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'opened, closed, merged, all' },
			]),
			tool('get_merge_request', 'Get a merge request.', 'GET', '/projects/{id}/merge_requests/{mr_iid}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'mr_iid', in: 'path', required: true },
			]),
			tool('create_merge_request', 'Open a merge request.', 'POST', '/projects/{id}/merge_requests', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'source_branch', in: 'body', required: true },
				{ name: 'target_branch', in: 'body', required: true },
				{ name: 'title', in: 'body', required: true },
			]),
			tool('list_branches', 'List branches.', 'GET', '/projects/{id}/repository/branches', [{ name: 'id', in: 'path', required: true }]),
			tool('list_commits', 'List commits.', 'GET', '/projects/{id}/repository/commits', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'ref_name', in: 'query' },
			]),
			tool('list_pipelines', 'List CI pipelines.', 'GET', '/projects/{id}/pipelines', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	sendgrid: {
		baseUrl: 'https://api.sendgrid.com/v3',
		tools: [
			tool('send_mail', 'Send an email.', 'POST', '/mail/send', [
				{ name: 'body', in: 'body', required: true, description: '{"personalizations":[{"to":[{"email":"a@b.com"}]}],"from":{"email":"you@d.com"},"subject":"Hi","content":[{"type":"text/plain","value":"Hello"}]}' },
			]),
			tool('list_templates', 'List email templates.', 'GET', '/templates', [{ name: 'generations', in: 'query', description: 'legacy or dynamic' }]),
			tool('get_stats', 'Email statistics.', 'GET', '/stats', [
				{ name: 'start_date', in: 'query', required: true, description: 'YYYY-MM-DD' },
				{ name: 'end_date', in: 'query', description: 'YYYY-MM-DD' },
			]),
			tool('list_bounces', 'List bounced addresses.', 'GET', '/suppression/bounces', []),
			tool('list_marketing_contacts', 'List marketing contacts (sample).', 'GET', '/marketing/contacts', []),
			tool('get_account', 'Account type + reputation.', 'GET', '/user/account', []),
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
			tool('get_task', 'Get a task.', 'GET', '/tasks/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('create_task', 'Create a task.', 'POST', '/tasks', [
				{ name: 'content', in: 'body', required: true, description: 'Task text' },
				{ name: 'description', in: 'body' },
				{ name: 'project_id', in: 'body' },
				{ name: 'priority', in: 'body', type: 'integer', description: '1-4' },
				{ name: 'due_string', in: 'body', description: 'e.g. "tomorrow 9am"' },
			]),
			tool('update_task', 'Update a task.', 'POST', '/tasks/{id}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'content', in: 'body' },
				{ name: 'due_string', in: 'body' },
				{ name: 'priority', in: 'body', type: 'integer' },
			]),
			tool('close_task', 'Complete a task.', 'POST', '/tasks/{id}/close', [{ name: 'id', in: 'path', required: true }]),
			tool('reopen_task', 'Reopen a task.', 'POST', '/tasks/{id}/reopen', [{ name: 'id', in: 'path', required: true }]),
			tool('get_projects', 'List projects.', 'GET', '/projects', []),
			tool('create_project', 'Create a project.', 'POST', '/projects', [{ name: 'name', in: 'body', required: true }]),
			tool('get_labels', 'List labels.', 'GET', '/labels', []),
		],
	},
	asana: {
		baseUrl: 'https://app.asana.com/api/1.0',
		tools: [
			tool('get_me', 'Get the authenticated user.', 'GET', '/users/me', []),
			tool('list_workspaces', 'List workspaces.', 'GET', '/workspaces', []),
			tool('list_projects', 'List projects in a workspace.', 'GET', '/projects', [{ name: 'workspace', in: 'query' }]),
			tool('get_project', 'Get a project.', 'GET', '/projects/{project_gid}', [{ name: 'project_gid', in: 'path', required: true }]),
			tool('list_tasks', 'List tasks in a project.', 'GET', '/projects/{project_gid}/tasks', [{ name: 'project_gid', in: 'path', required: true }]),
			tool('get_task', 'Get a task.', 'GET', '/tasks/{task_gid}', [{ name: 'task_gid', in: 'path', required: true }]),
			tool('create_task', 'Create a task.', 'POST', '/tasks', [
				{ name: 'data', in: 'body', required: true, type: 'object', description: '{"name":"Do it","projects":["<gid>"]}' },
			]),
			tool('update_task', 'Update a task.', 'PUT', '/tasks/{task_gid}', [
				{ name: 'task_gid', in: 'path', required: true },
				{ name: 'data', in: 'body', required: true, type: 'object', description: '{"completed":true}' },
			]),
			tool('add_comment', 'Comment on a task.', 'POST', '/tasks/{task_gid}/stories', [
				{ name: 'task_gid', in: 'path', required: true },
				{ name: 'data', in: 'body', required: true, type: 'object', description: '{"text":"Nice"}' },
			]),
		],
	},
	calendly: {
		baseUrl: 'https://api.calendly.com',
		tools: [
			tool('get_current_user', 'Get the current Calendly user.', 'GET', '/users/me', []),
			tool('list_event_types', 'List event types.', 'GET', '/event_types', [{ name: 'user', in: 'query', description: 'User URI' }]),
			tool('list_scheduled_events', 'List scheduled events.', 'GET', '/scheduled_events', [
				{ name: 'user', in: 'query', required: true, description: 'User URI (from get_current_user)' },
				{ name: 'status', in: 'query', description: 'active or canceled' },
			]),
			tool('get_event', 'Get a scheduled event.', 'GET', '/scheduled_events/{uuid}', [{ name: 'uuid', in: 'path', required: true }]),
			tool('list_invitees', 'List an event’s invitees.', 'GET', '/scheduled_events/{uuid}/invitees', [{ name: 'uuid', in: 'path', required: true }]),
		],
	},
	intercom: {
		baseUrl: 'https://api.intercom.io',
		tools: [
			tool('list_contacts', 'List contacts.', 'GET', '/contacts', []),
			tool('get_contact', 'Get a contact.', 'GET', '/contacts/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('search_contacts', 'Search contacts.', 'POST', '/contacts/search', [
				{ name: 'query', in: 'body', required: true, type: 'object', description: '{"field":"email","operator":"=","value":"a@b.com"}' },
			]),
			tool('create_contact', 'Create a contact.', 'POST', '/contacts', [
				{ name: 'role', in: 'body', description: 'user or lead' },
				{ name: 'email', in: 'body' },
				{ name: 'name', in: 'body' },
			]),
			tool('list_conversations', 'List conversations.', 'GET', '/conversations', []),
			tool('get_conversation', 'Get a conversation.', 'GET', '/conversations/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('reply_conversation', 'Reply to a conversation.', 'POST', '/conversations/{id}/reply', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'message_type', in: 'body', required: true, description: 'comment or note' },
				{ name: 'type', in: 'body', required: true, description: 'admin or user' },
				{ name: 'body', in: 'body', required: true },
				{ name: 'admin_id', in: 'body' },
			]),
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
			tool('chat_completion', 'Create a chat completion.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hi"}]}' },
			]),
			tool('embeddings', 'Create embeddings.', 'POST', '/embeddings', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"text-embedding-3-small","input":"hello"}' },
			]),
			tool('create_image', 'Generate an image.', 'POST', '/images/generations', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"gpt-image-1","prompt":"a cat","size":"1024x1024"}' },
			]),
			tool('moderations', 'Classify text for policy violations.', 'POST', '/moderations', [
				{ name: 'body', in: 'body', required: true, description: '{"input":"text to check"}' },
			]),
			tool('list_files', 'List uploaded files.', 'GET', '/files', []),
		],
	},
	anthropic: {
		baseUrl: 'https://api.anthropic.com',
		tools: [
			tool('list_models', 'List available Claude models.', 'GET', '/v1/models', []),
			tool('create_message', 'Create a Claude message.', 'POST', '/v1/messages', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"claude-3-5-sonnet-latest","max_tokens":1024,"messages":[{"role":"user","content":"Hi"}]}' },
			]),
			tool('count_tokens', 'Count tokens for a request.', 'POST', '/v1/messages/count_tokens', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"claude-3-5-sonnet-latest","messages":[{"role":"user","content":"Hi"}]}' },
			]),
		],
	},
	twilio: {
		baseUrl: 'https://api.twilio.com',
		tools: [
			tool('list_messages', 'List recent SMS messages.', 'GET', '/2010-04-01/Accounts/{AccountSid}/Messages.json', [
				{ name: 'AccountSid', in: 'path', required: true },
				{ name: 'PageSize', in: 'query', type: 'integer' },
			]),
			tool('get_message', 'Get one message.', 'GET', '/2010-04-01/Accounts/{AccountSid}/Messages/{Sid}.json', [
				{ name: 'AccountSid', in: 'path', required: true },
				{ name: 'Sid', in: 'path', required: true },
			]),
			tool('list_calls', 'List recent calls.', 'GET', '/2010-04-01/Accounts/{AccountSid}/Calls.json', [
				{ name: 'AccountSid', in: 'path', required: true },
				{ name: 'PageSize', in: 'query', type: 'integer' },
			]),
			tool('list_phone_numbers', 'List your Twilio numbers.', 'GET', '/2010-04-01/Accounts/{AccountSid}/IncomingPhoneNumbers.json', [
				{ name: 'AccountSid', in: 'path', required: true },
			]),
			tool('get_balance', 'Account balance.', 'GET', '/2010-04-01/Accounts/{AccountSid}/Balance.json', [
				{ name: 'AccountSid', in: 'path', required: true },
			]),
			tool('get_account', 'Account details.', 'GET', '/2010-04-01/Accounts/{AccountSid}.json', [
				{ name: 'AccountSid', in: 'path', required: true },
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
			tool('get_file_nodes', 'Get specific nodes from a file.', 'GET', '/v1/files/{file_key}/nodes', [
				{ name: 'file_key', in: 'path', required: true },
				{ name: 'ids', in: 'query', required: true, description: 'comma-separated node ids' },
			]),
			tool('get_images', 'Render nodes as images.', 'GET', '/v1/images/{file_key}', [
				{ name: 'file_key', in: 'path', required: true },
				{ name: 'ids', in: 'query', required: true },
				{ name: 'format', in: 'query', description: 'png, jpg, svg, pdf' },
			]),
			tool('get_comments', 'List a file’s comments.', 'GET', '/v1/files/{file_key}/comments', [{ name: 'file_key', in: 'path', required: true }]),
			tool('get_project_files', 'List files in a project.', 'GET', '/v1/projects/{project_id}/files', [{ name: 'project_id', in: 'path', required: true }]),
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
			tool('get_guild', 'Get a guild (server).', 'GET', '/guilds/{guild_id}', [{ name: 'guild_id', in: 'path', required: true }]),
			tool('list_channels', 'List a guild’s channels.', 'GET', '/guilds/{guild_id}/channels', [{ name: 'guild_id', in: 'path', required: true }]),
			tool('get_channel', 'Get a channel.', 'GET', '/channels/{channel_id}', [{ name: 'channel_id', in: 'path', required: true }]),
			tool('list_messages', 'List a channel’s messages.', 'GET', '/channels/{channel_id}/messages', [
				{ name: 'channel_id', in: 'path', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('create_message', 'Post a message to a channel.', 'POST', '/channels/{channel_id}/messages', [
				{ name: 'channel_id', in: 'path', required: true },
				{ name: 'content', in: 'body', required: true },
			]),
			tool('list_members', 'List guild members.', 'GET', '/guilds/{guild_id}/members', [
				{ name: 'guild_id', in: 'path', required: true },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
			tool('get_user', 'Get a user by id.', 'GET', '/users/{user_id}', [{ name: 'user_id', in: 'path', required: true }]),
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
				{ name: 'recursive', in: 'body', type: 'boolean' },
			]),
			tool('search', 'Search files and folders.', 'POST', '/files/search_v2', [
				{ name: 'query', in: 'body', required: true },
			]),
			tool('get_metadata', 'Get a file/folder’s metadata.', 'POST', '/files/get_metadata', [
				{ name: 'path', in: 'body', required: true, description: 'Path or id' },
			]),
			tool('create_folder', 'Create a folder.', 'POST', '/files/create_folder_v2', [
				{ name: 'path', in: 'body', required: true },
			]),
			tool('delete', 'Delete a file or folder.', 'POST', '/files/delete_v2', [
				{ name: 'path', in: 'body', required: true },
			]),
			tool('create_shared_link', 'Create a shareable link.', 'POST', '/sharing/create_shared_link_with_settings', [
				{ name: 'path', in: 'body', required: true },
			]),
			tool('get_space_usage', 'Get storage usage.', 'POST', '/users/get_space_usage', []),
			tool('get_current_account', 'Get the current account.', 'POST', '/users/get_current_account', []),
		],
	},
	clickup: {
		baseUrl: 'https://api.clickup.com/api/v2',
		tools: [
			tool('get_authorized_user', 'Get the authorized user.', 'GET', '/user', []),
			tool('get_teams', 'List workspaces (teams).', 'GET', '/team', []),
			tool('get_spaces', 'List spaces in a workspace.', 'GET', '/team/{team_id}/space', [{ name: 'team_id', in: 'path', required: true }]),
			tool('get_folders', 'List folders in a space.', 'GET', '/space/{space_id}/folder', [{ name: 'space_id', in: 'path', required: true }]),
			tool('get_lists', 'List lists in a folder.', 'GET', '/folder/{folder_id}/list', [{ name: 'folder_id', in: 'path', required: true }]),
			tool('get_tasks', 'List tasks in a list.', 'GET', '/list/{list_id}/task', [
				{ name: 'list_id', in: 'path', required: true },
				{ name: 'archived', in: 'query', description: 'true/false' },
			]),
			tool('get_task', 'Get a task.', 'GET', '/task/{task_id}', [{ name: 'task_id', in: 'path', required: true }]),
			tool('create_task', 'Create a task in a list.', 'POST', '/list/{list_id}/task', [
				{ name: 'list_id', in: 'path', required: true },
				{ name: 'name', in: 'body', required: true },
				{ name: 'description', in: 'body' },
				{ name: 'priority', in: 'body', type: 'integer', description: '1 (urgent) – 4 (low)' },
				{ name: 'due_date', in: 'body', type: 'integer', description: 'Unix ms' },
			]),
			tool('update_task', 'Update a task.', 'PUT', '/task/{task_id}', [
				{ name: 'task_id', in: 'path', required: true },
				{ name: 'name', in: 'body' },
				{ name: 'status', in: 'body' },
				{ name: 'description', in: 'body' },
			]),
			tool('create_comment', 'Comment on a task.', 'POST', '/task/{task_id}/comment', [
				{ name: 'task_id', in: 'path', required: true },
				{ name: 'comment_text', in: 'body', required: true },
			]),
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
			tool('list_deals', 'List deals.', 'GET', '/deals', [{ name: 'limit', in: 'query', type: 'integer' }, { name: 'status', in: 'query', description: 'open, won, lost' }]),
			tool('get_deal', 'Get a deal.', 'GET', '/deals/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('add_deal', 'Create a deal.', 'POST', '/deals', [
				{ name: 'title', in: 'body', required: true },
				{ name: 'value', in: 'body' },
				{ name: 'person_id', in: 'body', type: 'integer' },
			]),
			tool('update_deal', 'Update a deal.', 'PUT', '/deals/{id}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'status', in: 'body', description: 'open, won, lost' },
				{ name: 'value', in: 'body' },
			]),
			tool('search_deals', 'Search deals.', 'GET', '/deals/search', [{ name: 'term', in: 'query', required: true }]),
			tool('list_persons', 'List persons.', 'GET', '/persons', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('add_person', 'Create a person.', 'POST', '/persons', [
				{ name: 'name', in: 'body', required: true },
				{ name: 'email', in: 'body', type: 'array' },
				{ name: 'phone', in: 'body', type: 'array' },
			]),
			tool('list_organizations', 'List organizations.', 'GET', '/organizations', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_activities', 'List activities.', 'GET', '/activities', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_pipelines', 'List pipelines.', 'GET', '/pipelines', []),
			tool('list_stages', 'List stages.', 'GET', '/stages', []),
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
			tool('list_coins', 'List all supported coins (id/symbol/name).', 'GET', '/coins/list', []),
			tool('get_coin', 'Detailed data for a coin.', 'GET', '/coins/{id}', [{ name: 'id', in: 'path', required: true, description: 'e.g. bitcoin' }]),
			tool('market_chart', 'Historical market chart.', 'GET', '/coins/{id}/market_chart', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'vs_currency', in: 'query', required: true },
				{ name: 'days', in: 'query', required: true, description: 'e.g. 1, 7, 30, max' },
			]),
			tool('trending', 'Trending coins.', 'GET', '/search/trending', []),
			tool('search', 'Search coins, categories, markets.', 'GET', '/search', [{ name: 'query', in: 'query', required: true }]),
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
			tool('symbol_search', 'Search symbols.', 'GET', '/search', [{ name: 'q', in: 'query', required: true }]),
			tool('company_news', 'Company news in a date range.', 'GET', '/company-news', [
				{ name: 'symbol', in: 'query', required: true },
				{ name: 'from', in: 'query', required: true, description: 'YYYY-MM-DD' },
				{ name: 'to', in: 'query', required: true, description: 'YYYY-MM-DD' },
			]),
			tool('market_news', 'General market news.', 'GET', '/news', [{ name: 'category', in: 'query', description: 'general, forex, crypto, merger' }]),
			tool('basic_financials', 'Key metrics for a company.', 'GET', '/stock/metric', [
				{ name: 'symbol', in: 'query', required: true },
				{ name: 'metric', in: 'query', description: 'all' },
			]),
			tool('recommendation', 'Analyst recommendations.', 'GET', '/stock/recommendation', [{ name: 'symbol', in: 'query', required: true }]),
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
			tool('get_payment', 'Retrieve a payment.', 'GET', '/v2/payments/{payment_id}', [{ name: 'payment_id', in: 'path', required: true }]),
			tool('list_customers', 'List customers.', 'GET', '/v2/customers', []),
			tool('get_customer', 'Retrieve a customer.', 'GET', '/v2/customers/{customer_id}', [{ name: 'customer_id', in: 'path', required: true }]),
			tool('search_orders', 'Search orders.', 'POST', '/v2/orders/search', [
				{ name: 'location_ids', in: 'body', required: true, type: 'array' },
			]),
			tool('list_catalog', 'List catalog objects.', 'GET', '/v2/catalog/list', [{ name: 'types', in: 'query', description: 'ITEM, CATEGORY, …' }]),
			tool('list_refunds', 'List refunds.', 'GET', '/v2/refunds', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_invoices', 'List invoices.', 'GET', '/v2/invoices', [{ name: 'location_id', in: 'query', required: true }]),
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
			tool('get_contact', 'Get a contact by email or id.', 'GET', '/contacts/{identifier}', [{ name: 'identifier', in: 'path', required: true }]),
			tool('create_contact', 'Create a contact.', 'POST', '/contacts', [
				{ name: 'email', in: 'body', required: true },
				{ name: 'attributes', in: 'body', type: 'object' },
				{ name: 'listIds', in: 'body', type: 'array' },
			]),
			tool('list_folders', 'List contact folders.', 'GET', '/contacts/folders', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_email_campaigns', 'List email campaigns.', 'GET', '/emailCampaigns', []),
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
			tool('embed', 'Create embeddings.', 'POST', '/v2/embed', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"embed-english-v3.0","texts":["hi"],"input_type":"search_document"}' },
			]),
			tool('rerank', 'Rerank documents for a query.', 'POST', '/v2/rerank', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"rerank-v3.5","query":"q","documents":["a","b"]}' },
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
			tool('get_voice', 'Get a voice.', 'GET', '/v1/voices/{voice_id}', [{ name: 'voice_id', in: 'path', required: true }]),
			tool('list_models', 'List TTS models.', 'GET', '/v1/models', []),
			tool('text_to_speech', 'Synthesize speech (returns audio).', 'POST', '/v1/text-to-speech/{voice_id}', [
				{ name: 'voice_id', in: 'path', required: true },
				{ name: 'text', in: 'body', required: true },
				{ name: 'model_id', in: 'body', description: 'e.g. eleven_multilingual_v2' },
			]),
			tool('list_history', 'List generated audio history.', 'GET', '/v1/history', []),
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
			tool('update_values', 'Write values to a range.', 'PUT', '/spreadsheets/{spreadsheetId}/values/{range}', [
				{ name: 'spreadsheetId', in: 'path', required: true },
				{ name: 'range', in: 'path', required: true },
				{ name: 'valueInputOption', in: 'query', description: 'RAW or USER_ENTERED' },
				{ name: 'values', in: 'body', required: true, type: 'array', description: '[["a","b"],["c","d"]]' },
			]),
			tool('append_values', 'Append rows to a range.', 'POST', '/spreadsheets/{spreadsheetId}/values/{range}:append', [
				{ name: 'spreadsheetId', in: 'path', required: true },
				{ name: 'range', in: 'path', required: true },
				{ name: 'valueInputOption', in: 'query', description: 'RAW or USER_ENTERED' },
				{ name: 'values', in: 'body', required: true, type: 'array' },
			]),
			tool('clear_values', 'Clear a range.', 'POST', '/spreadsheets/{spreadsheetId}/values/{range}:clear', [
				{ name: 'spreadsheetId', in: 'path', required: true },
				{ name: 'range', in: 'path', required: true },
			]),
			tool('create_spreadsheet', 'Create a spreadsheet.', 'POST', '/spreadsheets', [
				{ name: 'properties', in: 'body', type: 'object', description: '{"title":"My sheet"}' },
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
			tool('list_threads', 'List/search threads.', 'GET', '/users/me/threads', [{ name: 'q', in: 'query' }]),
			tool('get_thread', 'Get a thread.', 'GET', '/users/me/threads/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_labels', 'List labels.', 'GET', '/users/me/labels', []),
			tool('modify_message', 'Add/remove labels on a message.', 'POST', '/users/me/messages/{id}/modify', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'addLabelIds', in: 'body', type: 'array' },
				{ name: 'removeLabelIds', in: 'body', type: 'array' },
			]),
			tool('trash_message', 'Move a message to trash.', 'POST', '/users/me/messages/{id}/trash', [{ name: 'id', in: 'path', required: true }]),
			tool('send_message', 'Send a raw RFC822 message.', 'POST', '/users/me/messages/send', [
				{ name: 'raw', in: 'body', required: true, description: 'base64url-encoded RFC822 email' },
			]),
			tool('get_profile', 'Get the mailbox profile.', 'GET', '/users/me/profile', []),
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
				{ name: 'q', in: 'query', description: 'free-text search' },
			]),
			tool('get_event', 'Get an event.', 'GET', '/calendars/{calendarId}/events/{eventId}', [
				{ name: 'calendarId', in: 'path', required: true },
				{ name: 'eventId', in: 'path', required: true },
			]),
			tool('create_event', 'Create an event.', 'POST', '/calendars/{calendarId}/events', [
				{ name: 'calendarId', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"summary":"Meet","start":{"dateTime":"2026-06-10T15:00:00Z"},"end":{"dateTime":"2026-06-10T15:30:00Z"}}' },
			]),
			tool('update_event', 'Update an event.', 'PUT', '/calendars/{calendarId}/events/{eventId}', [
				{ name: 'calendarId', in: 'path', required: true },
				{ name: 'eventId', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true },
			]),
			tool('delete_event', 'Delete an event.', 'DELETE', '/calendars/{calendarId}/events/{eventId}', [
				{ name: 'calendarId', in: 'path', required: true },
				{ name: 'eventId', in: 'path', required: true },
			]),
			tool('quick_add', 'Create an event from text.', 'POST', '/calendars/{calendarId}/events/quickAdd', [
				{ name: 'calendarId', in: 'path', required: true },
				{ name: 'text', in: 'query', required: true, description: 'e.g. Lunch tomorrow 1pm' },
			]),
		],
	},
	microsoft_graph: {
		baseUrl: 'https://graph.microsoft.com/v1.0',
		tools: [
			tool('me', 'Get the signed-in user.', 'GET', '/me', []),
			tool('list_messages', 'List Outlook messages.', 'GET', '/me/messages', [{ name: '$top', in: 'query', type: 'integer' }, { name: '$search', in: 'query' }]),
			tool('get_message', 'Get a message.', 'GET', '/me/messages/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('send_mail', 'Send an email.', 'POST', '/me/sendMail', [
				{ name: 'body', in: 'body', required: true, description: '{"message":{"subject":"Hi","body":{"contentType":"Text","content":"Hello"},"toRecipients":[{"emailAddress":{"address":"a@b.com"}}]}}' },
			]),
			tool('list_events', 'List calendar events.', 'GET', '/me/events', [{ name: '$top', in: 'query', type: 'integer' }]),
			tool('create_event', 'Create a calendar event.', 'POST', '/me/events', [
				{ name: 'body', in: 'body', required: true, description: '{"subject":"Meet","start":{"dateTime":"2026-06-10T15:00:00","timeZone":"UTC"},"end":{"dateTime":"2026-06-10T15:30:00","timeZone":"UTC"}}' },
			]),
			tool('list_drive_items', 'List files in your OneDrive root.', 'GET', '/me/drive/root/children', []),
			tool('list_contacts', 'List Outlook contacts.', 'GET', '/me/contacts', [{ name: '$top', in: 'query', type: 'integer' }]),
			tool('list_joined_teams', 'List Teams you’ve joined.', 'GET', '/me/joinedTeams', []),
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
			tool('get_playlist', 'Get a playlist.', 'GET', '/playlists/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('get_artist', 'Get an artist.', 'GET', '/artists/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('get_album', 'Get an album.', 'GET', '/albums/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('get_track', 'Get a track.', 'GET', '/tracks/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('my_top', 'Your top artists or tracks.', 'GET', '/me/top/{type}', [{ name: 'type', in: 'path', required: true, description: 'artists or tracks' }]),
			tool('recently_played', 'Recently played tracks.', 'GET', '/me/player/recently-played', [{ name: 'limit', in: 'query', type: 'integer' }]),
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
			tool('embeddings', 'Create embeddings.', 'POST', '/embeddings', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"mistral-embed","input":["hello"]}' },
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
			tool('embeddings', 'Create embeddings.', 'POST', '/embeddings', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"BAAI/bge-base-en-v1.5","input":"hello"}' },
			]),
			tool('create_image', 'Generate an image.', 'POST', '/images/generations', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"black-forest-labs/FLUX.1-schnell","prompt":"a cat"}' },
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
			tool('languages', 'List supported languages.', 'GET', '/languages', [{ name: 'type', in: 'query', description: 'source or target' }]),
		],
	},
	stability: {
		baseUrl: 'https://api.stability.ai',
		tools: [
			tool('list_engines', 'List image engines.', 'GET', '/v1/engines/list', []),
			tool('account', 'Get account details.', 'GET', '/v1/user/account', []),
			tool('balance', 'Get credit balance.', 'GET', '/v1/user/balance', []),
		],
	},
	assemblyai: {
		baseUrl: 'https://api.assemblyai.com/v2',
		tools: [
			tool('list_transcripts', 'List transcripts.', 'GET', '/transcript', []),
			tool('get_transcript', 'Get a transcript by id.', 'GET', '/transcript/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('submit_transcript', 'Transcribe an audio URL.', 'POST', '/transcript', [
				{ name: 'audio_url', in: 'body', required: true, description: 'Public URL of the audio file' },
				{ name: 'speaker_labels', in: 'body', type: 'boolean' },
			]),
			tool('get_subtitles', 'Get SRT/VTT subtitles.', 'GET', '/transcript/{id}/{format}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'format', in: 'path', required: true, description: 'srt or vtt' },
			]),
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
			tool('search_sosl', 'Run a SOSL search.', 'GET', '/services/data/v60.0/search', [
				{ name: 'q', in: 'query', required: true, description: 'e.g. FIND {Acme} IN ALL FIELDS RETURNING Account(Id,Name)' },
			]),
			tool('list_sobjects', 'List available objects.', 'GET', '/services/data/v60.0/sobjects', []),
			tool('describe_sobject', 'Describe an object’s fields.', 'GET', '/services/data/v60.0/sobjects/{sobject}/describe', [
				{ name: 'sobject', in: 'path', required: true },
			]),
			tool('get_record', 'Get a record by type + id.', 'GET', '/services/data/v60.0/sobjects/{sobject}/{id}', [
				{ name: 'sobject', in: 'path', required: true, description: 'e.g. Account, Contact' },
				{ name: 'id', in: 'path', required: true },
			]),
			tool('create_record', 'Create a record.', 'POST', '/services/data/v60.0/sobjects/{sobject}', [
				{ name: 'sobject', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"Name":"Acme","Industry":"Tech"}' },
			]),
			tool('update_record', 'Update a record (PATCH fields).', 'PATCH', '/services/data/v60.0/sobjects/{sobject}/{id}', [
				{ name: 'sobject', in: 'path', required: true },
				{ name: 'id', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"Phone":"555-1234"}' },
			]),
			tool('delete_record', 'Delete a record.', 'DELETE', '/services/data/v60.0/sobjects/{sobject}/{id}', [
				{ name: 'sobject', in: 'path', required: true },
				{ name: 'id', in: 'path', required: true },
			]),
			tool('recent_items', 'Recently viewed records.', 'GET', '/services/data/v60.0/recent', []),
			tool('limits', 'Org API limits/usage.', 'GET', '/services/data/v60.0/limits', []),
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
			tool('prev_close', 'Previous day’s OHLC.', 'GET', '/v2/aggs/ticker/{ticker}/prev', [{ name: 'ticker', in: 'path', required: true }]),
			tool('aggregates', 'Aggregate bars over a date range.', 'GET', '/v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}', [
				{ name: 'ticker', in: 'path', required: true },
				{ name: 'multiplier', in: 'path', required: true, description: 'e.g. 1' },
				{ name: 'timespan', in: 'path', required: true, description: 'minute, hour, day, week…' },
				{ name: 'from', in: 'path', required: true, description: 'YYYY-MM-DD' },
				{ name: 'to', in: 'path', required: true, description: 'YYYY-MM-DD' },
			]),
			tool('daily_open_close', 'Open/close for a date.', 'GET', '/v1/open-close/{ticker}/{date}', [
				{ name: 'ticker', in: 'path', required: true },
				{ name: 'date', in: 'path', required: true, description: 'YYYY-MM-DD' },
			]),
			tool('ticker_news', 'Recent news for tickers.', 'GET', '/v2/reference/news', [
				{ name: 'ticker', in: 'query' },
				{ name: 'limit', in: 'query', type: 'integer' },
			]),
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
	// --- Email / CRM / infra / monitoring ---
	mailjet: {
		baseUrl: 'https://api.mailjet.com/v3',
		tools: [
			tool('list_contacts', 'List contacts.', 'GET', '/REST/contact', [{ name: 'Limit', in: 'query', type: 'integer' }]),
			tool('list_campaigns', 'List campaigns.', 'GET', '/REST/campaign', [{ name: 'Limit', in: 'query', type: 'integer' }]),
		],
	},
	sparkpost: {
		baseUrl: 'https://api.sparkpost.com/api/v1',
		tools: [
			tool('get_account', 'Get account info.', 'GET', '/account', []),
			tool('list_templates', 'List email templates.', 'GET', '/templates', []),
		],
	},
	loops: {
		baseUrl: 'https://app.loops.so/api/v1',
		tools: [
			tool('find_contact', 'Find a contact by email.', 'GET', '/contacts/find', [{ name: 'email', in: 'query', required: true }]),
			tool('list_mailing_lists', 'List mailing lists.', 'GET', '/lists', []),
		],
	},
	bugsnag: {
		baseUrl: 'https://api.bugsnag.com',
		tools: [
			tool('list_organizations', 'List your organizations.', 'GET', '/user/organizations', []),
			tool('list_projects', 'List an org’s projects.', 'GET', '/organizations/{org_id}/projects', [{ name: 'org_id', in: 'path', required: true }]),
		],
	},
	betterstack: {
		baseUrl: 'https://uptime.betterstack.com/api/v2',
		tools: [
			tool('list_monitors', 'List monitors.', 'GET', '/monitors', []),
			tool('list_incidents', 'List incidents.', 'GET', '/incidents', []),
		],
	},
	checkly: {
		baseUrl: 'https://api.checklyhq.com/v1',
		tools: [
			tool('list_checks', 'List checks.', 'GET', '/checks', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('list_check_groups', 'List check groups.', 'GET', '/check-groups', []),
		],
	},
	linode: {
		baseUrl: 'https://api.linode.com/v4',
		tools: [
			tool('list_instances', 'List Linodes.', 'GET', '/linode/instances', []),
			tool('list_domains', 'List domains.', 'GET', '/domains', []),
		],
	},
	vultr: {
		baseUrl: 'https://api.vultr.com/v2',
		tools: [
			tool('list_instances', 'List instances.', 'GET', '/instances', []),
			tool('list_regions', 'List regions.', 'GET', '/regions', []),
		],
	},
	hetzner: {
		baseUrl: 'https://api.hetzner.cloud/v1',
		tools: [
			tool('list_servers', 'List servers.', 'GET', '/servers', []),
			tool('list_images', 'List images.', 'GET', '/images', []),
		],
	},
	close: {
		baseUrl: 'https://api.close.com/api/v1',
		tools: [
			tool('get_me', 'Get the current user.', 'GET', '/me/', []),
			tool('list_leads', 'List leads.', 'GET', '/lead/', [{ name: 'query', in: 'query' }]),
			tool('list_opportunities', 'List opportunities.', 'GET', '/opportunity/', []),
		],
	},
	attio: {
		baseUrl: 'https://api.attio.com/v2',
		tools: [
			tool('list_objects', 'List objects.', 'GET', '/objects', []),
			tool('list_members', 'List workspace members.', 'GET', '/workspace_members', []),
		],
	},
	pingdom: {
		baseUrl: 'https://api.pingdom.com/api/3.1',
		tools: [
			tool('list_checks', 'List uptime checks.', 'GET', '/checks', []),
			tool('get_check', 'Get a check by id.', 'GET', '/checks/{checkid}', [{ name: 'checkid', in: 'path', required: true }]),
		],
	},
	// --- AI / dev quick-wins ---
	gemini: {
		baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		tools: [
			tool('list_models', 'List Gemini models.', 'GET', '/models', []),
			tool('get_model', 'Get a model’s details.', 'GET', '/models/{model}', [{ name: 'model', in: 'path', required: true }]),
			tool('generate_content', 'Generate content with a model.', 'POST', '/models/{model}:generateContent', [
				{ name: 'model', in: 'path', required: true, description: 'e.g. gemini-1.5-flash' },
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"contents":[{"parts":[{"text":"Hello"}]}]}' },
			]),
			tool('embed_content', 'Create an embedding.', 'POST', '/models/{model}:embedContent', [
				{ name: 'model', in: 'path', required: true, description: 'e.g. text-embedding-004' },
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"content":{"parts":[{"text":"hello"}]}}' },
			]),
			tool('count_tokens', 'Count tokens for a request.', 'POST', '/models/{model}:countTokens', [
				{ name: 'model', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"contents":[{"parts":[{"text":"Hello"}]}]}' },
			]),
		],
	},
	openrouter: {
		baseUrl: 'https://openrouter.ai/api/v1',
		tools: [
			tool('list_models', 'List models.', 'GET', '/models', []),
			tool('chat', 'Chat completion (OpenAI-compatible).', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"openai/gpt-4o-mini","messages":[{"role":"user","content":"hi"}]}' },
			]),
		],
	},
	deepgram: {
		baseUrl: 'https://api.deepgram.com/v1',
		tools: [
			tool('list_projects', 'List projects.', 'GET', '/projects', []),
			tool('transcribe_url', 'Transcribe audio from a URL.', 'POST', '/listen', [
				{ name: 'model', in: 'query', description: 'e.g. nova-2' },
				{ name: 'url', in: 'body', required: true, description: 'Public audio URL' },
			]),
			tool('list_models', 'List available models.', 'GET', '/models', []),
			tool('get_balances', 'Get project balances.', 'GET', '/projects/{project_id}/balances', [{ name: 'project_id', in: 'path', required: true }]),
		],
	},
	smartsheet: {
		baseUrl: 'https://api.smartsheet.com/2.0',
		tools: [
			tool('list_sheets', 'List sheets.', 'GET', '/sheets', []),
			tool('get_sheet', 'Get a sheet by id.', 'GET', '/sheets/{sheetId}', [{ name: 'sheetId', in: 'path', required: true }]),
		],
	},
	razorpay: {
		baseUrl: 'https://api.razorpay.com/v1',
		tools: [
			tool('list_payments', 'List payments.', 'GET', '/payments', [{ name: 'count', in: 'query', type: 'integer' }]),
			tool('list_orders', 'List orders.', 'GET', '/orders', [{ name: 'count', in: 'query', type: 'integer' }]),
		],
	},
	circleci: {
		baseUrl: 'https://circleci.com/api/v2',
		tools: [
			tool('get_me', 'Get the current user.', 'GET', '/me', []),
			tool('project_pipelines', 'List a project’s pipelines.', 'GET', '/project/{project_slug}/pipeline', [
				{ name: 'project_slug', in: 'path', required: true, description: 'e.g. gh/org/repo' },
			]),
		],
	},
	fireworks: {
		baseUrl: 'https://api.fireworks.ai/inference/v1',
		tools: [
			tool('list_models', 'List models.', 'GET', '/models', []),
			tool('chat', 'Chat completion.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, type: 'object', description: '{"model":"accounts/fireworks/models/llama-v3p1-8b-instruct","messages":[{"role":"user","content":"hi"}]}' },
			]),
		],
	},
	googlemaps: {
		baseUrl: 'https://maps.googleapis.com/maps/api',
		tools: [
			tool('geocode', 'Geocode an address.', 'GET', '/geocode/json', [{ name: 'address', in: 'query', required: true }]),
			tool('place_search', 'Text search for places.', 'GET', '/place/textsearch/json', [{ name: 'query', in: 'query', required: true }]),
		],
	},
	npm: {
		baseUrl: 'https://registry.npmjs.org',
		tools: [tool('get_package', 'Get package metadata.', 'GET', '/{package}', [{ name: 'package', in: 'path', required: true }])],
	},
	pypi: {
		baseUrl: 'https://pypi.org/pypi',
		tools: [tool('get_package', 'Get package metadata.', 'GET', '/{package}/json', [{ name: 'package', in: 'path', required: true }])],
	},
	google_drive: {
		baseUrl: 'https://www.googleapis.com/drive/v3',
		tools: [
			tool('list_files', 'List/search files.', 'GET', '/files', [
				{ name: 'q', in: 'query', description: "e.g. name contains 'report'" },
				{ name: 'pageSize', in: 'query', type: 'integer' },
				{ name: 'orderBy', in: 'query', description: 'e.g. modifiedTime desc' },
			]),
			tool('get_file', 'Get file metadata.', 'GET', '/files/{fileId}', [
				{ name: 'fileId', in: 'path', required: true },
				{ name: 'fields', in: 'query', description: 'e.g. id,name,mimeType,size' },
			]),
			tool('export_file', 'Export a Google Doc/Sheet to text/csv etc.', 'GET', '/files/{fileId}/export', [
				{ name: 'fileId', in: 'path', required: true },
				{ name: 'mimeType', in: 'query', required: true, description: 'e.g. text/plain, text/csv, application/pdf' },
			]),
			tool('create_folder', 'Create a folder.', 'POST', '/files', [
				{ name: 'body', in: 'body', required: true, description: '{"name":"Reports","mimeType":"application/vnd.google-apps.folder"}' },
			]),
			tool('delete_file', 'Delete a file.', 'DELETE', '/files/{fileId}', [{ name: 'fileId', in: 'path', required: true }]),
			tool('about', 'Storage quota + user info.', 'GET', '/about', [{ name: 'fields', in: 'query', description: 'e.g. storageQuota,user' }]),
		],
	},
	google_docs: {
		baseUrl: 'https://docs.googleapis.com/v1',
		tools: [
			tool('get_document', 'Get a document.', 'GET', '/documents/{documentId}', [{ name: 'documentId', in: 'path', required: true }]),
			tool('create_document', 'Create a blank document.', 'POST', '/documents', [{ name: 'title', in: 'body', required: true }]),
			tool('batch_update', 'Apply edits to a document.', 'POST', '/documents/{documentId}:batchUpdate', [
				{ name: 'documentId', in: 'path', required: true },
				{ name: 'requests', in: 'body', required: true, type: 'array', description: '[{"insertText":{"location":{"index":1},"text":"Hello"}}]' },
			]),
		],
	},
	// --- Per-account base URL apps ---
	shopify: {
		baseUrl: '',
		tools: [
			tool('list_products', 'List products.', 'GET', '/products.json', [{ name: 'limit', in: 'query', type: 'integer' }]),
			tool('get_product', 'Get a product.', 'GET', '/products/{id}.json', [{ name: 'id', in: 'path', required: true }]),
			tool('create_product', 'Create a product.', 'POST', '/products.json', [
				{ name: 'body', in: 'body', required: true, description: '{"product":{"title":"Tee","body_html":"..."}}' },
			]),
			tool('list_orders', 'List orders.', 'GET', '/orders.json', [{ name: 'status', in: 'query', description: 'any, open, closed' }]),
			tool('get_order', 'Get an order.', 'GET', '/orders/{id}.json', [{ name: 'id', in: 'path', required: true }]),
			tool('list_customers', 'List customers.', 'GET', '/customers.json', []),
			tool('get_customer', 'Get a customer.', 'GET', '/customers/{id}.json', [{ name: 'id', in: 'path', required: true }]),
			tool('search_customers', 'Search customers.', 'GET', '/customers/search.json', [{ name: 'query', in: 'query', required: true, description: 'e.g. email:a@b.com' }]),
			tool('list_draft_orders', 'List draft orders.', 'GET', '/draft_orders.json', []),
			tool('list_collections', 'List custom collections.', 'GET', '/custom_collections.json', []),
			tool('get_shop', 'Get shop details.', 'GET', '/shop.json', []),
		],
	},
	jira: {
		baseUrl: '',
		tools: [
			tool('myself', 'Get the current user.', 'GET', '/rest/api/3/myself', []),
			tool('search_issues', 'Search issues with JQL.', 'GET', '/rest/api/3/search', [
				{ name: 'jql', in: 'query', required: true, description: 'e.g. project = ABC ORDER BY created DESC' },
				{ name: 'maxResults', in: 'query', type: 'integer' },
			]),
			tool('get_issue', 'Get an issue by key.', 'GET', '/rest/api/3/issue/{key}', [{ name: 'key', in: 'path', required: true }]),
			tool('create_issue', 'Create an issue.', 'POST', '/rest/api/3/issue', [
				{ name: 'body', in: 'body', required: true, description: '{"fields":{"project":{"key":"ABC"},"summary":"Bug","issuetype":{"name":"Task"}}}' },
			]),
			tool('update_issue', 'Update an issue.', 'PUT', '/rest/api/3/issue/{key}', [
				{ name: 'key', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"fields":{"summary":"New title"}}' },
			]),
			tool('list_comments', 'List an issue’s comments.', 'GET', '/rest/api/3/issue/{key}/comment', [{ name: 'key', in: 'path', required: true }]),
			tool('add_comment', 'Comment on an issue.', 'POST', '/rest/api/3/issue/{key}/comment', [
				{ name: 'key', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"body":{"type":"doc","version":1,"content":[{"type":"paragraph","content":[{"type":"text","text":"hi"}]}]}}' },
			]),
			tool('list_transitions', 'List available transitions.', 'GET', '/rest/api/3/issue/{key}/transitions', [{ name: 'key', in: 'path', required: true }]),
			tool('transition_issue', 'Transition an issue (change status).', 'POST', '/rest/api/3/issue/{key}/transitions', [
				{ name: 'key', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"transition":{"id":"31"}}' },
			]),
			tool('list_projects', 'List projects.', 'GET', '/rest/api/3/project/search', []),
		],
	},
	zendesk: {
		baseUrl: '',
		tools: [
			tool('search', 'Search Zendesk.', 'GET', '/api/v2/search.json', [{ name: 'query', in: 'query', required: true }]),
			tool('list_tickets', 'List tickets.', 'GET', '/api/v2/tickets.json', []),
			tool('get_ticket', 'Get a ticket.', 'GET', '/api/v2/tickets/{id}.json', [{ name: 'id', in: 'path', required: true }]),
			tool('create_ticket', 'Create a ticket.', 'POST', '/api/v2/tickets.json', [
				{ name: 'body', in: 'body', required: true, description: '{"ticket":{"subject":"Help","comment":{"body":"..."}}}' },
			]),
			tool('update_ticket', 'Update a ticket.', 'PUT', '/api/v2/tickets/{id}.json', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"ticket":{"status":"solved"}}' },
			]),
			tool('list_ticket_comments', 'List a ticket’s comments.', 'GET', '/api/v2/tickets/{id}/comments.json', [{ name: 'id', in: 'path', required: true }]),
			tool('list_users', 'List users.', 'GET', '/api/v2/users.json', []),
			tool('get_user', 'Get a user.', 'GET', '/api/v2/users/{id}.json', [{ name: 'id', in: 'path', required: true }]),
			tool('list_organizations', 'List organizations.', 'GET', '/api/v2/organizations.json', []),
		],
	},
	mailchimp: {
		baseUrl: '',
		tools: [
			tool('ping', 'Health check.', 'GET', '/ping', []),
			tool('list_audiences', 'List audiences/lists.', 'GET', '/lists', []),
			tool('get_list', 'Get an audience/list.', 'GET', '/lists/{list_id}', [{ name: 'list_id', in: 'path', required: true }]),
			tool('list_members', 'List members of an audience.', 'GET', '/lists/{list_id}/members', [
				{ name: 'list_id', in: 'path', required: true },
				{ name: 'count', in: 'query', type: 'integer' },
			]),
			tool('add_member', 'Add a member to an audience.', 'POST', '/lists/{list_id}/members', [
				{ name: 'list_id', in: 'path', required: true },
				{ name: 'email_address', in: 'body', required: true },
				{ name: 'status', in: 'body', required: true, description: 'subscribed, unsubscribed, pending' },
				{ name: 'merge_fields', in: 'body', type: 'object' },
			]),
			tool('list_campaigns', 'List campaigns.', 'GET', '/campaigns', []),
			tool('get_campaign', 'Get a campaign.', 'GET', '/campaigns/{campaign_id}', [{ name: 'campaign_id', in: 'path', required: true }]),
			tool('campaign_report', 'Get a campaign’s report.', 'GET', '/reports/{campaign_id}', [{ name: 'campaign_id', in: 'path', required: true }]),
		],
	},
	telegram: {
		// Token-in-path: the proxy prepends /bot<token> from token_path_template.
		baseUrl: 'https://api.telegram.org',
		tools: [
			tool('get_me', 'Get info about the bot.', 'GET', '/getMe', []),
			tool('send_message', 'Send a text message to a chat.', 'POST', '/sendMessage', [
				{ name: 'chat_id', in: 'query', required: true, description: 'Target chat ID or @channelusername' },
				{ name: 'text', in: 'query', required: true, description: 'Message text' },
				{ name: 'parse_mode', in: 'query', description: 'Markdown or HTML' },
			]),
			tool('send_photo', 'Send a photo by URL.', 'POST', '/sendPhoto', [
				{ name: 'chat_id', in: 'query', required: true },
				{ name: 'photo', in: 'query', required: true, description: 'Photo URL or file_id' },
				{ name: 'caption', in: 'query' },
			]),
			tool('get_updates', 'Get incoming updates (long polling).', 'GET', '/getUpdates', [
				{ name: 'offset', in: 'query' },
				{ name: 'limit', in: 'query' },
			]),
			tool('get_chat', 'Get info about a chat.', 'GET', '/getChat', [
				{ name: 'chat_id', in: 'query', required: true },
			]),
		],
	},
	zoom: {
		// Server-to-Server OAuth (account_credentials grant).
		baseUrl: 'https://api.zoom.us/v2',
		tools: [
			tool('get_me', 'Get the current user.', 'GET', '/users/me', []),
			tool('list_users', 'List users on the account.', 'GET', '/users', [
				{ name: 'status', in: 'query', description: 'active | inactive | pending' },
				{ name: 'page_size', in: 'query' },
			]),
			tool('list_meetings', 'List a user’s meetings.', 'GET', '/users/{userId}/meetings', [
				{ name: 'userId', in: 'path', required: true, description: 'User ID or "me"' },
				{ name: 'type', in: 'query', description: 'scheduled | live | upcoming' },
			]),
			tool('create_meeting', 'Create a meeting for a user.', 'POST', '/users/{userId}/meetings', [
				{ name: 'userId', in: 'path', required: true, description: 'User ID or "me"' },
				{ name: 'body', in: 'body', required: true, description: 'Meeting object, e.g. {"topic":"Standup","type":2,"start_time":"2026-06-10T15:00:00Z","duration":30}' },
			]),
			tool('get_meeting', 'Get a meeting by ID.', 'GET', '/meetings/{meetingId}', [
				{ name: 'meetingId', in: 'path', required: true },
			]),
		],
	},
	twitter: {
		baseUrl: 'https://api.twitter.com/2',
		tools: [
			tool('get_me', 'Get the authenticated user.', 'GET', '/users/me', [
				{ name: 'user.fields', in: 'query', description: 'e.g. description,public_metrics' },
			]),
			tool('get_user_by_username', 'Look up a user by handle.', 'GET', '/users/by/username/{username}', [
				{ name: 'username', in: 'path', required: true },
			]),
			tool('get_user_tweets', 'Recent tweets for a user ID.', 'GET', '/users/{id}/tweets', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'max_results', in: 'query' },
			]),
			tool('search_recent', 'Search tweets from the last 7 days.', 'GET', '/tweets/search/recent', [
				{ name: 'query', in: 'query', required: true, description: 'e.g. from:nasa -is:retweet' },
				{ name: 'max_results', in: 'query' },
			]),
			tool('post_tweet', 'Publish a tweet.', 'POST', '/tweets', [
				{ name: 'body', in: 'body', required: true, description: 'e.g. {"text":"Hello from mcpify"}' },
			]),
		],
	},
	linkedin: {
		baseUrl: 'https://api.linkedin.com/v2',
		tools: [
			tool('get_userinfo', 'OpenID profile of the authenticated member.', 'GET', '/userinfo', []),
			tool('get_me', 'Lite profile of the authenticated member.', 'GET', '/me', []),
		],
	},
	reddit: {
		baseUrl: 'https://oauth.reddit.com',
		tools: [
			tool('get_me', 'Get the authenticated user.', 'GET', '/api/v1/me', []),
			tool('my_subreddits', 'Subreddits you’re subscribed to.', 'GET', '/subreddits/mine/subscriber', [
				{ name: 'limit', in: 'query' },
			]),
			tool('subreddit_hot', 'Hot posts in a subreddit.', 'GET', '/r/{subreddit}/hot', [
				{ name: 'subreddit', in: 'path', required: true },
				{ name: 'limit', in: 'query' },
			]),
			tool('search', 'Search posts.', 'GET', '/search', [
				{ name: 'q', in: 'query', required: true },
				{ name: 'limit', in: 'query' },
			]),
		],
	},
	zoho_crm: {
		baseUrl: 'https://www.zohoapis.com/crm/v3',
		tools: [
			tool('current_user', 'Get the current CRM user.', 'GET', '/users', [
				{ name: 'type', in: 'query', description: 'CurrentUser' },
			]),
			tool('list_records', 'List records in a module.', 'GET', '/{module}', [
				{ name: 'module', in: 'path', required: true, description: 'e.g. Leads, Contacts, Deals' },
				{ name: 'per_page', in: 'query' },
			]),
			tool('get_record', 'Get a record by ID.', 'GET', '/{module}/{id}', [
				{ name: 'module', in: 'path', required: true },
				{ name: 'id', in: 'path', required: true },
			]),
			tool('search_records', 'Search records by criteria.', 'GET', '/{module}/search', [
				{ name: 'module', in: 'path', required: true },
				{ name: 'criteria', in: 'query', description: 'e.g. (Last_Name:equals:Smith)' },
			]),
			tool('create_record', 'Create records in a module.', 'POST', '/{module}', [
				{ name: 'module', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"data":[{"Last_Name":"Smith"}]}' },
			]),
		],
	},
	xero: {
		baseUrl: 'https://api.xero.com/api.xro/2.0',
		tools: [
			tool('get_organisation', 'Get the connected organisation.', 'GET', '/Organisation', []),
			tool('list_contacts', 'List contacts.', 'GET', '/Contacts', []),
			tool('list_invoices', 'List invoices.', 'GET', '/Invoices', []),
			tool('list_accounts', 'List accounts.', 'GET', '/Accounts', []),
		],
	},
	ga4: {
		baseUrl: 'https://analyticsdata.googleapis.com/v1beta',
		tools: [
			tool('run_report', 'Run a GA4 report.', 'POST', '/properties/{propertyId}:runReport', [
				{ name: 'propertyId', in: 'path', required: true, description: 'Numeric GA4 property ID' },
				{ name: 'body', in: 'body', required: true, description: '{"dateRanges":[{"startDate":"7daysAgo","endDate":"today"}],"dimensions":[{"name":"country"}],"metrics":[{"name":"activeUsers"}]}' },
			]),
			tool('run_realtime_report', 'Run a realtime report.', 'POST', '/properties/{propertyId}:runRealtimeReport', [
				{ name: 'propertyId', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"dimensions":[{"name":"country"}],"metrics":[{"name":"activeUsers"}]}' },
			]),
			tool('get_metadata', 'List available dimensions and metrics.', 'GET', '/properties/{propertyId}/metadata', [
				{ name: 'propertyId', in: 'path', required: true },
			]),
		],
	},
	mailgun: {
		// Basic auth: username "api", password = your API key.
		baseUrl: 'https://api.mailgun.net/v3',
		tools: [
			tool('list_domains', 'List your sending domains.', 'GET', '/domains', []),
			tool('get_domain', 'Get a domain.', 'GET', '/domains/{domain}', [{ name: 'domain', in: 'path', required: true }]),
			tool('domain_events', 'Recent events for a domain.', 'GET', '/{domain}/events', [{ name: 'domain', in: 'path', required: true }]),
			tool('list_mailing_lists', 'List mailing lists.', 'GET', '/lists/pages', []),
		],
	},
	confluence: {
		baseUrl: '',
		tools: [
			tool('list_spaces', 'List spaces.', 'GET', '/rest/api/space', []),
			tool('search', 'Search content with CQL.', 'GET', '/rest/api/search', [
				{ name: 'cql', in: 'query', required: true, description: 'e.g. text ~ "roadmap"' },
			]),
			tool('get_content', 'List or filter content.', 'GET', '/rest/api/content', [
				{ name: 'spaceKey', in: 'query' },
				{ name: 'title', in: 'query' },
			]),
			tool('get_content_by_id', 'Get a page by ID (with body).', 'GET', '/rest/api/content/{id}', [
				{ name: 'id', in: 'path', required: true },
				{ name: 'expand', in: 'query', description: 'e.g. body.storage' },
			]),
		],
	},
	freshdesk: {
		baseUrl: '',
		tools: [
			tool('list_tickets', 'List tickets.', 'GET', '/tickets', []),
			tool('get_ticket', 'Get a ticket.', 'GET', '/tickets/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_contacts', 'List contacts.', 'GET', '/contacts', []),
			tool('create_ticket', 'Create a ticket.', 'POST', '/tickets', [
				{ name: 'body', in: 'body', required: true, description: '{"subject":"Help","description":"...","email":"a@b.com","priority":1,"status":2}' },
			]),
		],
	},
	freshservice: {
		baseUrl: '',
		tools: [
			tool('list_tickets', 'List tickets.', 'GET', '/tickets', []),
			tool('get_ticket', 'Get a ticket.', 'GET', '/tickets/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_agents', 'List agents.', 'GET', '/agents', []),
		],
	},
	servicenow: {
		baseUrl: '',
		tools: [
			tool('list_incidents', 'List incidents.', 'GET', '/api/now/table/incident', [
				{ name: 'sysparm_limit', in: 'query' },
				{ name: 'sysparm_query', in: 'query', description: 'e.g. active=true' },
			]),
			tool('query_table', 'Query any table.', 'GET', '/api/now/table/{table}', [
				{ name: 'table', in: 'path', required: true, description: 'e.g. incident, change_request' },
				{ name: 'sysparm_query', in: 'query' },
			]),
			tool('get_record', 'Get one record.', 'GET', '/api/now/table/{table}/{sys_id}', [
				{ name: 'table', in: 'path', required: true },
				{ name: 'sys_id', in: 'path', required: true },
			]),
			tool('create_record', 'Create a record.', 'POST', '/api/now/table/{table}', [
				{ name: 'table', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"short_description":"..."}' },
			]),
		],
	},
	woocommerce: {
		baseUrl: '',
		tools: [
			tool('list_products', 'List products.', 'GET', '/products', []),
			tool('get_product', 'Get a product.', 'GET', '/products/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_orders', 'List orders.', 'GET', '/orders', []),
			tool('get_order', 'Get an order.', 'GET', '/orders/{id}', [{ name: 'id', in: 'path', required: true }]),
		],
	},
	bigcommerce: {
		baseUrl: '',
		tools: [
			tool('list_products', 'List catalog products.', 'GET', '/catalog/products', []),
			tool('get_product', 'Get a product.', 'GET', '/catalog/products/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_categories', 'List categories.', 'GET', '/catalog/categories', []),
			tool('list_customers', 'List customers.', 'GET', '/customers', []),
		],
	},
	pinecone: {
		// Control plane: Api-Key header.
		baseUrl: 'https://api.pinecone.io',
		tools: [
			tool('list_indexes', 'List your indexes.', 'GET', '/indexes', []),
			tool('describe_index', 'Describe an index.', 'GET', '/indexes/{index_name}', [{ name: 'index_name', in: 'path', required: true }]),
			tool('list_collections', 'List collections.', 'GET', '/collections', []),
		],
	},
	chargebee: {
		baseUrl: '',
		tools: [
			tool('list_subscriptions', 'List subscriptions.', 'GET', '/subscriptions', []),
			tool('list_customers', 'List customers.', 'GET', '/customers', []),
			tool('list_invoices', 'List invoices.', 'GET', '/invoices', []),
		],
	},
	gitea: {
		baseUrl: '',
		tools: [
			tool('list_my_repos', 'List your repositories.', 'GET', '/user/repos', []),
			tool('get_repo', 'Get a repository.', 'GET', '/repos/{owner}/{repo}', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
			]),
			tool('list_issues', 'List issues in a repo.', 'GET', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'state', in: 'query', description: 'open | closed | all' },
			]),
			tool('create_issue', 'Create an issue.', 'POST', '/repos/{owner}/{repo}/issues', [
				{ name: 'owner', in: 'path', required: true },
				{ name: 'repo', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"title":"Bug","body":"..."}' },
			]),
		],
	},
	jenkins: {
		baseUrl: '',
		tools: [
			tool('overview', 'Server overview + top-level jobs.', 'GET', '/api/json', []),
			tool('job', 'Get a job.', 'GET', '/job/{name}/api/json', [{ name: 'name', in: 'path', required: true }]),
			tool('build', 'Trigger a build.', 'POST', '/job/{name}/build', [{ name: 'name', in: 'path', required: true }]),
		],
	},
	mastodon: {
		baseUrl: '',
		tools: [
			tool('verify_credentials', 'Get the authenticated account.', 'GET', '/api/v1/accounts/verify_credentials', []),
			tool('home_timeline', 'Home timeline.', 'GET', '/api/v1/timelines/home', [{ name: 'limit', in: 'query' }]),
			tool('post_status', 'Publish a status (toot).', 'POST', '/api/v1/statuses', [
				{ name: 'status', in: 'query', required: true, description: 'Text to post' },
				{ name: 'visibility', in: 'query', description: 'public | unlisted | private | direct' },
			]),
			tool('search', 'Search.', 'GET', '/api/v2/search', [{ name: 'q', in: 'query', required: true }]),
		],
	},
	mailerlite: {
		baseUrl: 'https://connect.mailerlite.com/api',
		tools: [
			tool('list_subscribers', 'List subscribers.', 'GET', '/subscribers', []),
			tool('get_subscriber', 'Get a subscriber.', 'GET', '/subscribers/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_groups', 'List groups.', 'GET', '/groups', []),
			tool('list_campaigns', 'List campaigns.', 'GET', '/campaigns', []),
		],
	},
	activecampaign: {
		baseUrl: '',
		tools: [
			tool('list_contacts', 'List contacts.', 'GET', '/api/3/contacts', [{ name: 'limit', in: 'query' }]),
			tool('get_contact', 'Get a contact.', 'GET', '/api/3/contacts/{id}', [{ name: 'id', in: 'path', required: true }]),
			tool('list_deals', 'List deals.', 'GET', '/api/3/deals', []),
			tool('list_lists', 'List lists.', 'GET', '/api/3/lists', []),
		],
	},
	wise: {
		baseUrl: 'https://api.wise.com',
		tools: [
			tool('list_profiles', 'List your profiles.', 'GET', '/v2/profiles', []),
			tool('get_profile', 'Get a profile.', 'GET', '/v2/profiles/{profileId}', [{ name: 'profileId', in: 'path', required: true }]),
		],
	},
	strapi: {
		baseUrl: '',
		tools: [
			tool('list_entries', 'List entries in a collection.', 'GET', '/{collection}', [
				{ name: 'collection', in: 'path', required: true, description: 'e.g. articles' },
			]),
			tool('get_entry', 'Get one entry.', 'GET', '/{collection}/{id}', [
				{ name: 'collection', in: 'path', required: true },
				{ name: 'id', in: 'path', required: true },
			]),
			tool('create_entry', 'Create an entry.', 'POST', '/{collection}', [
				{ name: 'collection', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"data":{...}}' },
			]),
		],
	},
	directus: {
		baseUrl: '',
		tools: [
			tool('list_collections', 'List collections.', 'GET', '/collections', []),
			tool('list_items', 'List items in a collection.', 'GET', '/items/{collection}', [
				{ name: 'collection', in: 'path', required: true },
			]),
			tool('get_item', 'Get one item.', 'GET', '/items/{collection}/{id}', [
				{ name: 'collection', in: 'path', required: true },
				{ name: 'id', in: 'path', required: true },
			]),
		],
	},
	meilisearch: {
		baseUrl: '',
		tools: [
			tool('list_indexes', 'List indexes.', 'GET', '/indexes', []),
			tool('search', 'Search an index.', 'POST', '/indexes/{index}/search', [
				{ name: 'index', in: 'path', required: true },
				{ name: 'body', in: 'body', required: true, description: '{"q":"hello","limit":10}' },
			]),
			tool('get_stats', 'Index/server stats.', 'GET', '/stats', []),
		],
	},
	grafana: {
		baseUrl: '',
		tools: [
			tool('health', 'Health check.', 'GET', '/api/health', []),
			tool('search_dashboards', 'Search dashboards.', 'GET', '/api/search', [{ name: 'query', in: 'query' }]),
			tool('list_datasources', 'List data sources.', 'GET', '/api/datasources', []),
		],
	},
	jina: {
		baseUrl: 'https://api.jina.ai/v1',
		tools: [
			tool('embeddings', 'Create embeddings.', 'POST', '/embeddings', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"jina-embeddings-v3","input":["hello"]}' },
			]),
			tool('rerank', 'Rerank documents against a query.', 'POST', '/rerank', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"jina-reranker-v2-base-multilingual","query":"q","documents":["a","b"]}' },
			]),
		],
	},
	xai: {
		baseUrl: 'https://api.x.ai/v1',
		tools: [
			tool('list_models', 'List Grok models.', 'GET', '/models', []),
			tool('chat_completion', 'Create a chat completion.', 'POST', '/chat/completions', [
				{ name: 'body', in: 'body', required: true, description: '{"model":"grok-2-latest","messages":[{"role":"user","content":"Hi"}]}' },
			]),
		],
	},
	ghost: {
		// Content API: ?key=<content api key>; per-blog base URL.
		baseUrl: '',
		tools: [
			tool('list_posts', 'List published posts.', 'GET', '/ghost/api/content/posts/', [{ name: 'limit', in: 'query' }]),
			tool('get_post', 'Get a post by slug.', 'GET', '/ghost/api/content/posts/slug/{slug}/', [{ name: 'slug', in: 'path', required: true }]),
			tool('list_tags', 'List tags.', 'GET', '/ghost/api/content/tags/', []),
		],
	},
	convertkit: {
		baseUrl: 'https://api.convertkit.com/v3',
		tools: [
			tool('list_subscribers', 'List subscribers.', 'GET', '/subscribers', []),
			tool('list_forms', 'List forms.', 'GET', '/forms', []),
			tool('list_tags', 'List tags.', 'GET', '/tags', []),
		],
	},
	wikipedia: {
		baseUrl: 'https://en.wikipedia.org',
		tools: [
			tool('summary', 'Get a page summary.', 'GET', '/api/rest_v1/page/summary/{title}', [
				{ name: 'title', in: 'path', required: true, description: 'Page title' },
			]),
			tool('search', 'Search articles.', 'GET', '/w/rest.php/v1/search/page', [
				{ name: 'q', in: 'query', required: true, description: 'Search text' },
				{ name: 'limit', in: 'query' },
			]),
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
