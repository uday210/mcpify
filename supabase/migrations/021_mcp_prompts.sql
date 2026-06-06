-- Custom, user-authored prompt templates exposed by an MCP server.

CREATE TABLE IF NOT EXISTS mcp_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- [{ name, description?, required? }]
  arguments JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- prompt body with {{argument}} placeholders
  template TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mcp_server_id, name)
);

CREATE INDEX IF NOT EXISTS idx_mcp_prompts_server ON mcp_prompts(mcp_server_id);

-- Locked down: only the service role (used after an ownership check) touches it.
ALTER TABLE mcp_prompts ENABLE ROW LEVEL SECURITY;
