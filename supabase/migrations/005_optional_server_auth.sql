-- ============================================================================
-- Migration 005: Optional MCP server authentication
-- ----------------------------------------------------------------------------
-- Lets a server be marked public (no API key required to call it). Defaults to
-- true so existing servers keep requiring their key.
-- ============================================================================

ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS auth_required BOOLEAN NOT NULL DEFAULT TRUE;
