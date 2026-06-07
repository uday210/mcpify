// OpenAI-compatible chat-completions providers usable as the Playground "brain".
// Each is a catalog app (bearer auth) at {base_url}/chat/completions.

export interface LlmProvider {
	slug: string;
	name: string;
	defaultModel: string;
}

export const LLM_PROVIDERS: LlmProvider[] = [
	{ slug: 'openai', name: 'OpenAI', defaultModel: 'gpt-4o-mini' },
	{ slug: 'groq', name: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
	{ slug: 'together', name: 'Together AI', defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
	{ slug: 'openrouter', name: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini' },
	{ slug: 'mistral', name: 'Mistral', defaultModel: 'mistral-small-latest' },
	{ slug: 'fireworks', name: 'Fireworks', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
	{ slug: 'xai', name: 'xAI (Grok)', defaultModel: 'grok-2-latest' },
];

export const LLM_SLUGS = LLM_PROVIDERS.map((p) => p.slug);
export const DEFAULT_MODELS: Record<string, string> = Object.fromEntries(LLM_PROVIDERS.map((p) => [p.slug, p.defaultModel]));
