import { describe, it, expect } from 'vitest';
import { parseSpecString } from '@/lib/connectors/openapi-to-mcp';

const SPEC = JSON.stringify({
	openapi: '3.0.0',
	info: { title: 'Demo API' },
	servers: [{ url: 'https://api.demo.com/v1' }],
	paths: {
		'/widgets/{id}': {
			get: {
				operationId: 'getWidget',
				summary: 'Get a widget',
				parameters: [
					{ name: 'id', in: 'path', required: true, schema: { type: 'string' } },
					{ name: 'verbose', in: 'query', required: false, schema: { type: 'boolean' } },
				],
			},
		},
		'/widgets': {
			post: {
				operationId: 'createWidget',
				requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
			},
		},
	},
});

describe('openapi-to-mcp', () => {
	const parsed = parseSpecString(SPEC);

	it('derives the base URL and title', () => {
		expect(parsed.baseUrl).toBe('https://api.demo.com/v1');
		expect(parsed.title).toBe('Demo API');
	});

	it('creates one tool per operation', () => {
		expect(parsed.tools).toHaveLength(2);
	});

	it('maps GET path + query params correctly', () => {
		const get = parsed.tools.find((t) => t.path_template === '/widgets/{id}')!;
		expect(get.http_method).toBe('GET');
		const id = get.param_map.find((p) => p.name === 'id');
		expect(id).toMatchObject({ in: 'path', required: true });
		expect(get.param_map.find((p) => p.name === 'verbose')).toMatchObject({ in: 'query', required: false });
	});

	it('marks the POST operation as a write with a body', () => {
		const post = parsed.tools.find((t) => t.path_template === '/widgets' && t.http_method === 'POST')!;
		expect(post).toBeTruthy();
		expect(post.param_map.some((p) => p.in === 'body')).toBe(true);
	});

	it('throws on unparseable input', () => {
		expect(() => parseSpecString('%%% not json or yaml: : :')).toThrow();
	});
});
