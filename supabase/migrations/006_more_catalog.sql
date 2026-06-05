-- ============================================================================
-- Migration 006: Expanded connector catalog
-- ----------------------------------------------------------------------------
-- More built-in apps for the connection wizard. Tool sets live in
-- src/lib/connectors/catalog.ts; these rows carry metadata + auth config.
-- All use single-token auth so they work without an OAuth app setup.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, logo_url, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Notion', 'notion', 'Search, read pages and query databases in Notion.',
    'https://logo.clearbit.com/notion.so', 'https://api.notion.com', 'bearer', '{}',
    'https://developers.notion.com/reference',
    '{"static_headers":{"Notion-Version":"2022-06-28"},"auth_help":"Create an internal integration at https://www.notion.so/my-integrations and share pages with it. Use the Internal Integration Secret."}'::jsonb),

  ('Slack', 'slack', 'Channels, messages and users via the Slack Web API.',
    'https://logo.clearbit.com/slack.com', 'https://slack.com/api', 'bearer', '{}',
    'https://api.slack.com/web',
    '{"auth_help":"Create an app at https://api.slack.com/apps, add scopes, install it, and use the Bot User OAuth Token (xoxb-...)."}'::jsonb),

  ('Airtable', 'airtable', 'Read and write records in your Airtable bases.',
    'https://logo.clearbit.com/airtable.com', 'https://api.airtable.com/v0', 'bearer', '{}',
    'https://airtable.com/developers/web/api/introduction',
    '{"auth_help":"Create a Personal Access Token at https://airtable.com/create/tokens with the scopes you need."}'::jsonb),

  ('HubSpot', 'hubspot', 'CRM contacts, deals and more via HubSpot.',
    'https://logo.clearbit.com/hubspot.com', 'https://api.hubapi.com', 'bearer', '{}',
    'https://developers.hubspot.com/docs/api/overview',
    '{"auth_help":"Create a Private App in HubSpot settings and use its access token."}'::jsonb),

  ('GitLab', 'gitlab', 'Projects, issues and more via the GitLab API.',
    'https://logo.clearbit.com/gitlab.com', 'https://gitlab.com/api/v4', 'bearer', '{}',
    'https://docs.gitlab.com/ee/api/',
    '{"auth_help":"Create a Personal Access Token at https://gitlab.com/-/user_settings/personal_access_tokens (api scope)."}'::jsonb),

  ('SendGrid', 'sendgrid', 'Email templates and stats via SendGrid.',
    'https://logo.clearbit.com/sendgrid.com', 'https://api.sendgrid.com/v3', 'bearer', '{}',
    'https://docs.sendgrid.com/api-reference',
    '{"auth_help":"Create an API key in SendGrid settings."}'::jsonb),

  ('Resend', 'resend', 'Send transactional email via Resend.',
    'https://logo.clearbit.com/resend.com', 'https://api.resend.com', 'bearer', '{}',
    'https://resend.com/docs/api-reference',
    '{"auth_help":"Create an API key at https://resend.com/api-keys."}'::jsonb),

  ('NASA', 'nasa', 'Astronomy Picture of the Day and Near-Earth Objects.',
    'https://logo.clearbit.com/nasa.gov', 'https://api.nasa.gov', 'api_key', '{}',
    'https://api.nasa.gov/',
    '{"api_key_in":"query","api_key_name":"api_key","auth_help":"Get a free key at https://api.nasa.gov/ (or use DEMO_KEY)."}'::jsonb),

  ('TMDB', 'tmdb', 'Search movies and details via The Movie Database.',
    'https://logo.clearbit.com/themoviedb.org', 'https://api.themoviedb.org/3', 'bearer', '{}',
    'https://developer.themoviedb.org/reference/intro/getting-started',
    '{"auth_help":"Create an API Read Access Token (v4 auth) at https://www.themoviedb.org/settings/api."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
