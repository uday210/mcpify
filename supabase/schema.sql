-- mcpify consolidated schema — paste into the Supabase SQL editor (runs 001→004 in order).
-- Safe to re-run; statements use IF NOT EXISTS / DROP IF EXISTS where needed.

-- ============================================================
-- supabase/migrations/001_initial_schema.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/002_rls_policies.sql
-- ============================================================
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for organizations
CREATE POLICY "Users can view organizations they are members of"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
    OR owner_id = auth.uid()
  );

-- RLS Policies for org_members
CREATE POLICY "Members can view their organization members"
  ON org_members FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for app_connections
CREATE POLICY "Users can view connections in their organizations"
  ON app_connections FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for mcp_servers
CREATE POLICY "Users can view MCP servers in their organizations"
  ON mcp_servers FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for mcp_access_logs (read only)
CREATE POLICY "Users can view logs for their servers"
  ON mcp_access_logs FOR SELECT
  USING (
    mcp_server_id IN (
      SELECT id FROM mcp_servers 
      WHERE org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_timestamp BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_organizations_timestamp BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_app_definitions_timestamp BEFORE UPDATE ON app_definitions
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_app_connections_timestamp BEFORE UPDATE ON app_connections
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_mcp_servers_timestamp BEFORE UPDATE ON mcp_servers
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================
-- supabase/migrations/003_connector_and_tools.sql
-- ============================================================
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

-- ============================================================
-- supabase/migrations/004_auth_and_rls.sql
-- ============================================================
-- ============================================================================
-- Migration 004: New-user bootstrap trigger + complete RLS policies
-- ----------------------------------------------------------------------------
-- 002 only granted SELECT and its org_members policy was self-recursive. This
-- migration adds a SECURITY DEFINER helper (user_org_ids) to break recursion,
-- a handle_new_user trigger that provisions a profile + personal org, and full
-- CRUD policies scoped by organization membership.
-- ============================================================================

-- --- Helper: org ids the current user belongs to (SECURITY DEFINER bypasses
-- --- RLS on org_members so policies that reference it don't recurse).
CREATE OR REPLACE FUNCTION public.user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid()
$$;

-- --- On signup: create profile + a personal organization + owner membership.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
  display_name TEXT;
BEGIN
  display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, display_name)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.organizations (owner_id, name, slug)
  VALUES (
    NEW.id,
    display_name || '''s workspace',
    'org-' || substr(replace(NEW.id::text, '-', ''), 1, 16)
  )
  RETURNING id INTO new_org_id;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --- Ensure RLS is on for tables added in 003.
ALTER TABLE mcp_tools ENABLE ROW LEVEL SECURITY;

-- --- Drop the policies defined in 002 so we can recreate a complete set.
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organizations they are members of" ON organizations;
DROP POLICY IF EXISTS "Members can view their organization members" ON org_members;
DROP POLICY IF EXISTS "Users can view connections in their organizations" ON app_connections;
DROP POLICY IF EXISTS "Users can view MCP servers in their organizations" ON mcp_servers;
DROP POLICY IF EXISTS "Users can view logs for their servers" ON mcp_access_logs;

-- ============================ profiles =====================================
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ============================ app_definitions (catalog, public read) =======
CREATE POLICY "app_definitions_read" ON app_definitions
  FOR SELECT USING (true);

-- ============================ organizations ================================
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT USING (id IN (SELECT public.user_org_ids()) OR owner_id = auth.uid());
CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE USING (owner_id = auth.uid());

-- ============================ org_members ==================================
CREATE POLICY "org_members_select" ON org_members
  FOR SELECT USING (user_id = auth.uid() OR org_id IN (SELECT public.user_org_ids()));
CREATE POLICY "org_members_insert" ON org_members
  FOR INSERT WITH CHECK (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );
CREATE POLICY "org_members_delete" ON org_members
  FOR DELETE USING (
    org_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
  );

-- ============================ app_connections ==============================
CREATE POLICY "app_connections_all" ON app_connections
  FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- ============================ mcp_servers ==================================
CREATE POLICY "mcp_servers_all" ON mcp_servers
  FOR ALL
  USING (org_id IN (SELECT public.user_org_ids()))
  WITH CHECK (org_id IN (SELECT public.user_org_ids()));

-- ============================ mcp_tools ====================================
CREATE POLICY "mcp_tools_all" ON mcp_tools
  FOR ALL
  USING (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  )
  WITH CHECK (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  );

-- ============================ mcp_api_keys =================================
CREATE POLICY "mcp_api_keys_all" ON mcp_api_keys
  FOR ALL
  USING (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  )
  WITH CHECK (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  );

-- ============================ mcp_samples ==================================
CREATE POLICY "mcp_samples_all" ON mcp_samples
  FOR ALL
  USING (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  )
  WITH CHECK (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  );

-- ============================ mcp_access_logs (read only) ===================
CREATE POLICY "mcp_access_logs_select" ON mcp_access_logs
  FOR SELECT USING (
    mcp_server_id IN (SELECT id FROM mcp_servers WHERE org_id IN (SELECT public.user_org_ids()))
  );


-- ============================================================
-- supabase/migrations/005_optional_server_auth.sql
-- ============================================================
-- ============================================================================
-- Migration 005: Optional MCP server authentication
-- ----------------------------------------------------------------------------
-- Lets a server be marked public (no API key required to call it). Defaults to
-- true so existing servers keep requiring their key.
-- ============================================================================

ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS auth_required BOOLEAN NOT NULL DEFAULT TRUE;

-- ============================================================
-- supabase/migrations/006_more_catalog.sql
-- ============================================================
-- ============================================================================
-- Migration 006: Expanded connector catalog
-- ----------------------------------------------------------------------------
-- More built-in apps for the connection wizard. Tool sets live in
-- src/lib/connectors/catalog.ts; these rows carry metadata + auth config.
-- All use single-token auth so they work without an OAuth app setup.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, logo_url, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Notion', 'notion', 'Search, read pages and query databases in Notion.',
    'https://logo.clearbit.com/notion.so', 'https://api.notion.com', 'bearer', '{}',
    'https://developers.notion.com/reference',
    '{"static_headers":{"Notion-Version":"2022-06-28"},"auth_help":"Create an internal integration at https://www.notion.so/my-integrations and share pages with it. Use the Internal Integration Secret."}'::jsonb),

  ('Slack', 'slack', 'Channels, messages and users via the Slack Web API.',
    'https://logo.clearbit.com/slack.com', 'https://slack.com/api', 'bearer', '{}',
    'https://api.slack.com/web',
    '{"auth_help":"Create an app at https://api.slack.com/apps, add scopes, install it, and use the Bot User OAuth Token (xoxb-...)."}'::jsonb),

  ('Airtable', 'airtable', 'Read and write records in your Airtable bases.',
    'https://logo.clearbit.com/airtable.com', 'https://api.airtable.com/v0', 'bearer', '{}',
    'https://airtable.com/developers/web/api/introduction',
    '{"auth_help":"Create a Personal Access Token at https://airtable.com/create/tokens with the scopes you need."}'::jsonb),

  ('HubSpot', 'hubspot', 'CRM contacts, deals and more via HubSpot.',
    'https://logo.clearbit.com/hubspot.com', 'https://api.hubapi.com', 'bearer', '{}',
    'https://developers.hubspot.com/docs/api/overview',
    '{"auth_help":"Create a Private App in HubSpot settings and use its access token."}'::jsonb),

  ('GitLab', 'gitlab', 'Projects, issues and more via the GitLab API.',
    'https://logo.clearbit.com/gitlab.com', 'https://gitlab.com/api/v4', 'bearer', '{}',
    'https://docs.gitlab.com/ee/api/',
    '{"auth_help":"Create a Personal Access Token at https://gitlab.com/-/user_settings/personal_access_tokens (api scope)."}'::jsonb),

  ('SendGrid', 'sendgrid', 'Email templates and stats via SendGrid.',
    'https://logo.clearbit.com/sendgrid.com', 'https://api.sendgrid.com/v3', 'bearer', '{}',
    'https://docs.sendgrid.com/api-reference',
    '{"auth_help":"Create an API key in SendGrid settings."}'::jsonb),

  ('Resend', 'resend', 'Send transactional email via Resend.',
    'https://logo.clearbit.com/resend.com', 'https://api.resend.com', 'bearer', '{}',
    'https://resend.com/docs/api-reference',
    '{"auth_help":"Create an API key at https://resend.com/api-keys."}'::jsonb),

  ('NASA', 'nasa', 'Astronomy Picture of the Day and Near-Earth Objects.',
    'https://logo.clearbit.com/nasa.gov', 'https://api.nasa.gov', 'api_key', '{}',
    'https://api.nasa.gov/',
    '{"api_key_in":"query","api_key_name":"api_key","auth_help":"Get a free key at https://api.nasa.gov/ (or use DEMO_KEY)."}'::jsonb),

  ('TMDB', 'tmdb', 'Search movies and details via The Movie Database.',
    'https://logo.clearbit.com/themoviedb.org', 'https://api.themoviedb.org/3', 'bearer', '{}',
    'https://developer.themoviedb.org/reference/intro/getting-started',
    '{"auth_help":"Create an API Read Access Token (v4 auth) at https://www.themoviedb.org/settings/api."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- supabase/migrations/007_more_catalog.sql
-- ============================================================
-- ============================================================================
-- Migration 007: Even more catalog connectors
-- ----------------------------------------------------------------------------
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, logo_url, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Todoist', 'todoist', 'Tasks and projects via the Todoist REST API.',
    'https://logo.clearbit.com/todoist.com', 'https://api.todoist.com/rest/v2', 'bearer', '{}',
    'https://developer.todoist.com/rest/v2/',
    '{"auth_help":"Get your API token from Todoist → Settings → Integrations → Developer."}'::jsonb),

  ('Asana', 'asana', 'Workspaces, projects and tasks via Asana.',
    'https://logo.clearbit.com/asana.com', 'https://app.asana.com/api/1.0', 'bearer', '{}',
    'https://developers.asana.com/reference/rest-api-reference',
    '{"auth_help":"Create a Personal Access Token at https://app.asana.com/0/my-apps."}'::jsonb),

  ('Calendly', 'calendly', 'Scheduled events and users via Calendly.',
    'https://logo.clearbit.com/calendly.com', 'https://api.calendly.com', 'bearer', '{}',
    'https://developer.calendly.com/api-docs',
    '{"auth_help":"Create a Personal Access Token in Calendly → Integrations → API & Webhooks."}'::jsonb),

  ('Intercom', 'intercom', 'Contacts and conversations via Intercom.',
    'https://logo.clearbit.com/intercom.com', 'https://api.intercom.io', 'bearer', '{}',
    'https://developers.intercom.com/docs/references/rest-api/',
    '{"static_headers":{"Intercom-Version":"2.11"},"auth_help":"Create an access token in your Intercom Developer Hub app."}'::jsonb),

  ('DigitalOcean', 'digitalocean', 'Droplets, domains and account via DigitalOcean.',
    'https://logo.clearbit.com/digitalocean.com', 'https://api.digitalocean.com/v2', 'bearer', '{}',
    'https://docs.digitalocean.com/reference/api/',
    '{"auth_help":"Create a Personal Access Token at https://cloud.digitalocean.com/account/api/tokens."}'::jsonb),

  ('Cloudflare', 'cloudflare', 'Zones and account via the Cloudflare API.',
    'https://logo.clearbit.com/cloudflare.com', 'https://api.cloudflare.com/client/v4', 'bearer', '{}',
    'https://developers.cloudflare.com/api/',
    '{"auth_help":"Create an API Token at https://dash.cloudflare.com/profile/api-tokens."}'::jsonb),

  ('OpenAI', 'openai', 'List and inspect OpenAI models.',
    'https://logo.clearbit.com/openai.com', 'https://api.openai.com/v1', 'bearer', '{}',
    'https://platform.openai.com/docs/api-reference',
    '{"auth_help":"Create an API key at https://platform.openai.com/api-keys."}'::jsonb),

  ('Anthropic', 'anthropic', 'List Claude models via the Anthropic API.',
    'https://logo.clearbit.com/anthropic.com', 'https://api.anthropic.com', 'api_key', '{}',
    'https://docs.anthropic.com/en/api',
    '{"api_key_in":"header","api_key_name":"x-api-key","static_headers":{"anthropic-version":"2023-06-01"},"auth_help":"Create an API key at https://console.anthropic.com/settings/keys."}'::jsonb),

  ('Twilio', 'twilio', 'Send and list SMS via Twilio (Basic auth).',
    'https://logo.clearbit.com/twilio.com', 'https://api.twilio.com', 'basic', '{}',
    'https://www.twilio.com/docs/usage/api',
    '{"auth_help":"Username = Account SID, Password = Auth Token (from the Twilio console)."}'::jsonb),

  ('Brave Search', 'brave', 'Web search via the Brave Search API.',
    'https://logo.clearbit.com/brave.com', 'https://api.search.brave.com', 'api_key', '{}',
    'https://brave.com/search/api/',
    '{"api_key_in":"header","api_key_name":"X-Subscription-Token","auth_help":"Get a key at https://api.search.brave.com/app/keys."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- supabase/migrations/008_more_catalog.sql
-- ============================================================
-- ============================================================================
-- Migration 008: More catalog connectors (developer + media + search APIs)
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Vercel', 'vercel', 'Projects, deployments and user via the Vercel API.',
    'https://api.vercel.com', 'bearer', '{}', 'https://vercel.com/docs/rest-api',
    '{"auth_help":"Create a token at https://vercel.com/account/tokens."}'::jsonb),

  ('Linear', 'linear', 'Issues, projects and more via the Linear GraphQL API.',
    'https://api.linear.app', 'custom', '{}', 'https://developers.linear.app/docs',
    '{"header_name":"Authorization","auth_help":"Create a personal API key at https://linear.app/settings/api and paste it as the header value (no Bearer prefix)."}'::jsonb),

  ('Figma', 'figma', 'Files and user info via the Figma API.',
    'https://api.figma.com', 'custom', '{}', 'https://www.figma.com/developers/api',
    '{"header_name":"X-Figma-Token","auth_help":"Create a personal access token in Figma → Settings → Account → Personal access tokens."}'::jsonb),

  ('Unsplash', 'unsplash', 'Search and fetch free photos via Unsplash.',
    'https://api.unsplash.com', 'custom', '{}', 'https://unsplash.com/documentation',
    '{"header_name":"Authorization","auth_help":"Register an app at https://unsplash.com/oauth/applications and paste the value as: Client-ID YOUR_ACCESS_KEY"}'::jsonb),

  ('GIPHY', 'giphy', 'Search and trending GIFs via GIPHY.',
    'https://api.giphy.com', 'api_key', '{}', 'https://developers.giphy.com/docs/api',
    '{"api_key_in":"query","api_key_name":"api_key","auth_help":"Create an API key at https://developers.giphy.com/dashboard/."}'::jsonb),

  ('Discord', 'discord', 'Bot user and guilds via the Discord API.',
    'https://discord.com/api/v10', 'custom', '{}', 'https://discord.com/developers/docs/intro',
    '{"header_name":"Authorization","auth_help":"Create a bot at https://discord.com/developers/applications and paste the value as: Bot YOUR_BOT_TOKEN"}'::jsonb),

  ('NewsAPI', 'newsapi', 'Headlines and article search via NewsAPI.org.',
    'https://newsapi.org/v2', 'api_key', '{}', 'https://newsapi.org/docs',
    '{"api_key_in":"header","api_key_name":"X-Api-Key","auth_help":"Get a free key at https://newsapi.org/register."}'::jsonb),

  ('Pexels', 'pexels', 'Search free stock photos via Pexels.',
    'https://api.pexels.com', 'custom', '{}', 'https://www.pexels.com/api/documentation/',
    '{"header_name":"Authorization","auth_help":"Get an API key at https://www.pexels.com/api/ and paste it as the header value."}'::jsonb),

  ('Supabase', 'supabase', 'List your Supabase projects and organizations.',
    'https://api.supabase.com', 'bearer', '{}', 'https://supabase.com/docs/reference/api',
    '{"auth_help":"Create a Management API token at https://supabase.com/dashboard/account/tokens."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- supabase/migrations/009_aggregate_servers.sql
-- ============================================================
-- ============================================================================
-- Migration 009: Aggregate MCP servers (one server across all connections)
-- ----------------------------------------------------------------------------
-- A server can be 'single' (one connection, the default) or 'aggregate'
-- (tools drawn from every connection in the org). For aggregate servers each
-- mcp_tools row carries its own app_connection_id so the runtime knows which
-- connection to proxy each (namespaced) tool to.
-- ============================================================================

ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'single'; -- single | aggregate

-- Aggregate servers aren't tied to a single connection.
ALTER TABLE mcp_servers
  ALTER COLUMN app_connection_id DROP NOT NULL;

-- Per-tool connection (overrides the server's connection; required for aggregate).
ALTER TABLE mcp_tools
  ADD COLUMN IF NOT EXISTS app_connection_id UUID REFERENCES app_connections(id) ON DELETE CASCADE;

-- ============================================================
-- supabase/migrations/010_server_oauth.sql
-- ============================================================
-- ============================================================================
-- Migration 010: MCP server OAuth (client-credentials) access mode
-- ----------------------------------------------------------------------------
-- A server's inbound auth can now be: none | api_key | oauth. In oauth mode
-- mcpify issues a client_id + client_secret; external systems exchange them at
-- the server's /token endpoint for a bearer token used to call the server.
-- ============================================================================

ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS auth_mode TEXT NOT NULL DEFAULT 'api_key', -- none | api_key | oauth
  ADD COLUMN IF NOT EXISTS oauth_client_id TEXT,
  ADD COLUMN IF NOT EXISTS oauth_client_secret TEXT;

-- Backfill auth_mode from the older auth_required boolean.
UPDATE mcp_servers SET auth_mode = 'none' WHERE auth_required = FALSE AND auth_mode = 'api_key';

-- ============================================================
-- supabase/migrations/011_more_catalog.sql
-- ============================================================
-- ============================================================================
-- Migration 011: More catalog connectors (productivity + dev tools)
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Dropbox', 'dropbox', 'Files and account via the Dropbox API.',
    'https://api.dropboxapi.com/2', 'bearer', '{}', 'https://www.dropbox.com/developers/documentation/http/documentation',
    '{"auth_help":"Create an app at https://www.dropbox.com/developers/apps and generate an access token."}'::jsonb),

  ('ClickUp', 'clickup', 'Tasks, lists and teams via ClickUp.',
    'https://api.clickup.com/api/v2', 'custom', '{}', 'https://clickup.com/api',
    '{"header_name":"Authorization","auth_help":"Get a personal token in ClickUp → Settings → Apps. Paste it as the header value (no Bearer prefix)."}'::jsonb),

  ('monday.com', 'monday', 'Boards and items via the monday.com GraphQL API.',
    'https://api.monday.com/v2', 'custom', '{}', 'https://developer.monday.com/api-reference/docs',
    '{"header_name":"Authorization","auth_help":"Get an API token in monday.com → avatar → Developers → My access tokens."}'::jsonb),

  ('Webflow', 'webflow', 'Sites and CMS collections via Webflow.',
    'https://api.webflow.com/v2', 'bearer', '{}', 'https://developers.webflow.com/data/reference',
    '{"auth_help":"Create an API token in Webflow → Site settings → Apps & integrations → API access."}'::jsonb),

  ('Pipedrive', 'pipedrive', 'Deals and contacts via Pipedrive CRM.',
    'https://api.pipedrive.com/v1', 'api_key', '{}', 'https://developers.pipedrive.com/docs/api/v1',
    '{"api_key_in":"query","api_key_name":"api_token","auth_help":"Find your API token in Pipedrive → Settings → Personal preferences → API."}'::jsonb),

  ('Sentry', 'sentry', 'Projects and issues via the Sentry API.',
    'https://sentry.io/api/0', 'bearer', '{}', 'https://docs.sentry.io/api/',
    '{"auth_help":"Create an auth token at https://sentry.io/settings/account/api/auth-tokens/."}'::jsonb),

  ('PostHog', 'posthog', 'Projects and insights via PostHog.',
    'https://us.posthog.com', 'bearer', '{}', 'https://posthog.com/docs/api',
    '{"auth_help":"Create a Personal API key in PostHog → Settings → Personal API keys. (EU users: change base URL to https://eu.posthog.com)"}'::jsonb),

  ('Mapbox', 'mapbox', 'Geocoding and maps via Mapbox.',
    'https://api.mapbox.com', 'api_key', '{}', 'https://docs.mapbox.com/api/',
    '{"api_key_in":"query","api_key_name":"access_token","auth_help":"Use your default public token or create one at https://account.mapbox.com/access-tokens/."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- supabase/migrations/012_more_catalog.sql
-- ============================================================
-- ============================================================================
-- Migration 012: No-auth utility APIs + a few keyed apps; Todoist base fix
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

-- Todoist deprecated /rest/v2 (returns 410). Move to the unified /api/v1.
UPDATE app_definitions SET base_url = 'https://api.todoist.com/api/v1' WHERE slug = 'todoist';

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('CoinGecko', 'coingecko', 'Crypto prices and market data (no key needed).',
    'https://api.coingecko.com/api/v3', 'none', '{}', 'https://docs.coingecko.com/reference/introduction',
    '{"auth_help":"No credentials required for the free public API."}'::jsonb),

  ('Open-Meteo', 'openmeteo', 'Free weather forecasts (no key needed).',
    'https://api.open-meteo.com/v1', 'none', '{}', 'https://open-meteo.com/en/docs',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('REST Countries', 'restcountries', 'Country data (no key needed).',
    'https://restcountries.com/v3.1', 'none', '{}', 'https://restcountries.com/',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('Frankfurter', 'frankfurter', 'Foreign-exchange rates (no key needed).',
    'https://api.frankfurter.dev/v1', 'none', '{}', 'https://frankfurter.dev/',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('Hacker News', 'hackernews', 'Top stories and items (no key needed).',
    'https://hacker-news.firebaseio.com/v0', 'none', '{}', 'https://github.com/HackerNews/API',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('IPinfo', 'ipinfo', 'IP geolocation lookups.',
    'https://ipinfo.io', 'bearer', '{}', 'https://ipinfo.io/developers',
    '{"auth_help":"Optional — works without a token on the free tier. Get a token at https://ipinfo.io/account/token for higher limits."}'::jsonb),

  ('Shortcut', 'shortcut', 'Stories, projects and members via Shortcut.',
    'https://api.app.shortcut.com/api/v3', 'custom', '{}', 'https://developer.shortcut.com/api/rest/v3',
    '{"header_name":"Shortcut-Token","auth_help":"Create an API token in Shortcut → Settings → API Tokens."}'::jsonb),

  ('Bitbucket', 'bitbucket', 'Repos and workspaces via Bitbucket Cloud.',
    'https://api.bitbucket.org/2.0', 'bearer', '{}', 'https://developer.atlassian.com/cloud/bitbucket/rest/intro/',
    '{"auth_help":"Create a repository/workspace access token or an app password (use as a Bearer token)."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- supabase/migrations/013_log_payloads.sql
-- ============================================================
-- ============================================================================
-- Migration 013: Capture request/response payloads for the call inspector
-- ----------------------------------------------------------------------------
-- Stores tool-call arguments and a (truncated) upstream response so the
-- monitoring view can show what was sent and returned for each call.
-- ============================================================================

ALTER TABLE mcp_access_logs
  ADD COLUMN IF NOT EXISTS request_body JSONB,
  ADD COLUMN IF NOT EXISTS response_body TEXT;
