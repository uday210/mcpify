import { describe, it, expect } from 'vitest';
import { redactObject, redactText } from '@/lib/mcp/redact';

describe('redactObject', () => {
	it('redacts sensitive keys, keeps the rest', () => {
		const out = redactObject({
			username: 'jane',
			password: 'hunter2',
			api_key: 'sk-123',
			nested: { client_secret: 'abc', count: 5 },
			items: [{ token: 't' }, { name: 'ok' }],
		});
		expect(out.username).toBe('jane');
		expect(out.password).toBe('«redacted»');
		expect(out.api_key).toBe('«redacted»');
		expect(out.nested.client_secret).toBe('«redacted»');
		expect(out.nested.count).toBe(5);
		expect(out.items[0].token).toBe('«redacted»');
		expect(out.items[1].name).toBe('ok');
	});

	it('handles null/primitives', () => {
		expect(redactObject(null)).toBeNull();
		expect(redactObject('x')).toBe('x');
	});
});

describe('redactText', () => {
	it('masks token-like JSON values', () => {
		const out = redactText('{"access_token":"abc123","city":"NYC"}')!;
		expect(out).not.toContain('abc123');
		expect(out).toContain('NYC');
	});

	it('masks Bearer and Basic credentials', () => {
		expect(redactText('Authorization: Bearer abcdef123456')!).not.toContain('abcdef123456');
		expect(redactText('Authorization: Basic dXNlcjpwYXNzd29yZA==')!).not.toContain('dXNlcjpwYXNzd29yZA==');
	});

	it('passes through null', () => {
		expect(redactText(null)).toBeNull();
	});
});
