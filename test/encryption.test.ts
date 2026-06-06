import { describe, it, expect } from 'vitest';
import { encryptCredentials, decryptCredentials, generateApiKey, hashApiKey } from '@/lib/encryption';

describe('encryption', () => {
	it('round-trips an object', () => {
		const data = { value: 'super-secret', username: 'a@b.com' };
		const enc = encryptCredentials(data);
		expect(enc).not.toContain('super-secret'); // ciphertext, not plaintext
		expect(decryptCredentials(enc)).toEqual(data);
	});

	it('produces different ciphertext each time (random IV)', () => {
		const a = encryptCredentials({ value: 'x' });
		const b = encryptCredentials({ value: 'x' });
		expect(a).not.toEqual(b);
		expect(decryptCredentials(a)).toEqual(decryptCredentials(b));
	});

	it('hashApiKey is deterministic and not the raw key', () => {
		const key = 'mcpify_abc123';
		expect(hashApiKey(key)).toEqual(hashApiKey(key));
		expect(hashApiKey(key)).not.toEqual(key);
	});

	it('generateApiKey returns unique values', () => {
		expect(generateApiKey()).not.toEqual(generateApiKey());
	});
});
