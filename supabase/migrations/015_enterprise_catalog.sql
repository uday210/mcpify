-- ============================================================================
-- Migration 015: Enterprise connectors (shipping + accounting)
-- Adds apps APIs.guru lacks; FedEx uses OAuth2 client-credentials.
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('FedEx', 'fedex', 'Track shipments and validate addresses via FedEx.',
    'https://apis.fedex.com', 'oauth2_cc', '{}', 'https://developer.fedex.com/api/en-us/home.html',
    '{"oauth":{"token_url":"https://apis.fedex.com/oauth/token"},"auth_help":"Create a project at https://developer.fedex.com to get an API Key (client_id) and Secret Key (client_secret)."}'::jsonb),

  ('QuickBooks', 'quickbooks', 'Query QuickBooks Online accounting data.',
    'https://quickbooks.api.intuit.com', 'oauth', '{}', 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/account',
    '{"oauth":{"authorize_url":"https://appcenter.intuit.com/connect/oauth2","token_url":"https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer","scopes":["com.intuit.quickbooks.accounting"]},"auth_help":"Create an app at https://developer.intuit.com, set the redirect URI to {APP_URL}/api/oauth/callback, and use your client id/secret. You will need your company realmId for queries."}'::jsonb),

  ('Square', 'square', 'Locations, payments and customers via Square.',
    'https://connect.squareup.com', 'bearer', '{}', 'https://developer.squareup.com/reference/square',
    '{"static_headers":{"Square-Version":"2024-12-18"},"auth_help":"Create an access token at https://developer.squareup.com/apps."}'::jsonb),

  ('Shippo', 'shippo', 'Multi-carrier shipping & tracking via Shippo.',
    'https://api.goshippo.com', 'custom', '{}', 'https://docs.goshippo.com/',
    '{"header_name":"Authorization","auth_help":"Get an API token at https://apps.goshippo.com/settings/api and paste it as: ShippoToken YOUR_TOKEN"}'::jsonb),

  ('EasyPost', 'easypost', 'Shipping & tracking via EasyPost.',
    'https://api.easypost.com/v2', 'basic', '{}', 'https://www.easypost.com/docs/api',
    '{"auth_help":"Username = your EasyPost API key, leave the password blank."}'::jsonb),

  ('ShipEngine', 'shipengine', 'Carriers and package tracking via ShipEngine.',
    'https://api.shipengine.com', 'api_key', '{}', 'https://www.shipengine.com/docs/',
    '{"api_key_in":"header","api_key_name":"API-Key","auth_help":"Create an API key in the ShipEngine dashboard."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
