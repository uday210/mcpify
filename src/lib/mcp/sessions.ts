// In-memory registry of open SSE sessions for the legacy HTTP+SSE transport.
//
// The SSE transport opens a long-lived GET stream and delivers JSON-RPC
// responses to POSTs that arrive on a separate /messages request. Correlating
// the two requires shared state. mcpify runs as a persistent Node process on
// Railway (`next start`), so a module-level map works for a single instance.
// (For multi-instance scale this would move to Redis pub/sub.)

type Encoder = TextEncoder;

interface Session {
	controller: ReadableStreamDefaultController<Uint8Array>;
	encoder: Encoder;
	slug: string;
}

const g = globalThis as any;
if (!g.__mcpifySseSessions) {
	g.__mcpifySseSessions = new Map<string, Session>();
}
const sessions: Map<string, Session> = g.__mcpifySseSessions;

export function registerSession(id: string, session: Session): void {
	sessions.set(id, session);
}

export function removeSession(id: string): void {
	sessions.delete(id);
}

export function getSession(id: string): Session | undefined {
	return sessions.get(id);
}

/** Pushes a JSON-RPC message to a session's SSE stream. Returns false if gone. */
export function pushToSession(id: string, message: unknown): boolean {
	const session = sessions.get(id);
	if (!session) return false;
	try {
		const data = `event: message\ndata: ${JSON.stringify(message)}\n\n`;
		session.controller.enqueue(session.encoder.encode(data));
		return true;
	} catch {
		sessions.delete(id);
		return false;
	}
}
