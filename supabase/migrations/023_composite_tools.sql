-- Composite tools: a tool whose execution is a sequence of other tool calls.
-- When composite_steps is non-null the runtime runs the steps instead of a
-- single upstream HTTP request.
ALTER TABLE mcp_tools
  ADD COLUMN IF NOT EXISTS composite_steps JSONB;
