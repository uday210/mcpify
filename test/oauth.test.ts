import { describe, it, expect } from 'vitest';
import { signState, verifyState, signToken, verifyToken } from '@/lib/oauth';

describe('oauth state', () => {
	it('round-trips a signed state', () => {
		const state = signState({ connectionId: 'abc' });
		expect(verifyState(state)).toMatchObject({ connectionId: 'abc' });
	});

	it('rejects a tampered state', () => {
		const state = signState({ connectionId: 'abc' });
		const tampered = state.slice(0, -2) + (state.endsWith('a') ? 'bb' : 'aa');
		expect(verifyState(tampered)).toBeNull();
	});

	it('rejects garbage', () => {
		expect(verifyState('not-a-real-state')).toBeNull();
	});
});

describe('oauth token', () => {
	it('round-trips within its max age', () => {
		const tok = signToken({ sub: 'server-1' });
		expect(verifyToken(tok, 60_000)).toMatchObject({ sub: 'server-1' });
	});

	it('rejects an expired token', () => {
		const tok = signToken({ sub: 'server-1' });
		expect(verifyToken(tok, -1)).toBeNull();
	});
});
