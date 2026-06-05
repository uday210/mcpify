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
