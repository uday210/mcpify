import yaml from 'js-yaml';

// Converts an OpenAPI 3.x / Swagger 2.0 document into MCP tool definitions.
// Each operation becomes one tool; parameters + request body become the tool's
// JSON-Schema inputSchema, and param_map records where each argument goes when
// the proxy reconstructs the upstream HTTP request.

export interface GeneratedTool {
	name: string;
	description: string;
	input_schema: Record<string, any>;
	http_method: string;
	path_template: string;
	param_map: Array<{ name: string; in: 'path' | 'query' | 'header' | 'body'; required: boolean }>;
}

export interface ParsedSpec {
	title: string;
	baseUrl: string;
	tools: GeneratedTool[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'];
const MAX_TOOLS = 300;

/** Parses a spec from a JSON or YAML string. */
export function parseSpecString(text: string): ParsedSpec {
	let doc: any;
	try {
		doc = JSON.parse(text);
	} catch {
		doc = yaml.load(text);
	}
	if (!doc || typeof doc !== 'object') {
		throw new Error('Could not parse spec as JSON or YAML');
	}
	return specToTools(doc);
}

export function specToTools(doc: any): ParsedSpec {
	const title: string = doc.info?.title || 'API';
	const baseUrl = deriveBaseUrl(doc);
	const paths = doc.paths || {};
	const tools: GeneratedTool[] = [];
	const usedNames = new Set<string>();

	for (const [path, pathItem] of Object.entries<any>(paths)) {
		if (!pathItem || typeof pathItem !== 'object') continue;
		const sharedParams = pathItem.parameters || [];

		for (const method of HTTP_METHODS) {
			const op = pathItem[method];
			if (!op || typeof op !== 'object') continue;
			if (tools.length >= MAX_TOOLS) break;

			const name = uniqueName(op.operationId || `${method}_${path}`, usedNames);
			const properties: Record<string, any> = {};
			const required: string[] = [];
			const paramMap: GeneratedTool['param_map'] = [];

			// Path + query + header parameters (operation-level and path-level).
			const allParams = [...sharedParams, ...(op.parameters || [])];
			for (const raw of allParams) {
				const p = resolveRef(raw, doc);
				if (!p || !p.name || !p.in) continue;
				if (!['path', 'query', 'header'].includes(p.in)) continue;
				properties[p.name] = describeSchema(p.schema || { type: p.type || 'string' }, doc, p.description);
				if (p.required) required.push(p.name);
				paramMap.push({ name: p.name, in: p.in, required: !!p.required });
			}

			// Request body. OpenAPI 3 (requestBody) and Swagger 2 (in: body param).
			const bodyProps = extractBodyProps(op, doc);
			for (const bp of bodyProps) {
				properties[bp.name] = bp.schema;
				if (bp.required) required.push(bp.name);
				paramMap.push({ name: bp.name, in: 'body', required: bp.required });
			}

			tools.push({
				name,
				description: (op.summary || op.description || `${method.toUpperCase()} ${path}`).slice(0, 500),
				input_schema: {
					type: 'object',
					properties,
					...(required.length ? { required } : {}),
				},
				http_method: method.toUpperCase(),
				path_template: path,
				param_map: paramMap,
			});
		}
	}

	return { title, baseUrl, tools };
}

function deriveBaseUrl(doc: any): string {
	// OpenAPI 3
	if (Array.isArray(doc.servers) && doc.servers[0]?.url) {
		return String(doc.servers[0].url).replace(/\/$/, '');
	}
	// Swagger 2
	if (doc.host) {
		const scheme = (doc.schemes && doc.schemes[0]) || 'https';
		return `${scheme}://${doc.host}${doc.basePath || ''}`.replace(/\/$/, '');
	}
	return '';
}

function extractBodyProps(
	op: any,
	doc: any
): Array<{ name: string; schema: any; required: boolean }> {
	const out: Array<{ name: string; schema: any; required: boolean }> = [];

	// OpenAPI 3 requestBody
	const rb = resolveRef(op.requestBody, doc);
	if (rb?.content) {
		const json = rb.content['application/json'] || rb.content[Object.keys(rb.content)[0]];
		const schema = resolveRef(json?.schema, doc);
		collectObjectProps(schema, doc, !!rb.required, out);
		return out;
	}

	// Swagger 2 body parameter
	const params = op.parameters || [];
	for (const raw of params) {
		const p = resolveRef(raw, doc);
		if (p?.in === 'body') {
			const schema = resolveRef(p.schema, doc);
			collectObjectProps(schema, doc, !!p.required, out);
		}
	}
	return out;
}

function collectObjectProps(
	schema: any,
	doc: any,
	parentRequired: boolean,
	out: Array<{ name: string; schema: any; required: boolean }>
) {
	const resolved = resolveRef(schema, doc);
	if (resolved?.type === 'object' && resolved.properties) {
		const reqSet = new Set<string>(resolved.required || []);
		for (const [propName, propSchema] of Object.entries<any>(resolved.properties)) {
			out.push({
				name: propName,
				schema: describeSchema(propSchema, doc),
				required: reqSet.has(propName),
			});
		}
	} else if (resolved) {
		// Non-object body: expose as a single `body` argument.
		out.push({ name: 'body', schema: describeSchema(resolved, doc), required: parentRequired });
	}
}

/** Produces a clean JSON-Schema fragment for a tool argument (refs resolved, capped depth). */
function describeSchema(schema: any, doc: any, description?: string, depth = 0): any {
	const resolved = resolveRef(schema, doc);
	if (!resolved || depth > 4) return { type: 'string', ...(description ? { description } : {}) };

	const out: any = {};
	if (resolved.type) out.type = resolved.type;
	if (resolved.enum) out.enum = resolved.enum;
	if (resolved.format) out.format = resolved.format;
	const desc = description || resolved.description;
	if (desc) out.description = String(desc).slice(0, 300);
	if (resolved.type === 'array' && resolved.items) {
		out.items = describeSchema(resolved.items, doc, undefined, depth + 1);
	}
	if (resolved.type === 'object' && resolved.properties) {
		out.properties = {};
		for (const [k, v] of Object.entries<any>(resolved.properties)) {
			out.properties[k] = describeSchema(v, doc, undefined, depth + 1);
		}
	}
	if (!out.type && !out.enum) out.type = 'string';
	return out;
}

function resolveRef(node: any, doc: any, seen = new Set<string>()): any {
	if (!node || typeof node !== 'object') return node;
	if (typeof node.$ref === 'string') {
		if (seen.has(node.$ref)) return {};
		seen.add(node.$ref);
		const target = lookupRef(node.$ref, doc);
		return resolveRef(target, doc, seen);
	}
	return node;
}

function lookupRef(ref: string, doc: any): any {
	if (!ref.startsWith('#/')) return {};
	const parts = ref.slice(2).split('/');
	let cur = doc;
	for (const part of parts) {
		const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
		cur = cur?.[key];
		if (cur === undefined) return {};
	}
	return cur;
}

function uniqueName(raw: string, used: Set<string>): string {
	let name = raw
		.replace(/[^a-zA-Z0-9_-]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.slice(0, 60);
	if (!name) name = 'tool';
	let candidate = name;
	let i = 2;
	while (used.has(candidate)) {
		candidate = `${name}_${i++}`;
	}
	used.add(candidate);
	return candidate;
}
