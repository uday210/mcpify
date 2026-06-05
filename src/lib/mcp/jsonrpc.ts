// Minimal JSON-RPC 2.0 helpers for the MCP runtime.
// MCP messages are JSON-RPC 2.0; this module models requests/responses and the
// standard error codes so the runtime can stay focused on method dispatch.

export interface JsonRpcRequest {
	jsonrpc: '2.0';
	id?: string | number | null;
	method: string;
	params?: any;
}

export interface JsonRpcSuccess {
	jsonrpc: '2.0';
	id: string | number | null;
	result: any;
}

export interface JsonRpcErrorResponse {
	jsonrpc: '2.0';
	id: string | number | null;
	error: { code: number; message: string; data?: any };
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcErrorResponse;

// Standard JSON-RPC error codes.
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

export function rpcResult(id: string | number | null, result: any): JsonRpcSuccess {
	return { jsonrpc: '2.0', id, result };
}

export function rpcError(
	id: string | number | null,
	code: number,
	message: string,
	data?: any
): JsonRpcErrorResponse {
	return { jsonrpc: '2.0', id: id ?? null, error: { code, message, ...(data ? { data } : {}) } };
}

/** A request without an `id` is a notification and expects no response. */
export function isNotification(req: JsonRpcRequest): boolean {
	return req.id === undefined || req.id === null;
}
