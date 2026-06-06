-- ============================================================================
-- Migration 016: Payments / dev / AI / Google / Microsoft connectors
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('PayPal', 'paypal', 'Invoices and transactions via PayPal.',
    'https://api-m.paypal.com', 'oauth2_cc', '{}', 'https://developer.paypal.com/api/rest/',
    '{"oauth":{"token_url":"https://api-m.paypal.com/v1/oauth2/token"},"auth_help":"Create an app at https://developer.paypal.com to get Client ID + Secret (Live)."}'::jsonb),

  ('Netlify', 'netlify', 'Sites and deploys via Netlify.',
    'https://api.netlify.com/api/v1', 'bearer', '{}', 'https://docs.netlify.com/api/get-started/',
    '{"auth_help":"Create a Personal Access Token in Netlify > User settings > Applications."}'::jsonb),

  ('Brevo', 'brevo', 'Email + contacts via Brevo (Sendinblue).',
    'https://api.brevo.com/v3', 'api_key', '{}', 'https://developers.brevo.com/reference',
    '{"api_key_in":"header","api_key_name":"api-key","auth_help":"Create an API key at https://app.brevo.com/settings/keys/api."}'::jsonb),

  ('Postmark', 'postmark', 'Transactional email via Postmark.',
    'https://api.postmarkapp.com', 'custom', '{}', 'https://postmarkapp.com/developer',
    '{"header_name":"X-Postmark-Server-Token","auth_help":"Use a Server API Token from your Postmark server settings."}'::jsonb),

  ('Cohere', 'cohere', 'LLMs and embeddings via Cohere.',
    'https://api.cohere.com', 'bearer', '{}', 'https://docs.cohere.com/reference/about',
    '{"auth_help":"Create an API key at https://dashboard.cohere.com/api-keys."}'::jsonb),

  ('Hugging Face', 'huggingface', 'Models and datasets via Hugging Face.',
    'https://huggingface.co', 'bearer', '{}', 'https://huggingface.co/docs/hub/api',
    '{"auth_help":"Create an access token at https://huggingface.co/settings/tokens."}'::jsonb),

  ('Replicate', 'replicate', 'Run ML models via Replicate.',
    'https://api.replicate.com/v1', 'custom', '{}', 'https://replicate.com/docs/reference/http',
    '{"header_name":"Authorization","auth_help":"Get a token at https://replicate.com/account/api-tokens and paste as: Token YOUR_TOKEN"}'::jsonb),

  ('ElevenLabs', 'elevenlabs', 'Text-to-speech and voices via ElevenLabs.',
    'https://api.elevenlabs.io', 'api_key', '{}', 'https://elevenlabs.io/docs/api-reference',
    '{"api_key_in":"header","api_key_name":"xi-api-key","auth_help":"Create an API key in your ElevenLabs profile settings."}'::jsonb),

  ('Google Sheets', 'google_sheets', 'Read Google Sheets data.',
    'https://sheets.googleapis.com/v4', 'oauth', '{}', 'https://developers.google.com/sheets/api',
    '{"oauth":{"authorize_url":"https://accounts.google.com/o/oauth2/v2/auth","token_url":"https://oauth2.googleapis.com/token","scopes":["https://www.googleapis.com/auth/spreadsheets.readonly"],"access_type":"offline","prompt":"consent"},"auth_help":"Create an OAuth client in Google Cloud Console; redirect URI {APP_URL}/api/oauth/callback; enable the Google Sheets API."}'::jsonb),

  ('Gmail', 'gmail', 'Read Gmail messages.',
    'https://gmail.googleapis.com/gmail/v1', 'oauth', '{}', 'https://developers.google.com/gmail/api',
    '{"oauth":{"authorize_url":"https://accounts.google.com/o/oauth2/v2/auth","token_url":"https://oauth2.googleapis.com/token","scopes":["https://www.googleapis.com/auth/gmail.readonly"],"access_type":"offline","prompt":"consent"},"auth_help":"Create an OAuth client in Google Cloud Console; redirect URI {APP_URL}/api/oauth/callback; enable the Gmail API."}'::jsonb),

  ('Google Calendar', 'google_calendar', 'Read Google Calendar events.',
    'https://www.googleapis.com/calendar/v3', 'oauth', '{}', 'https://developers.google.com/calendar/api',
    '{"oauth":{"authorize_url":"https://accounts.google.com/o/oauth2/v2/auth","token_url":"https://oauth2.googleapis.com/token","scopes":["https://www.googleapis.com/auth/calendar.readonly"],"access_type":"offline","prompt":"consent"},"auth_help":"Create an OAuth client in Google Cloud Console; redirect URI {APP_URL}/api/oauth/callback; enable the Google Calendar API."}'::jsonb),

  ('Microsoft Graph', 'microsoft_graph', 'Outlook mail, calendar and profile via Microsoft Graph.',
    'https://graph.microsoft.com/v1.0', 'oauth', '{}', 'https://learn.microsoft.com/en-us/graph/api/overview',
    '{"oauth":{"authorize_url":"https://login.microsoftonline.com/common/oauth2/v2.0/authorize","token_url":"https://login.microsoftonline.com/common/oauth2/v2.0/token","scopes":["User.Read","Mail.Read","Calendars.Read","offline_access"]},"auth_help":"Register an app at https://entra.microsoft.com (App registrations); redirect URI {APP_URL}/api/oauth/callback."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
