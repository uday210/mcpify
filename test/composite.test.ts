import { describe, it, expect } from 'vitest';
import { renderValue, buildStepArgs, resolvePath, type CompositeCtx } from '@/lib/mcp/composite';

const ctx: CompositeCtx = {
	input: { title: 'Bug', count: 3 },
	steps: [
		{ text: '{"id":42,"meta":{"sha":"abc"}}', json: { id: 42, meta: { sha: 'abc' } } },
	],
};

describe('composite templating', () => {
	it('resolves input tokens', () => {
		expect(renderValue('{{input.title}}', ctx)).toBe('Bug');
	});

	it('returns raw (non-string) value for a single token', () => {
		expect(renderValue('{{input.count}}', ctx)).toBe(3);
		expect(renderValue('{{step1}}', ctx)).toEqual({ id: 42, meta: { sha: 'abc' } });
	});

	it('dot-paths into a previous step result', () => {
		expect(renderValue('{{step1.id}}', ctx)).toBe(42);
		expect(renderValue('{{step1.meta.sha}}', ctx)).toBe('abc');
	});

	it('string-interpolates mixed templates', () => {
		expect(renderValue('Issue {{step1.id}} for {{input.title}}', ctx)).toBe('Issue 42 for Bug');
	});

	it('empty string for unknown tokens', () => {
		expect(renderValue('{{step9.nope}}', ctx)).toBe('');
		expect(renderValue('x={{input.missing}}', ctx)).toBe('x=');
	});

	it('buildStepArgs maps every value', () => {
		const out = buildStepArgs({ a: '{{input.title}}', b: '{{step1.id}}', c: 'static' }, ctx);
		expect(out).toEqual({ a: 'Bug', b: 42, c: 'static' });
	});

	it('resolvePath handles missing safely', () => {
		expect(resolvePath({ a: { b: 1 } }, 'a.b')).toBe(1);
		expect(resolvePath(null, 'a.b')).toBeUndefined();
	});
});
