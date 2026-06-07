-- Human-in-the-loop approval for sensitive tools.

-- Per-tool flag: calls to this tool pause for dashboard approval.
ALTER TABLE mcp_tools
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;

-- Pending/decided approval requests created by the runtime.
CREATE TABLE IF NOT EXISTS mcp_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | denied
  client_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_mcp_approvals_pending ON mcp_approvals(mcp_server_id, status);

ALTER TABLE mcp_approvals ENABLE ROW LEVEL SECURITY;
