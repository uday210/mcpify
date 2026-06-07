'use client';

// Client-side user preferences, persisted in localStorage. These are UI-only
// conveniences (no server round-trip): default transport for the new-server
// wizard, and the Activity page auto-refresh cadence.

export interface Preferences {
	defaultTransport: 'http_stream' | 'sse';
	activityRefreshMs: number; // 0 = off
	llmConnectionId: string | null; // chosen Playground brain
	llmModel: string; // optional model override
}

const KEY = 'mcpify.prefs';

export const DEFAULT_PREFS: Preferences = {
	defaultTransport: 'http_stream',
	activityRefreshMs: 5000,
	llmConnectionId: null,
	llmModel: '',
};

export function getPrefs(): Preferences {
	if (typeof window === 'undefined') return DEFAULT_PREFS;
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return DEFAULT_PREFS;
		return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
	} catch {
		return DEFAULT_PREFS;
	}
}

export function setPrefs(patch: Partial<Preferences>): Preferences {
	const next = { ...getPrefs(), ...patch };
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* ignore */
	}
	return next;
}
