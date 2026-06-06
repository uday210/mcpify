import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeTool } from '@/lib/proxy';
import { encryptCredentials } from '@/lib/encryption';

function mockFetch(status = 200, bodyText = '{"ok":true}') {
	const fn = vi.fn(async (_url: string, _init: any) => ({
		status,
		ok: status >= 200 && status < 300,
		statusText: status === 200 ? 'OK' : 'ERR',
		text: async () => bodyText,
	}));
	vi.stubGlobal('fetch', fn);
	return fn;
}

const getTool = {
	name: 'get_widget',
	http_method: 'GET',
	path_template: '/widgets/{id}',
	param_map: [
		{ name: 'id', in: 'path', required: true },
		{ name: 'q', in: 'query', required: false },
	],
	input_schema: { type: 'object', required: ['id'] },
};

describe('executeTool', () => {
	beforeEach(() => mockFetch());
	afterEach(() => vi.unstubAllGlobals());

	it('substitutes path params, adds query, and injects bearer auth', async () => {
		const fetchFn = mockFetch(200);
		const connection = {
			base_url: 'https://api.demo.com',
			auth_type: 'bearer',
			credentials: encryptCredentials({ value: 'tok_123' }),
			config: {},
		};
		const res = await executeTool(connection, getTool, { id: '42', q: 'hello' });
		expect(res.isError).toBe(false);

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toContain('/widgets/42');
		expect(url).toContain('q=hello');
		expect((init.headers as any).Authorization).toBe('Bearer tok_123');
	});

	it('rejects a missing required argument before calling fetch', async () => {
		const fetchFn = mockFetch(200);
		const connection = { base_url: 'https://api.demo.com', auth_type: 'none', config: {} };
		const res = await executeTool(connection, getTool, { q: 'hello' });
		expect(res.isError).toBe(true);
		expect(res.content[0].text).toMatch(/Missing required/i);
		expect(fetchFn).not.toHaveBeenCalled();
	});

	it('puts api_key in the configured query param', async () => {
		const fetchFn = mockFetch(200);
		const connection = {
			base_url: 'https://api.demo.com',
			auth_type: 'api_key',
			credentials: encryptCredentials({ value: 'KEY' }),
			config: { api_key_in: 'query', api_key_name: 'apikey' },
		};
		await executeTool(connection, { ...getTool, param_map: [{ name: 'id', in: 'path', required: true }] }, { id: '1' });
		const [url] = fetchFn.mock.calls[0];
		expect(url).toContain('apikey=KEY');
	});

	it('reports an error result on a non-2xx upstream response', async () => {
		mockFetch(500, 'boom');
		const connection = { base_url: 'https://api.demo.com', auth_type: 'none', config: {} };
		const res = await executeTool(connection, { ...getTool, http_method: 'GET', param_map: [] , input_schema: {} }, {});
		expect(res.isError).toBe(true);
	});
});
