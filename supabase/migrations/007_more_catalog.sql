-- ============================================================================
-- Migration 007: Even more catalog connectors
-- ----------------------------------------------------------------------------
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, logo_url, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Todoist', 'todoist', 'Tasks and projects via the Todoist REST API.',
    'https://logo.clearbit.com/todoist.com', 'https://api.todoist.com/rest/v2', 'bearer', '{}',
    'https://developer.todoist.com/rest/v2/',
    '{"auth_help":"Get your API token from Todoist → Settings → Integrations → Developer."}'::jsonb),

  ('Asana', 'asana', 'Workspaces, projects and tasks via Asana.',
    'https://logo.clearbit.com/asana.com', 'https://app.asana.com/api/1.0', 'bearer', '{}',
    'https://developers.asana.com/reference/rest-api-reference',
    '{"auth_help":"Create a Personal Access Token at https://app.asana.com/0/my-apps."}'::jsonb),

  ('Calendly', 'calendly', 'Scheduled events and users via Calendly.',
    'https://logo.clearbit.com/calendly.com', 'https://api.calendly.com', 'bearer', '{}',
    'https://developer.calendly.com/api-docs',
    '{"auth_help":"Create a Personal Access Token in Calendly → Integrations → API & Webhooks."}'::jsonb),

  ('Intercom', 'intercom', 'Contacts and conversations via Intercom.',
    'https://logo.clearbit.com/intercom.com', 'https://api.intercom.io', 'bearer', '{}',
    'https://developers.intercom.com/docs/references/rest-api/',
    '{"static_headers":{"Intercom-Version":"2.11"},"auth_help":"Create an access token in your Intercom Developer Hub app."}'::jsonb),

  ('DigitalOcean', 'digitalocean', 'Droplets, domains and account via DigitalOcean.',
    'https://logo.clearbit.com/digitalocean.com', 'https://api.digitalocean.com/v2', 'bearer', '{}',
    'https://docs.digitalocean.com/reference/api/',
    '{"auth_help":"Create a Personal Access Token at https://cloud.digitalocean.com/account/api/tokens."}'::jsonb),

  ('Cloudflare', 'cloudflare', 'Zones and account via the Cloudflare API.',
    'https://logo.clearbit.com/cloudflare.com', 'https://api.cloudflare.com/client/v4', 'bearer', '{}',
    'https://developers.cloudflare.com/api/',
    '{"auth_help":"Create an API Token at https://dash.cloudflare.com/profile/api-tokens."}'::jsonb),

  ('OpenAI', 'openai', 'List and inspect OpenAI models.',
    'https://logo.clearbit.com/openai.com', 'https://api.openai.com/v1', 'bearer', '{}',
    'https://platform.openai.com/docs/api-reference',
    '{"auth_help":"Create an API key at https://platform.openai.com/api-keys."}'::jsonb),

  ('Anthropic', 'anthropic', 'List Claude models via the Anthropic API.',
    'https://logo.clearbit.com/anthropic.com', 'https://api.anthropic.com', 'api_key', '{}',
    'https://docs.anthropic.com/en/api',
    '{"api_key_in":"header","api_key_name":"x-api-key","static_headers":{"anthropic-version":"2023-06-01"},"auth_help":"Create an API key at https://console.anthropic.com/settings/keys."}'::jsonb),

  ('Twilio', 'twilio', 'Send and list SMS via Twilio (Basic auth).',
    'https://logo.clearbit.com/twilio.com', 'https://api.twilio.com', 'basic', '{}',
    'https://www.twilio.com/docs/usage/api',
    '{"auth_help":"Username = Account SID, Password = Auth Token (from the Twilio console)."}'::jsonb),

  ('Brave Search', 'brave', 'Web search via the Brave Search API.',
    'https://logo.clearbit.com/brave.com', 'https://api.search.brave.com', 'api_key', '{}',
    'https://brave.com/search/api/',
    '{"api_key_in":"header","api_key_name":"X-Subscription-Token","auth_help":"Get a key at https://api.search.brave.com/app/keys."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
