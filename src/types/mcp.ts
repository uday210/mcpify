// MCP Server Configuration Types
export type TransportType = 'sse' | 'http_stream' | 'websocket';

export type AuthType = 'oauth' | 'api_key' | 'basic_auth' | 'custom';

export interface MCPServerConfig {
	id: string;
	name: string;
	slug: string;
	description?: string;
	transportType: TransportType;
	baseUrl: string;
	apiKey: string;
	enabledTools: string[];
	enabledResources: string[];
	timeoutMs: number;
	maxConnections: number;
	isActive: boolean;
}

export interface CloudAppDefinition {
	id: string;
	name: string;
	slug: string;
	description?: string;
	logoUrl?: string;
	baseUrl: string;
	authType: AuthType;
	scopePermissions: string[];
	apiDocumentationUrl?: string;
	isActive: boolean;
}

export interface AppConnection {
	id: string;
	orgId: string;
	appDefId: string;
	name: string;
	authType: AuthType;
	credentials: Record<string, any>;
	oauthToken?: string;
	oauthRefreshToken?: string;
	oauthExpiresAt?: Date;
	isActive: boolean;
	lastVerifiedAt?: Date;
	errorMessage?: string;
}

// MCP Protocol Types
export interface MCPTool {
	name: string;
	description?: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, any>;
		required?: string[];
	};
}

export interface MCPResource {
	uri: string;
	name: string;
	description?: string;
	mimeType?: string;
}

export interface ListToolsRequest {
	method: 'tools/list';
}

export interface ListToolsResponse {
	tools: MCPTool[];
}

export interface CallToolRequest {
	method: 'tools/call';
	params: {
		name: string;
		arguments: Record<string, any>;
	};
}

export interface CallToolResponse {
	content: Array<{
		type: 'text' | 'image';
		text?: string;
		data?: string;
		mimeType?: string;
	}>;
}

export interface ListResourcesRequest {
	method: 'resources/list';
}

export interface ListResourcesResponse {
	resources: MCPResource[];
}

export interface ReadResourceRequest {
	method: 'resources/read';
	params: {
		uri: string;
	};
}

export interface ReadResourceResponse {
	contents: Array<{
		uri: string;
		mimeType?: string;
		text?: string;
		data?: string;
	}>;
}

// MCP Error
export interface MCPError {
	code: number;
	message: string;
	data?: Record<string, any>;
}

// MCP Access Log
export interface MCPAccessLog {
	id: string;
	mcpServerId: string;
	method: string;
	resource?: string;
	statusCode?: number;
	errorMessage?: string;
	durationMs?: number;
	clientIp?: string;
	userAgent?: string;
	createdAt: Date;
}
