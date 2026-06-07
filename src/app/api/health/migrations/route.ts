import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * GET /api/health/migrations — probes optional columns/tables added by later
 * migrations and reports which are missing, so the dashboard can prompt the
 * user to run them. Each probe is a cheap select that fails if the schema
 * object doesn't exist yet.
 */
export async function GET() {
	const supabase = await createServerSupabaseClient();
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

	const admin = createAdminClient();
	const probe = async (table: string, column: string) => {
		const { error } = await admin.from(table).select(column).limit(1);
		return !error;
	};

	const checks = await Promise.all([
		probe('mcp_servers', 'rate_limit_per_min'),
		probe('organizations', 'notification_config'),
		probe('mcp_prompts', 'id'),
		probe('mcp_tools', 'requires_approval'),
		probe('mcp_approvals', 'id'),
		probe('mcp_tools', 'composite_steps'),
	]);

	const features = [
		{ id: '020', label: 'Rate limits & error alerts', ok: checks[0] && checks[1] },
		{ id: '021', label: 'Custom prompts', ok: checks[2] },
		{ id: '022', label: 'Approvals (human-in-the-loop)', ok: checks[3] && checks[4] },
		{ id: '023', label: 'Composite tools', ok: checks[5] },
	];
	const missing = features.filter((f) => !f.ok);

	return NextResponse.json({
		applied: missing.length === 0,
		missing,
		sql: missing.length ? BUNDLED_SQL : '',
	});
}

const BUNDLED_SQL = `-- mcpify pending migrations (020–023). Safe to run as a single block.

-- 020: rate limits + notifications
ALTER TABLE mcp_servers ADD COLUMN IF NOT EXISTS rate_limit_per_min INTEGER;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_config JSONB DEFAULT '{}'::jsonb;

-- 021: custom prompts
CREATE TABLE IF NOT EXISTS mcp_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  arguments JSONB NOT NULL DEFAULT '[]'::jsonb,
  template TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(mcp_server_id, name)
);
CREATE INDEX IF NOT EXISTS idx_mcp_prompts_server ON mcp_prompts(mcp_server_id);
ALTER TABLE mcp_prompts ENABLE ROW LEVEL SECURITY;

-- 022: approvals (human-in-the-loop)
ALTER TABLE mcp_tools ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN NOT NULL DEFAULT FALSE;
CREATE TABLE IF NOT EXISTS mcp_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mcp_server_id UUID REFERENCES mcp_servers(id) ON DELETE CASCADE NOT NULL,
  tool_name TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  client_ip TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_mcp_approvals_pending ON mcp_approvals(mcp_server_id, status);
ALTER TABLE mcp_approvals ENABLE ROW LEVEL SECURITY;

-- 023: composite tools
ALTER TABLE mcp_tools ADD COLUMN IF NOT EXISTS composite_steps JSONB;`;
