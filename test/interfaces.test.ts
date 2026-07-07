import { describe, it, expect } from 'vitest';
import { serverHasInterface, normalizeInterfaces } from '@/lib/mcp/interfaces';

describe('serverHasInterface', () => {
	it('honors an explicit interface list', () => {
		expect(serverHasInterface({ interfaces: ['mcp'] }, 'mcp')).toBe(true);
		expect(serverHasInterface({ interfaces: ['mcp'] }, 'rest')).toBe(false);
		expect(serverHasInterface({ interfaces: ['rest'] }, 'rest')).toBe(true);
		expect(serverHasInterface({ interfaces: ['mcp', 'rest'] }, 'rest')).toBe(true);
	});

	it('treats a missing or empty column as all interfaces enabled (pre-migration safety)', () => {
		expect(serverHasInterface({}, 'mcp')).toBe(true);
		expect(serverHasInterface({}, 'rest')).toBe(true);
		expect(serverHasInterface({ interfaces: null }, 'rest')).toBe(true);
		expect(serverHasInterface({ interfaces: [] }, 'mcp')).toBe(true);
		expect(serverHasInterface(null, 'rest')).toBe(true);
	});
});

describe('normalizeInterfaces', () => {
	it('keeps only valid interfaces', () => {
		expect(normalizeInterfaces(['mcp', 'rest'])).toEqual(['mcp', 'rest']);
		expect(normalizeInterfaces(['rest', 'bogus'])).toEqual(['rest']);
	});

	it('falls back to mcp when input is empty or invalid', () => {
		expect(normalizeInterfaces([])).toEqual(['mcp']);
		expect(normalizeInterfaces(['bogus'])).toEqual(['mcp']);
		expect(normalizeInterfaces(undefined)).toEqual(['mcp']);
		expect(normalizeInterfaces('rest')).toEqual(['mcp']);
	});
});
