/** The surfaces a server can be exposed over. */
export type ServerInterface = 'mcp' | 'rest';
export const SERVER_INTERFACES: ServerInterface[] = ['mcp', 'rest'];

/**
 * Whether a server exposes a given interface. Resilient by design: if the
 * `interfaces` column is missing or empty (e.g. before migration 025 is
 * applied, or on legacy rows), every interface is treated as enabled so nothing
 * that worked before regresses.
 */
export function serverHasInterface(server: any, name: ServerInterface): boolean {
	const list = server?.interfaces;
	if (!Array.isArray(list) || list.length === 0) return true;
	return list.includes(name);
}

/** Normalizes arbitrary input into a valid, non-empty interface list. */
export function normalizeInterfaces(input: any): ServerInterface[] {
	const list = Array.isArray(input) ? input.filter((i) => SERVER_INTERFACES.includes(i)) : [];
	return list.length ? (list as ServerInterface[]) : ['mcp'];
}
