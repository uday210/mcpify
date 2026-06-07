import { describe, it, expect } from 'vitest';
import { formEncode } from '@/lib/connectors/formencode';

describe('formEncode', () => {
	it('encodes flat fields', () => {
		expect(formEncode({ To: '+15551234567', Body: 'hi there' })).toBe('To=%2B15551234567&Body=hi+there');
	});

	it('encodes nested objects with bracket notation', () => {
		expect(formEncode({ metadata: { order: '42' } })).toBe('metadata%5Border%5D=42'); // metadata[order]=42
	});

	it('encodes arrays with indexes', () => {
		const out = formEncode({ line_items: [{ price: 'p1', quantity: 2 }] });
		// line_items[0][price]=p1&line_items[0][quantity]=2
		expect(decodeURIComponent(out)).toBe('line_items[0][price]=p1&line_items[0][quantity]=2');
	});

	it('skips null/undefined and stringifies booleans', () => {
		expect(formEncode({ a: null, b: undefined, c: true })).toBe('c=true');
	});
});
