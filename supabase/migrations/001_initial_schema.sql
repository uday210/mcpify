-- Users and Authentication (handled by Supabase Auth)
-- profiles table for user metadata
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organizations for multi-tenant support
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Organization members
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member', -- owner, admin, member
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, user_id)
);

-- Cloud Application Definitions (connectors for different cloud services)
CREATE TABLE IF NOT EXISTS app_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- e.g., "Stripe", "Salesforce", "HubSpot"
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  base_url TEXT,
  auth_type TEXT NOT NULL, -- oauth, api_key, basic_auth, custom
  scope_permissions TEXT[] DEFAULT '{}', -- required OAuth scopes
  api_documentation_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cloud Application Connections (user's authenticated connections to cloud apps)
CREATE TABLE IF NOT EXISTS app_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  app_def_id UUID REFERENCES app_definitions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- User's friendly name for this connection
  auth_type TEXT NOT NULL, -- oauth, api_key, basic_auth
  -- Encrypted credential storage (hex string from lib/encryption.ts)
  credentials TEXT, -- Encrypted JSON of credentials (null until configured)
  -- OAuth specific
  oauth_token TEXT, -- Encrypted access token
  oauth_refresh_token TEXT, -- Encrypted refresh token
  oauth_expires_at TIMESTAMP WITH TIME ZONE,
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- MCP Server Configurations (generated MCP servers)
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  app_connection_id UUID REFERENCES app_connections(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  -- Protocol configuration
  transport_type TEXT NOT NULL, -- sse, http_stream, websocket
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE, -- For authentication
  -- Tools and Resources to expose
  enabled_tools TEXT[] DEFAULT '{}',
  enabled_resources TEXT[] DEFAULT '{}',
  -- Configuration
  timeout_ms INTEGER DEFAULT 30000,
  max_connections INTEGER DEFAULT 100,
  -- Status and monitoring
  is_active BOOLEAN DEFAULT TRUE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  access_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, slug)
);

-- MCP Server Access Logs (audit trail)
CREATE TABLE IF NOT EXISTS mcp_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL, -- list_tools, call_tool, etc
  resource TEXT,
  status_code INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  client_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Keys for MCP Servers (additional keys for same server)
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES profiles(id)
);

-- Sample Requests/Responses (for testing and documentation)
CREATE TABLE IF NOT EXISTS mcp_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  sample_input JSONB,
  sample_output JSONB,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- API Documentation Cache
CREATE TABLE IF NOT EXISTS app_api_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_def_id UUID REFERENCES app_definitions(id) ON DELETE CASCADE NOT NULL,
  spec_version TEXT,
  spec_content JSONB, -- OpenAPI/Swagger spec
  endpoint_count INTEGER,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_app_connections_org ON app_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_org ON mcp_servers(org_id);
CREATE INDEX IF NOT EXISTS idx_mcp_servers_connection ON mcp_servers(app_connection_id);
CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_server ON mcp_access_logs(mcp_server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_access_logs_created ON mcp_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_app_defs_active ON app_definitions(is_active);
