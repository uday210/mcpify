-- ============================================================================
-- Migration 018: AI providers + data/places/search connectors
-- Tool sets live in src/lib/connectors/catalog.ts.
-- ============================================================================

INSERT INTO app_definitions (name, slug, description, base_url, auth_type, scope_permissions, api_documentation_url, config)
VALUES
  ('Groq', 'groq', 'Fast LLM inference (OpenAI-compatible).', 'https://api.groq.com/openai/v1', 'bearer', '{}', 'https://console.groq.com/docs', '{"auth_help":"Create an API key at https://console.groq.com/keys."}'::jsonb),
  ('Mistral', 'mistral', 'Mistral AI chat + models.', 'https://api.mistral.ai/v1', 'bearer', '{}', 'https://docs.mistral.ai/api/', '{"auth_help":"Create an API key at https://console.mistral.ai/api-keys/."}'::jsonb),
  ('Perplexity', 'perplexity', 'Answer engine with citations.', 'https://api.perplexity.ai', 'bearer', '{}', 'https://docs.perplexity.ai/', '{"auth_help":"Create an API key at https://www.perplexity.ai/settings/api."}'::jsonb),
  ('Together AI', 'together', 'Open models inference.', 'https://api.together.xyz/v1', 'bearer', '{}', 'https://docs.together.ai/reference', '{"auth_help":"Create an API key at https://api.together.ai/settings/api-keys."}'::jsonb),
  ('DeepL', 'deepl', 'Machine translation via DeepL.', 'https://api-free.deepl.com/v2', 'custom', '{}', 'https://developers.deepl.com/docs', '{"header_name":"Authorization","auth_help":"Get a free key at https://www.deepl.com/pro-api and paste as: DeepL-Auth-Key YOUR_KEY (Pro users: change base to https://api.deepl.com/v2)."}'::jsonb),
  ('Stability AI', 'stability', 'Image generation engines.', 'https://api.stability.ai', 'bearer', '{}', 'https://platform.stability.ai/docs/api-reference', '{"auth_help":"Create an API key at https://platform.stability.ai/account/keys."}'::jsonb),
  ('AssemblyAI', 'assemblyai', 'Speech-to-text transcripts.', 'https://api.assemblyai.com/v2', 'custom', '{}', 'https://www.assemblyai.com/docs', '{"header_name":"Authorization","auth_help":"Create an API key at https://www.assemblyai.com/app/account and paste it as the header value (no Bearer prefix)."}'::jsonb),
  ('Yelp', 'yelp', 'Business search & reviews.', 'https://api.yelp.com/v3', 'bearer', '{}', 'https://docs.developer.yelp.com/docs/fusion-intro', '{"auth_help":"Create an API key at https://www.yelp.com/developers/v3/manage_app."}'::jsonb),
  ('The Guardian', 'guardian', 'Guardian news content.', 'https://content.guardianapis.com', 'api_key', '{}', 'https://open-platform.theguardian.com/documentation/', '{"api_key_in":"query","api_key_name":"api-key","auth_help":"Get a free key at https://open-platform.theguardian.com/access/."}'::jsonb),
  ('OMDb', 'omdb', 'Movie & TV info (IMDb data).', 'https://www.omdbapi.com', 'api_key', '{}', 'https://www.omdbapi.com/', '{"api_key_in":"query","api_key_name":"apikey","auth_help":"Get a free key at https://www.omdbapi.com/apikey.aspx."}'::jsonb),
  ('Ticketmaster', 'ticketmaster', 'Events, venues & attractions.', 'https://app.ticketmaster.com/discovery/v2', 'api_key', '{}', 'https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/', '{"api_key_in":"query","api_key_name":"apikey","auth_help":"Get a key at https://developer.ticketmaster.com/."}'::jsonb),
  ('Hunter', 'hunter', 'Find & verify professional emails.', 'https://api.hunter.io/v2', 'api_key', '{}', 'https://hunter.io/api-documentation/v2', '{"api_key_in":"query","api_key_name":"api_key","auth_help":"Get an API key at https://hunter.io/api-keys."}'::jsonb)
ON CONFLICT (slug) DO NOTHING;
