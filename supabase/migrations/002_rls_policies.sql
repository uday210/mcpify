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
