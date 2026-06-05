-- ============================================================================
-- Migration 008: More catalog connectors (developer + media + search APIs)
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Vercel', 'vercel', 'Projects, deployments and user via the Vercel API.',
    'https://api.vercel.com', 'bearer', '{}', 'https://vercel.com/docs/rest-api',
    '{"auth_help":"Create a token at https://vercel.com/account/tokens."}'::jsonb),

  ('Linear', 'linear', 'Issues, projects and more via the Linear GraphQL API.',
    'https://api.linear.app', 'custom', '{}', 'https://developers.linear.app/docs',
    '{"header_name":"Authorization","auth_help":"Create a personal API key at https://linear.app/settings/api and paste it as the header value (no Bearer prefix)."}'::jsonb),

  ('Figma', 'figma', 'Files and user info via the Figma API.',
    'https://api.figma.com', 'custom', '{}', 'https://www.figma.com/developers/api',
    '{"header_name":"X-Figma-Token","auth_help":"Create a personal access token in Figma → Settings → Account → Personal access tokens."}'::jsonb),

  ('Unsplash', 'unsplash', 'Search and fetch free photos via Unsplash.',
    'https://api.unsplash.com', 'custom', '{}', 'https://unsplash.com/documentation',
    '{"header_name":"Authorization","auth_help":"Register an app at https://unsplash.com/oauth/applications and paste the value as: Client-ID YOUR_ACCESS_KEY"}'::jsonb),

  ('GIPHY', 'giphy', 'Search and trending GIFs via GIPHY.',
    'https://api.giphy.com', 'api_key', '{}', 'https://developers.giphy.com/docs/api',
    '{"api_key_in":"query","api_key_name":"api_key","auth_help":"Create an API key at https://developers.giphy.com/dashboard/."}'::jsonb),

  ('Discord', 'discord', 'Bot user and guilds via the Discord API.',
    'https://discord.com/api/v10', 'custom', '{}', 'https://discord.com/developers/docs/intro',
    '{"header_name":"Authorization","auth_help":"Create a bot at https://discord.com/developers/applications and paste the value as: Bot YOUR_BOT_TOKEN"}'::jsonb),

  ('NewsAPI', 'newsapi', 'Headlines and article search via NewsAPI.org.',
    'https://newsapi.org/v2', 'api_key', '{}', 'https://newsapi.org/docs',
    '{"api_key_in":"header","api_key_name":"X-Api-Key","auth_help":"Get a free key at https://newsapi.org/register."}'::jsonb),

  ('Pexels', 'pexels', 'Search free stock photos via Pexels.',
    'https://api.pexels.com', 'custom', '{}', 'https://www.pexels.com/api/documentation/',
    '{"header_name":"Authorization","auth_help":"Get an API key at https://www.pexels.com/api/ and paste it as the header value."}'::jsonb),

  ('Supabase', 'supabase', 'List your Supabase projects and organizations.',
    'https://api.supabase.com', 'bearer', '{}', 'https://supabase.com/docs/reference/api',
    '{"auth_help":"Create a Management API token at https://supabase.com/dashboard/account/tokens."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
