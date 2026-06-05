-- ============================================================================
-- Migration 011: More catalog connectors (productivity + dev tools)
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Dropbox', 'dropbox', 'Files and account via the Dropbox API.',
    'https://api.dropboxapi.com/2', 'bearer', '{}', 'https://www.dropbox.com/developers/documentation/http/documentation',
    '{"auth_help":"Create an app at https://www.dropbox.com/developers/apps and generate an access token."}'::jsonb),

  ('ClickUp', 'clickup', 'Tasks, lists and teams via ClickUp.',
    'https://api.clickup.com/api/v2', 'custom', '{}', 'https://clickup.com/api',
    '{"header_name":"Authorization","auth_help":"Get a personal token in ClickUp → Settings → Apps. Paste it as the header value (no Bearer prefix)."}'::jsonb),

  ('monday.com', 'monday', 'Boards and items via the monday.com GraphQL API.',
    'https://api.monday.com/v2', 'custom', '{}', 'https://developer.monday.com/api-reference/docs',
    '{"header_name":"Authorization","auth_help":"Get an API token in monday.com → avatar → Developers → My access tokens."}'::jsonb),

  ('Webflow', 'webflow', 'Sites and CMS collections via Webflow.',
    'https://api.webflow.com/v2', 'bearer', '{}', 'https://developers.webflow.com/data/reference',
    '{"auth_help":"Create an API token in Webflow → Site settings → Apps & integrations → API access."}'::jsonb),

  ('Pipedrive', 'pipedrive', 'Deals and contacts via Pipedrive CRM.',
    'https://api.pipedrive.com/v1', 'api_key', '{}', 'https://developers.pipedrive.com/docs/api/v1',
    '{"api_key_in":"query","api_key_name":"api_token","auth_help":"Find your API token in Pipedrive → Settings → Personal preferences → API."}'::jsonb),

  ('Sentry', 'sentry', 'Projects and issues via the Sentry API.',
    'https://sentry.io/api/0', 'bearer', '{}', 'https://docs.sentry.io/api/',
    '{"auth_help":"Create an auth token at https://sentry.io/settings/account/api/auth-tokens/."}'::jsonb),

  ('PostHog', 'posthog', 'Projects and insights via PostHog.',
    'https://us.posthog.com', 'bearer', '{}', 'https://posthog.com/docs/api',
    '{"auth_help":"Create a Personal API key in PostHog → Settings → Personal API keys. (EU users: change base URL to https://eu.posthog.com)"}'::jsonb),

  ('Mapbox', 'mapbox', 'Geocoding and maps via Mapbox.',
    'https://api.mapbox.com', 'api_key', '{}', 'https://docs.mapbox.com/api/',
    '{"api_key_in":"query","api_key_name":"access_token","auth_help":"Use your default public token or create one at https://account.mapbox.com/access-tokens/."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
