export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					email: string;
					full_name: string | null;
					avatar_url: string | null;
					company_name: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id: string;
					email: string;
					full_name?: string | null;
					avatar_url?: string | null;
					company_name?: string | null;
				};
				Update: {
					full_name?: string | null;
					avatar_url?: string | null;
					company_name?: string | null;
				};
			};
			organizations: {
				Row: {
					id: string;
					owner_id: string;
					name: string;
					slug: string;
					description: string | null;
					logo_url: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					owner_id: string;
					name: string;
					slug: string;
					description?: string | null;
					logo_url?: string | null;
				};
				Update: {
					name?: string;
					description?: string | null;
					logo_url?: string | null;
				};
			};
			org_members: {
				Row: {
					id: string;
					org_id: string;
					user_id: string;
					role: string;
					created_at: string;
				};
				Insert: {
					org_id: string;
					user_id: string;
					role?: string;
				};
			};
			app_definitions: {
				Row: {
					id: string;
					name: string;
					slug: string;
					description: string | null;
					logo_url: string | null;
					base_url: string;
					auth_type: string;
					scope_permissions: string[];
					api_documentation_url: string | null;
					config: Record<string, any>;
					is_active: boolean;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					name: string;
					slug: string;
					description?: string | null;
					logo_url?: string | null;
					base_url: string;
					auth_type: string;
					scope_permissions?: string[];
					config?: Record<string, any>;
				};
			};
			app_connections: {
				Row: {
					id: string;
					org_id: string;
					app_def_id: string | null;
					name: string;
					auth_type: string;
					connector_type: string;
					base_url: string | null;
					credentials: string | null;
					config: Record<string, any>;
					openapi_spec: Record<string, any> | null;
					oauth_token: string | null;
					oauth_refresh_token: string | null;
					oauth_expires_at: string | null;
					is_active: boolean;
					last_verified_at: string | null;
					error_message: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					org_id: string;
					app_def_id?: string | null;
					name: string;
					auth_type: string;
					connector_type?: string;
					base_url?: string | null;
					credentials?: string | null;
					config?: Record<string, any>;
					openapi_spec?: Record<string, any> | null;
				};
				Update: {
					name?: string;
					is_active?: boolean;
					base_url?: string | null;
					credentials?: string | null;
					config?: Record<string, any>;
					openapi_spec?: Record<string, any> | null;
					oauth_token?: string | null;
					oauth_refresh_token?: string | null;
					oauth_expires_at?: string | null;
					last_verified_at?: string | null;
					error_message?: string | null;
				};
			};
			mcp_tools: {
				Row: {
					id: string;
					mcp_server_id: string;
					app_connection_id: string | null;
					name: string;
					description: string | null;
					input_schema: Record<string, any>;
					http_method: string;
					path_template: string;
					param_map: Array<Record<string, any>>;
					enabled: boolean;
					created_at: string;
				};
				Insert: {
					mcp_server_id: string;
					app_connection_id?: string | null;
					name: string;
					description?: string | null;
					input_schema?: Record<string, any>;
					http_method?: string;
					path_template?: string;
					param_map?: Array<Record<string, any>>;
					enabled?: boolean;
				};
				Update: {
					name?: string;
					description?: string | null;
					input_schema?: Record<string, any>;
					http_method?: string;
					path_template?: string;
					param_map?: Array<Record<string, any>>;
					enabled?: boolean;
				};
			};
			mcp_servers: {
				Row: {
					id: string;
					org_id: string;
					app_connection_id: string;
					name: string;
					slug: string;
					description: string | null;
					transport_type: string;
					base_url: string;
					api_key: string;
					auth_required: boolean;
					auth_mode: string;
					oauth_client_id: string | null;
					oauth_client_secret: string | null;
					mode: string;
					enabled_tools: string[];
					enabled_resources: string[];
					timeout_ms: number;
					max_connections: number;
					is_active: boolean;
					last_accessed_at: string | null;
					access_count: number;
					error_count: number;
					last_error: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					org_id: string;
					app_connection_id?: string | null;
					name: string;
					slug: string;
					description?: string | null;
					transport_type: string;
					base_url: string;
					api_key: string;
					auth_required?: boolean;
					auth_mode?: string;
					oauth_client_id?: string | null;
					oauth_client_secret?: string | null;
					mode?: string;
					enabled_tools?: string[];
					enabled_resources?: string[];
				};
				Update: {
					name?: string;
					description?: string | null;
					enabled_tools?: string[];
					enabled_resources?: string[];
					is_active?: boolean;
					auth_required?: boolean;
					auth_mode?: string;
					oauth_client_id?: string | null;
					oauth_client_secret?: string | null;
					last_error?: string | null;
					last_accessed_at?: string | null;
					access_count?: number;
					error_count?: number;
					api_key?: string;
				};
			};
			mcp_access_logs: {
				Row: {
					id: string;
					mcp_server_id: string;
					method: string;
					resource: string | null;
					status_code: number | null;
					error_message: string | null;
					duration_ms: number | null;
					client_ip: string | null;
					user_agent: string | null;
					created_at: string;
				};
				Insert: {
					mcp_server_id: string;
					method: string;
					resource?: string | null;
					status_code?: number | null;
					error_message?: string | null;
					duration_ms?: number | null;
					client_ip?: string | null;
					user_agent?: string | null;
				};
			};
			mcp_api_keys: {
				Row: {
					id: string;
					mcp_server_id: string;
					key_hash: string;
					name: string | null;
					is_active: boolean;
					last_used_at: string | null;
					created_at: string;
					created_by: string | null;
				};
				Insert: {
					mcp_server_id: string;
					key_hash: string;
					name?: string | null;
					created_by?: string | null;
				};
				Update: {
					name?: string | null;
					is_active?: boolean;
					last_used_at?: string | null;
				};
			};
			mcp_samples: {
				Row: {
					id: string;
					mcp_server_id: string;
					tool_name: string;
					sample_input: Record<string, any> | null;
					sample_output: Record<string, any> | null;
					description: string | null;
					created_at: string;
				};
				Insert: {
					mcp_server_id: string;
					tool_name: string;
					sample_input?: Record<string, any> | null;
					sample_output?: Record<string, any> | null;
					description?: string | null;
				};
			};
		};
	};
};
