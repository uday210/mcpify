-- First-class REST output: a server can be exposed over MCP, over a plain REST
-- API (the /api/rest/:slug facade + OpenAPI schema), or both. `interfaces`
-- records which surfaces are enabled. Existing servers default to both so the
-- REST facade that already worked for every server keeps working.
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS interfaces TEXT[] NOT NULL DEFAULT ARRAY['mcp','rest']::text[];
