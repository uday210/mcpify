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
