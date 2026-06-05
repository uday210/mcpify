-- ============================================================================
-- Migration 012: No-auth utility APIs + a few keyed apps; Todoist base fix
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

-- Todoist deprecated /rest/v2 (returns 410). Move to the unified /api/v1.
UPDATE app_definitions SET base_url = 'https://api.todoist.com/api/v1' WHERE slug = 'todoist';

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('CoinGecko', 'coingecko', 'Crypto prices and market data (no key needed).',
    'https://api.coingecko.com/api/v3', 'none', '{}', 'https://docs.coingecko.com/reference/introduction',
    '{"auth_help":"No credentials required for the free public API."}'::jsonb),

  ('Open-Meteo', 'openmeteo', 'Free weather forecasts (no key needed).',
    'https://api.open-meteo.com/v1', 'none', '{}', 'https://open-meteo.com/en/docs',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('REST Countries', 'restcountries', 'Country data (no key needed).',
    'https://restcountries.com/v3.1', 'none', '{}', 'https://restcountries.com/',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('Frankfurter', 'frankfurter', 'Foreign-exchange rates (no key needed).',
    'https://api.frankfurter.dev/v1', 'none', '{}', 'https://frankfurter.dev/',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('Hacker News', 'hackernews', 'Top stories and items (no key needed).',
    'https://hacker-news.firebaseio.com/v0', 'none', '{}', 'https://github.com/HackerNews/API',
    '{"auth_help":"No credentials required."}'::jsonb),

  ('IPinfo', 'ipinfo', 'IP geolocation lookups.',
    'https://ipinfo.io', 'bearer', '{}', 'https://ipinfo.io/developers',
    '{"auth_help":"Optional — works without a token on the free tier. Get a token at https://ipinfo.io/account/token for higher limits."}'::jsonb),

  ('Shortcut', 'shortcut', 'Stories, projects and members via Shortcut.',
    'https://api.app.shortcut.com/api/v3', 'custom', '{}', 'https://developer.shortcut.com/api/rest/v3',
    '{"header_name":"Shortcut-Token","auth_help":"Create an API token in Shortcut → Settings → API Tokens."}'::jsonb),

  ('Bitbucket', 'bitbucket', 'Repos and workspaces via Bitbucket Cloud.',
    'https://api.bitbucket.org/2.0', 'bearer', '{}', 'https://developer.atlassian.com/cloud/bitbucket/rest/intro/',
    '{"auth_help":"Create a repository/workspace access token or an app password (use as a Bearer token)."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
