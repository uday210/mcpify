import { encryptCredentials } from '@/lib/encryption';
import { getCatalogConnector } from '@/lib/connectors/catalog';
import { parseSpecString, GeneratedTool } from '@/lib/connectors/openapi-to-mcp';

export interface BuildResult {
	insert: Record<string, any>;
	toolCount: number;
}

/**
 * Builds the app_connections insert payload for any connector type. Generates
 * the tool catalog (stored in config.tools), resolves the upstream base URL,
 * encrypts credentials + OAuth client secret, and assembles auth config.
 *
 * Throws Error(message) on validation problems so the route can return 400.
 */
export async function buildConnectionInsert(
	supabase: any,
	orgId: string,
	body: any
): Promise<BuildResult> {
	const connectorType: string = body.connectorType || 'catalog';
	const authType: string = body.authType || 'api_key';
	const config: Record<string, any> = {};
	let baseUrl: string = body.baseUrl || '';
	let tools: GeneratedTool[] = [];
	let appDefId: string | null = null;
	let openapiSpec: any = null;

	if (connectorType === 'catalog') {
		const appSlug = body.appSlug;
		if (!appSlug) throw new Error('appSlug is required for catalog connectors');
		const { data: def } = await supabase
			.from('app_definitions')
			.select('*')
			.eq('slug', appSlug)
			.maybeSingle();
		if (!def) throw new Error(`Unknown catalog app: ${appSlug}`);
		const catalog = getCatalogConnector(appSlug);
		if (!catalog) throw new Error(`No tools defined for catalog app: ${appSlug}`);
		appDefId = def.id;
		// Apps that need a per-account base URL (Shopify store, Jira/Zendesk site…)
		if (def.config?.needs_base_url) {
			if (!body.baseUrl) throw new Error('This app needs a Base URL (your account/store URL).');
			baseUrl = body.baseUrl;
		} else {
			baseUrl = baseUrl || catalog.baseUrl || def.base_url;
		}
		tools = catalog.tools;
		// Carry catalog OAuth endpoints into config for the OAuth flow.
		if (def.config?.oauth) config.oauth = { ...def.config.oauth };
		if (def.config?.api_key_in) config.api_key_in = def.config.api_key_in;
		if (def.config?.api_key_name) config.api_key_name = def.config.api_key_name;
		if (def.config?.static_headers) config.static_headers = def.config.static_headers;
	} else if (connectorType === 'openapi') {
		let specText: string = body.openapiSpec || '';
		if (!specText && body.openapiUrl) {
			const resp = await fetch(body.openapiUrl);
			if (!resp.ok) throw new Error(`Failed to fetch spec (HTTP ${resp.status})`);
			specText = await resp.text();
		}
		if (!specText) throw new Error('Provide an OpenAPI spec (URL or pasted JSON/YAML)');
		const parsed = parseSpecString(specText);
		if (!parsed.tools.length) throw new Error('No operations found in the spec');
		baseUrl = baseUrl || parsed.baseUrl;
		tools = parsed.tools;
		openapiSpec = { source: body.openapiUrl || 'pasted', title: parsed.title };
		if (!baseUrl) throw new Error('Spec has no server URL; provide a base URL');
	} else if (connectorType === 'manual') {
		if (!baseUrl) throw new Error('baseUrl is required for manual connectors');
		tools = normalizeManualTools(body.tools);
		if (!tools.length) throw new Error('Add at least one tool');
	} else {
		throw new Error(`Unknown connector type: ${connectorType}`);
	}

	config.tools = tools;

	// --- Auth-type-specific config + credential encryption.
	const credsInput = body.credentials || {};
	let credentials: string | null = null;

	if (authType === 'api_key') {
		config.api_key_in = body.config?.api_key_in || config.api_key_in || 'header';
		config.api_key_name = body.config?.api_key_name || config.api_key_name || 'X-API-Key';
		if (credsInput.value) credentials = encryptCredentials({ value: credsInput.value });
	} else if (authType === 'bearer') {
		if (credsInput.value) credentials = encryptCredentials({ value: credsInput.value });
	} else if (authType === 'basic') {
		if (credsInput.username) {
			credentials = encryptCredentials({
				username: credsInput.username,
				password: credsInput.password || '',
			});
		}
	} else if (authType === 'custom') {
		config.header_name = body.config?.header_name || 'Authorization';
		if (credsInput.headers) credentials = encryptCredentials({ headers: credsInput.headers });
		else if (credsInput.value) credentials = encryptCredentials({ value: credsInput.value });
	} else if (authType === 'oauth') {
		const o = body.config?.oauth || {};
		config.oauth = {
			...(config.oauth || {}),
			...(o.authorize_url ? { authorize_url: o.authorize_url } : {}),
			...(o.token_url ? { token_url: o.token_url } : {}),
			...(o.scopes ? { scopes: o.scopes } : {}),
			...(o.client_id ? { client_id: o.client_id } : {}),
			...(o.client_secret ? { client_secret: encryptCredentials({ value: o.client_secret }) } : {}),
		};
	} else if (authType === 'oauth2_cc') {
		// OAuth2 client-credentials: token fetched on demand from token_url.
		const o = body.config?.oauth || {};
		config.oauth = {
			...(config.oauth || {}),
			...(o.token_url ? { token_url: o.token_url } : {}),
			...(o.scope ? { scope: o.scope } : {}),
			...(o.client_id ? { client_id: o.client_id } : {}),
			...(o.client_secret ? { client_secret: encryptCredentials({ value: o.client_secret }) } : {}),
		};
	}

	const insert = {
		org_id: orgId,
		app_def_id: appDefId,
		name: body.name,
		auth_type: authType,
		connector_type: connectorType,
		base_url: baseUrl,
		credentials,
		config,
		openapi_spec: openapiSpec,
		// OAuth connections aren't usable until the user completes the flow.
		is_active: authType !== 'oauth',
	};

	return { insert, toolCount: tools.length };
}

function normalizeManualTools(input: any): GeneratedTool[] {
	if (!Array.isArray(input)) return [];
	return input
		.filter((t) => t && t.name && t.path_template)
		.map((t) => {
			const paramMap = Array.isArray(t.param_map) ? t.param_map : [];
			const properties: Record<string, any> = {};
			const required: string[] = [];
			for (const p of paramMap) {
				properties[p.name] = { type: p.type || 'string', ...(p.description ? { description: p.description } : {}) };
				if (p.required) required.push(p.name);
			}
			return {
				name: String(t.name).replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 60),
				description: t.description || '',
				input_schema: t.input_schema || {
					type: 'object',
					properties,
					...(required.length ? { required } : {}),
				},
				http_method: (t.http_method || 'GET').toUpperCase(),
				path_template: t.path_template,
				param_map: paramMap.map((p: any) => ({
					name: p.name,
					in: p.in || 'query',
					required: !!p.required,
				})),
			};
		});
}
