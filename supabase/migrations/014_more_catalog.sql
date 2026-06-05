-- ============================================================================
-- Migration 014: More catalog connectors (data + finance + media)
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('PokéAPI', 'pokeapi', 'Pokémon data (no key needed).',
    'https://pokeapi.co/api/v2', 'none', '{}', 'https://pokeapi.co/docs/v2', '{"auth_help":"No credentials required."}'::jsonb),

  ('Open Library', 'openlibrary', 'Search books (no key needed).',
    'https://openlibrary.org', 'none', '{}', 'https://openlibrary.org/developers/api', '{"auth_help":"No credentials required."}'::jsonb),

  ('JSONPlaceholder', 'jsonplaceholder', 'Fake REST API for testing (no key needed).',
    'https://jsonplaceholder.typicode.com', 'none', '{}', 'https://jsonplaceholder.typicode.com/', '{"auth_help":"No credentials required."}'::jsonb),

  ('Dog CEO', 'dogceo', 'Random dog images (no key needed).',
    'https://dog.ceo/api', 'none', '{}', 'https://dog.ceo/dog-api/', '{"auth_help":"No credentials required."}'::jsonb),

  ('Alpha Vantage', 'alphavantage', 'Stock and financial market data.',
    'https://www.alphavantage.co', 'api_key', '{}', 'https://www.alphavantage.co/documentation/',
    '{"api_key_in":"query","api_key_name":"apikey","auth_help":"Get a free API key at https://www.alphavantage.co/support/#api-key."}'::jsonb),

  ('Finnhub', 'finnhub', 'Real-time stock quotes and company data.',
    'https://finnhub.io/api/v1', 'api_key', '{}', 'https://finnhub.io/docs/api',
    '{"api_key_in":"query","api_key_name":"token","auth_help":"Get a free API key at https://finnhub.io/register."}'::jsonb),

  ('WeatherAPI', 'weatherapi', 'Current weather and forecasts.',
    'https://api.weatherapi.com/v1', 'api_key', '{}', 'https://www.weatherapi.com/docs/',
    '{"api_key_in":"query","api_key_name":"key","auth_help":"Get a free API key at https://www.weatherapi.com/signup.aspx."}'::jsonb),

  ('YouTube', 'youtube', 'Search YouTube via the Data API.',
    'https://www.googleapis.com/youtube/v3', 'api_key', '{}', 'https://developers.google.com/youtube/v3',
    '{"api_key_in":"query","api_key_name":"key","auth_help":"Create an API key in Google Cloud Console and enable the YouTube Data API v3."}'::jsonb),

  ('GNews', 'gnews', 'News search and headlines.',
    'https://gnews.io/api/v4', 'api_key', '{}', 'https://gnews.io/docs/v4',
    '{"api_key_in":"query","api_key_name":"apikey","auth_help":"Get a free API key at https://gnews.io/register."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
