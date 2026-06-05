-- ============================================================================
-- Migration 003: Connector model + generated MCP tools
-- ----------------------------------------------------------------------------
-- Adds the columns that let a connection be backed by a catalog app, an
-- OpenAPI spec, or a manually defined set of endpoints, and introduces the
-- mcp_tools table that the MCP runtime serves from.
-- ============================================================================

-- --- app_definitions: store catalog connector metadata (oauth endpoints, etc)
ALTER TABLE app_definitions
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;

-- --- app_connections: support custom (non-catalog) connectors
ALTER TABLE app_connections
  ALTER COLUMN app_def_id DROP NOT NULL;

ALTER TABLE app_connections
  ADD COLUMN IF NOT EXISTS connector_type TEXT NOT NULL DEFAULT 'catalog', -- catalog | openapi | manual
  ADD COLUMN IF NOT EXISTS base_url TEXT,
  -- config holds connector-specific settings:
  --   api_key_in/api_key_name (api_key auth), header_name (custom auth),
  --   oauth { authorize_url, token_url, client_id, client_secret(enc), scopes }
  ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb,
  -- raw OpenAPI document (for re-generating tools later)
  ADD COLUMN IF NOT EXISTS openapi_spec JSONB;

-- --- mcp_tools: one row per tool exposed by an MCP server
CREATE TABLE IF NOT EXISTS mcp_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- JSON Schema describing tool arguments (MCP inputSchema)
  input_schema JSONB NOT NULL DEFAULT '{"type":"object","properties":{}}'::jsonb,
  -- How to build the upstream HTTP request
  http_method TEXT NOT NULL DEFAULT 'GET',
  path_template TEXT NOT NULL DEFAULT '/', -- e.g. /repos/{owner}/{repo}/issues
  -- param_map: array of { name, in: path|query|header|body, required }
  param_map JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mcp_server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_mcp_tools_server ON mcp_tools(mcp_server_id);

-- The slug routes the public MCP URL (/api/mcp/<slug>) so it must be globally
-- unique, not just unique per organization.
ALTER TABLE mcp_servers DROP CONSTRAINT IF EXISTS mcp_servers_slug_global_unique;
ALTER TABLE mcp_servers ADD CONSTRAINT mcp_servers_slug_global_unique UNIQUE (slug);

-- --- Seed a few catalog connectors. Tool sets for these live in
-- --- src/lib/connectors/catalog.ts; this row carries metadata + auth config.
INSERT INTO app_definitions (name, slug, description, logo_url, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  (
    'GitHub', 'github',
    'Repos, issues, pull requests and more via the GitHub REST API.',
    'https://github.githubassets.com/favicons/favicon.svg',
    'https://api.github.com', 'bearer', '{}',
    'https://docs.github.com/rest',
    '{"oauth":{"authorize_url":"https://github.com/login/oauth/authorize","token_url":"https://github.com/login/oauth/access_token","scopes":["repo","read:user"]},"auth_help":"Create a Personal Access Token at https://github.com/settings/tokens, or use OAuth."}'::jsonb
  ),
  (
    'Stripe', 'stripe',
    'Payments, customers, invoices and subscriptions via the Stripe API.',
    'https://stripe.com/favicon.ico',
    'https://api.stripe.com', 'bearer', '{}',
    'https://stripe.com/docs/api',
    '{"auth_help":"Use a Secret API key (sk_...) from https://dashboard.stripe.com/apikeys."}'::jsonb
  ),
  (
    'OpenWeather', 'openweather',
    'Current weather and forecasts via the OpenWeather API.',
    'https://openweathermap.org/favicon.ico',
    'https://api.openweathermap.org', 'api_key', '{}',
    'https://openweathermap.org/api',
    '{"api_key_in":"query","api_key_name":"appid","auth_help":"Get a free API key at https://home.openweathermap.org/api_keys."}'::jsonb
  )
ON CONFLICT (slug) DO NOTHING;
