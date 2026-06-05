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
