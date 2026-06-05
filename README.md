# mcpify — Universal MCP Server Bridge

Connect any cloud application and expose it as a hosted **Model Context Protocol (MCP)** server — over **SSE** or **Streamable HTTP** — with auth handled for you. Point Claude (or any MCP client) at the generated URL and start calling tools. Inspired by [Pipedream MCP](https://mcp.pipedream.com/); sibling to [FlowMakeApp](https://github.com/uday210/FlowMakeApp).

## How it works

```
MCP client ──JSON-RPC 2.0 (SSE | Streamable HTTP)──▶  /api/mcp/<slug>
                                                          │ initialize / tools/list / tools/call
                                                          ▼
                                              loads mcp_tools + connection
                                                          │ tools/call → proxy
                                                          ▼
                              injects auth (key/bearer/basic/custom/OAuth) ──▶ Real cloud API
```

1. **Create a connection** to a cloud app three ways:
   - **Catalog** — pick a built-in app (GitHub, Stripe, OpenWeather).
   - **OpenAPI** — paste/point at an OpenAPI 3.x or Swagger 2.0 spec; tools are generated per operation.
   - **Manual** — define endpoints by hand.
2. **Configure auth** — API key, Bearer, Basic, custom header, or **OAuth 2.0** (authorize + refresh).
3. **Generate an MCP server** — choose transport (SSE / Streamable HTTP), select tools, get a URL + API key.
4. **Use it anywhere** — tool calls are proxied to the real API with your encrypted credentials injected.

## Tech stack

- **Next.js 15** (App Router) · React 19 · TypeScript · TailwindCSS
- **Supabase** (Postgres + Auth + RLS)
- **AES-256-GCM** credential encryption at rest
- **Railway** for deployment
- Hand-rolled JSON-RPC 2.0 MCP runtime — no external MCP SDK

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-side only) |
| `JWT_SECRET` | Signs OAuth `state`. `openssl rand -hex 32` |
| `CREDENTIALS_ENCRYPTION_KEY` | Encrypts stored credentials. `openssl rand -hex 32`. **Don't change after data exists.** |
| `NEXT_PUBLIC_APP_URL` | Public base URL (used for MCP URLs + OAuth redirect) |

### Database

Run the schema in the Supabase **SQL Editor** — paste [`supabase/schema.sql`](supabase/schema.sql) (it bundles
migrations `001`→`004`: tables, RLS, the new-user trigger, the connector/tools model, and catalog seeds).
The individual migrations live in [`supabase/migrations/`](supabase/migrations/).

> OAuth redirect URI to register with providers: `{NEXT_PUBLIC_APP_URL}/api/oauth/callback`

## Using a generated server

The wizard gives you a ready-to-paste client config, e.g. for Claude:

```json
{
  "mcpServers": {
    "my-github": {
      "type": "http",
      "url": "https://your-app.up.railway.app/api/mcp/my-github",
      "headers": { "Authorization": "Bearer <server_api_key>" }
    }
  }
}
```

Or hit it directly (Streamable HTTP):

```bash
curl -X POST "$URL" -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Deploy to Railway

1. Create a Railway project from this repo (Nixpacks; config in [`railway.toml`](railway.toml)).
2. Set the environment variables above in the service **Variables** tab (set `NEXT_PUBLIC_APP_URL` to the Railway URL).
3. Deploy. Build = `npm run build`, start = `npm run start` (Next binds `$PORT` automatically).

## Security

- Credentials & OAuth tokens encrypted (AES-256-GCM) before storage.
- Postgres **Row Level Security** isolates every org's data; MCP server API keys gate the runtime.
- Service-role access is confined to trusted server contexts (MCP runtime, OAuth callback).

## License

MIT
