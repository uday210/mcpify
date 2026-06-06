-- ============================================================================
-- Migration 017: SaaS connectors
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Spotify', 'spotify', 'Music search, profile and playlists.', 'https://api.spotify.com/v1', 'oauth', '{}',
    'https://developer.spotify.com/documentation/web-api',
    '{"oauth":{"authorize_url":"https://accounts.spotify.com/authorize","token_url":"https://accounts.spotify.com/api/token","scopes":["user-read-private","user-read-email","playlist-read-private"]},"auth_help":"Create an app at https://developer.spotify.com/dashboard; redirect URI {APP_URL}/api/oauth/callback."}'::jsonb),
  ('Typeform', 'typeform', 'Forms and responses via Typeform.', 'https://api.typeform.com', 'bearer', '{}',
    'https://www.typeform.com/developers/', '{"auth_help":"Personal Access Token at https://admin.typeform.com/account#/section/tokens."}'::jsonb),
  ('Coda', 'coda', 'Docs and tables via Coda.', 'https://coda.io/apis/v1', 'bearer', '{}',
    'https://coda.io/developers/apis/v1', '{"auth_help":"Create an API token at https://coda.io/account."}'::jsonb),
  ('Contentful', 'contentful', 'Spaces and entries via Contentful CMA.', 'https://api.contentful.com', 'bearer', '{}',
    'https://www.contentful.com/developers/docs/references/content-management-api/', '{"auth_help":"Create a Content Management API token in Contentful settings."}'::jsonb),
  ('Storyblok', 'storyblok', 'Headless CMS content via Storyblok.', 'https://api.storyblok.com/v2/cdn', 'api_key', '{}',
    'https://www.storyblok.com/docs/api/content-delivery/v2', '{"api_key_in":"query","api_key_name":"token","auth_help":"Use your space Content Delivery API token."}'::jsonb),
  ('Help Scout', 'helpscout', 'Mailboxes and conversations via Help Scout.', 'https://api.helpscout.net/v2', 'oauth2_cc', '{}',
    'https://developer.helpscout.com/mailbox-api/', '{"oauth":{"token_url":"https://api.helpscout.net/v2/oauth2/token"},"auth_help":"Create an OAuth2 app for App ID (client_id) + App Secret (client_secret)."}'::jsonb),
  ('PagerDuty', 'pagerduty', 'Incidents and services via PagerDuty.', 'https://api.pagerduty.com', 'custom', '{}',
    'https://developer.pagerduty.com/api-reference/', '{"header_name":"Authorization","static_headers":{"Accept":"application/vnd.pagerduty+json;version=2"},"auth_help":"Paste your key as: Token token=YOUR_KEY"}'::jsonb),
  ('Opsgenie', 'opsgenie', 'Alerts via Opsgenie.', 'https://api.opsgenie.com', 'custom', '{}',
    'https://docs.opsgenie.com/docs/api-overview', '{"header_name":"Authorization","auth_help":"Paste your key as: GenieKey YOUR_KEY"}'::jsonb),
  ('Render', 'render', 'Services and deploys via Render.', 'https://api.render.com/v1', 'bearer', '{}',
    'https://api-docs.render.com/reference/introduction', '{"auth_help":"Create an API key at https://dashboard.render.com/u/settings#api-keys."}'::jsonb),
  ('Lemon Squeezy', 'lemonsqueezy', 'Products and orders via Lemon Squeezy.', 'https://api.lemonsqueezy.com/v1', 'bearer', '{}',
    'https://docs.lemonsqueezy.com/api', '{"static_headers":{"Accept":"application/vnd.api+json","Content-Type":"application/vnd.api+json"},"auth_help":"Create an API key at https://app.lemonsqueezy.com/settings/api."}'::jsonb),
  ('Plausible', 'plausible', 'Privacy-friendly web analytics.', 'https://plausible.io/api', 'bearer', '{}',
    'https://plausible.io/docs/stats-api', '{"auth_help":"Create an API key in Plausible > Settings > API Keys."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
