-- ============================================================================
-- Migration 019: Productivity / dev / marketing / billing connectors
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Clockify', 'clockify', 'Time tracking: workspaces and user.', 'https://api.clockify.me/api/v1', 'api_key', '{}', 'https://docs.clockify.me/', '{"api_key_in": "header", "api_key_name": "X-Api-Key", "auth_help": "Get your API key in Clockify > Preferences > Advanced."}'::jsonb),
  ('Miro', 'miro', 'Boards via the Miro REST API.', 'https://api.miro.com/v2', 'bearer', '{}', 'https://developers.miro.com/reference', '{"auth_help": "Create an access token at https://developers.miro.com."}'::jsonb),
  ('Front', 'front', 'Shared inbox conversations & contacts.', 'https://api2.frontapp.com', 'bearer', '{}', 'https://dev.frontapp.com/reference', '{"auth_help": "Create an API token in Front > Settings > Developers."}'::jsonb),
  ('Productboard', 'productboard', 'Features and products via Productboard.', 'https://api.productboard.com', 'bearer', '{}', 'https://developer.productboard.com/', '{"static_headers": {"X-Version": "1"}, "auth_help": "Create a token in Productboard > Settings > Public API."}'::jsonb),
  ('Klaviyo', 'klaviyo', 'Profiles and lists via Klaviyo.', 'https://a.klaviyo.com/api', 'custom', '{}', 'https://developers.klaviyo.com/en/reference/api_overview', '{"header_name": "Authorization", "static_headers": {"revision": "2024-10-15"}, "auth_help": "Private API Key; paste as: Klaviyo-API-Key YOUR_KEY"}'::jsonb),
  ('New Relic', 'newrelic', 'APM applications via New Relic.', 'https://api.newrelic.com/v2', 'api_key', '{}', 'https://docs.newrelic.com/docs/apis/rest-api-v2/', '{"api_key_in": "header", "api_key_name": "Api-Key", "auth_help": "Create a User API key in New Relic."}'::jsonb),
  ('Neon', 'neon', 'Serverless Postgres projects via Neon.', 'https://console.neon.tech/api/v2', 'bearer', '{}', 'https://api-docs.neon.tech/', '{"auth_help": "Create an API key at https://console.neon.tech/app/settings/api-keys."}'::jsonb),
  ('Telnyx', 'telnyx', 'Messaging and numbers via Telnyx.', 'https://api.telnyx.com/v2', 'bearer', '{}', 'https://developers.telnyx.com/api', '{"auth_help": "Create an API key in the Telnyx portal."}'::jsonb),
  ('Gumroad', 'gumroad', 'Products and sales via Gumroad.', 'https://api.gumroad.com/v2', 'bearer', '{}', 'https://app.gumroad.com/api', '{"auth_help": "Create an access token in Gumroad > Settings > Advanced."}'::jsonb),
  ('Paddle', 'paddle', 'Products and transactions via Paddle Billing.', 'https://api.paddle.com', 'bearer', '{}', 'https://developer.paddle.com/api-reference/overview', '{"auth_help": "Create an API key in Paddle > Developer Tools."}'::jsonb),
  ('MessageBird', 'messagebird', 'SMS and balance via Bird (MessageBird).', 'https://rest.messagebird.com', 'custom', '{}', 'https://docs.bird.com/api', '{"header_name": "Authorization", "auth_help": "Paste as: AccessKey YOUR_KEY"}'::jsonb),
  ('Cal.com', 'calcom', 'Scheduling: bookings and profile via Cal.com.', 'https://api.cal.com/v2', 'bearer', '{}', 'https://cal.com/docs/api-reference', '{"static_headers": {"cal-api-version": "2024-08-13"}, "auth_help": "Create an API key at https://app.cal.com/settings/developer/api-keys."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
