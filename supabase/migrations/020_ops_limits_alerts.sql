-- Ops: per-server rate limiting + org-level error-alert notifications.

-- Calls/min ceiling enforced in the MCP runtime. NULL or 0 = unlimited.
ALTER TABLE mcp_servers
  ADD COLUMN IF NOT EXISTS rate_limit_per_min INTEGER;

-- Org notification settings, e.g. {"alert_on_error": true, "webhook_url": "https://..."}.
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}'::jsonb;
