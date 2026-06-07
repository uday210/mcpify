import { describe, it, expect } from 'vitest';
import { parseCurl } from '@/lib/connectors/curl';

describe('parseCurl', () => {
	it('parses a bearer GET with query', () => {
		const p = parseCurl(`curl https://api.example.com/v1/users?limit=10 -H "Authorization: Bearer abc123"`);
		expect(p.method).toBe('GET');
		expect(p.baseUrl).toBe('https://api.example.com');
		expect(p.path).toBe('/v1/users');
		expect(p.authType).toBe('bearer');
		expect(p.authValue).toBe('abc123');
		expect(p.query).toContain('limit');
	});

	it('parses a POST with JSON body and -X', () => {
		const p = parseCurl(`curl -X POST https://api.example.com/items -H 'Content-Type: application/json' -d '{"name":"Tee","price":9}'`);
		expect(p.method).toBe('POST');
		expect(p.path).toBe('/items');
		expect(p.bodyKeys.sort()).toEqual(['name', 'price']);
		expect(p.rawBody).toBe(false);
	});

	it('infers POST when data present without -X', () => {
		const p = parseCurl(`curl https://api.example.com/x --data-raw '{"a":1}'`);
		expect(p.method).toBe('POST');
	});

	it('detects custom api-key header', () => {
		const p = parseCurl(`curl https://api.example.com/p -H "X-API-Key: secret"`);
		expect(p.authType).toBe('custom');
		expect(p.authHeaderName).toBe('X-API-Key');
		expect(p.authValue).toBe('secret');
	});

	it('detects basic auth via -u', () => {
		const p = parseCurl(`curl -u alice:pw https://api.example.com/p`);
		expect(p.authType).toBe('basic');
		expect(p.basicUser).toBe('alice');
		expect(p.basicPass).toBe('pw');
	});

	it('keeps non-auth headers as static headers', () => {
		const p = parseCurl(`curl https://api.example.com/p -H "X-Version: 2"`);
		expect(p.staticHeaders['X-Version']).toBe('2');
	});
});
