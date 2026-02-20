# AI SDK + Vercel Integration Notes

Research notes from comprehensive exploration of `/docs/vercel/` (629 files).
Focused on AI SDK integration, AI Gateway, streaming, serverless/edge, caching, environment variables, and deployment patterns.

---

## 1. Directory Structure Overview

The Vercel docs are organized into ~150 top-level topics with nested subdirectories. The AI-relevant sections are:

| Path | Contents |
|------|----------|
| `ai-sdk.md` | Top-level AI SDK overview (lightweight, links to sdk.vercel.ai) |
| `ai-gateway/` | 55+ files covering the AI Gateway product |
| `agent.md` + `agent/` | Vercel Agent (code review, investigation, installation) |
| `agent-resources/` | Resources for AI coding agents (MCP, skills, workflows) |
| `functions/` | Serverless/edge functions, streaming, runtimes |
| `fluid-compute.md` | Optimized concurrency model for AI workloads |
| `vercel-sandbox/` | Ephemeral VMs for running AI agent output |
| `runtime-cache.md` | Regional caching for function data |
| `environment-variables/` | Env var management including AI keys |

---

## 2. AI SDK Core Concepts

**Package:** `ai` (npm). TypeScript toolkit for LLM apps. Works with Next.js, Vue, Svelte, Node.js.

**Key functions:**
- `generateText` / `streamText` - text generation
- `generateObject` / `streamObject` - structured JSON output with Zod schemas
- `embed` / `embedMany` - vector embeddings
- `experimental_generateImage` - image generation
- `experimental_generateVideo` - video generation (AI SDK v6, experimental)
- `tool()` - define tools for function calling

**Model specification:** Plain string format `"provider/model-name"`:
```typescript
import { generateText } from "ai"

const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    prompt: "Hello",
})
```

When a model is specified as a plain string, the AI SDK **automatically uses the Vercel AI Gateway** as the default provider. This is the zero-config path.

**Global default provider override:** Use `globalThis.AI_SDK_DEFAULT_PROVIDER` in `instrumentation.ts` to set a different default provider for the entire app.

---

## 3. Vercel AI Gateway

### What It Is

A unified proxy/gateway to access **200+ models** from **35+ providers** through a single API endpoint (`https://ai-gateway.vercel.sh/v1`). Single API key, unified billing, automatic retries and fallbacks.

### Key Features

- **One key, hundreds of models** - single `AI_GATEWAY_API_KEY`
- **No token markup** - tokens cost the same as direct from provider (even with BYOK)
- **Provider routing** - control which providers serve requests via `providerOptions.gateway.order`
- **Model fallbacks** - `providerOptions.gateway.models` specifies backup models
- **Provider filtering** - `providerOptions.gateway.only` restricts to specific providers
- **Automatic caching** - `providerOptions.gateway.caching: "auto"` handles provider-specific cache semantics (e.g., Anthropic cache_control)
- **Zero Data Retention** - `providerOptions.gateway.zeroDataRetention: true` routes only to ZDR-compliant providers
- **BYOK (Bring Your Own Key)** - use your own provider credentials, team-wide or per-request
- **Web search** - built-in Perplexity Search and Parallel Search tools, plus native Anthropic/OpenAI/Google search
- **Observability** - request logs, TTFT metrics, token counts, spend tracking in dashboard
- **Image generation** - DALL-E, Imagen, Flux, multimodal LLMs (Gemini image models)
- **Video generation** - Veo, KlingAI, Wan (experimental, AI SDK v6)
- **Embeddings** - `embed()` / `embedMany()` with models like `openai/text-embedding-3-small`

### Authentication Methods

1. **API Key** (`AI_GATEWAY_API_KEY` env var) - works anywhere (local dev, CI, external servers). Created in Vercel dashboard. Never expires unless revoked.
2. **OIDC Token** (`VERCEL_OIDC_TOKEN`) - auto-available on Vercel deployments. No secrets to manage. Valid 12 hours, refresh with `vercel env pull`.

```typescript
// Auto-detect: OIDC on Vercel, API key locally
const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN
```

### Gateway Provider Instance

Install `@ai-sdk/gateway` for explicit provider creation:

```typescript
import { gateway } from "@ai-sdk/gateway"
import { createGateway } from "@ai-sdk/gateway"

// Default instance
const result = await generateText({
    model: gateway("anthropic/claude-opus-4.5"),
    prompt: "...",
})

// Custom instance with different env var or base URL
const myGateway = createGateway({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: "https://ai-gateway.vercel.sh/v1/ai",
})
```

### Provider Routing and Fallbacks

```typescript
const result = streamText({
    model: "anthropic/claude-sonnet-4.5",
    prompt,
    providerOptions: {
        gateway: {
            order: ["bedrock", "anthropic"],  // Try Bedrock first
            only: ["bedrock", "anthropic"],   // Only these providers
            models: ["google/gemini-3-flash"], // Fallback models
            caching: "auto",                   // Auto cache control
            zeroDataRetention: true,           // ZDR enforcement
            byok: {                            // Per-request BYOK
                anthropic: [{ apiKey: process.env.ANTHROPIC_API_KEY }],
            },
        },
    },
})
```

### Provider Metadata in Responses

Every response includes routing metadata showing which provider was used, fallbacks available, cost, generation ID, and attempt details.

```typescript
const metadata = await result.providerMetadata
// metadata.gateway.cost - amount debited
// metadata.gateway.generationId - unique ID for generation lookup
// metadata.gateway.routing.resolvedProvider - which provider served it
```

### Compatible APIs (Non-AI-SDK)

The gateway exposes three API interfaces beyond the AI SDK:

1. **OpenAI-compatible** (`https://ai-gateway.vercel.sh/v1`) - drop-in replacement for OpenAI SDK
2. **Anthropic-compatible** (`https://ai-gateway.vercel.sh`) - drop-in for Anthropic SDK
3. **OpenResponses** (`https://ai-gateway.vercel.sh/v1/responses`) - open standard

All three support TypeScript, Python, cURL. Just change `baseURL` and `apiKey`.

### Pricing

- **Free tier** - small monthly credit when you make first request
- **Paid tier** - purchase AI Gateway Credits, zero markup on tokens
- **BYOK** - no fee from AI Gateway when using your own keys
- **Auto top-up** - configurable threshold for automatic credit purchase
- **Usage API** - `GET /v1/credits` for balance, `GET /v1/generation?id=` for generation details

### Dynamic Model Discovery

```typescript
import { gateway } from "@ai-sdk/gateway"

const { models } = await gateway.getAvailableModels()
// Filter by type: language, embedding, image, video
const textModels = models.filter((m) => m.modelType === "language")

// REST API (no auth required):
// GET https://ai-gateway.vercel.sh/v1/models
// GET https://ai-gateway.vercel.sh/v1/models/{creator}/{model}/endpoints
```

### Available Providers (35+)

Major providers: `anthropic`, `openai`, `google`, `xai`, `mistral`, `deepseek`, `groq`, `bedrock`, `vertex`, `azure`, `cohere`, `fireworks`, `togetherai`, `perplexity`, `cerebras`, `deepinfra`, `bfl` (Black Forest Labs), `klingai`, and more.

### Web Search

Two universal tools (work with any model):

```typescript
import { gateway, streamText } from "ai"

// Perplexity Search ($5/1000 requests)
const result = streamText({
    model: "openai/gpt-5.2",
    prompt,
    tools: {
        perplexity_search: gateway.tools.perplexitySearch({
            maxResults: 5,
            searchRecencyFilter: "week",
        }),
    },
})

// Parallel Search ($5/1000 requests)
const result2 = streamText({
    model: "anthropic/claude-sonnet-4.5",
    prompt,
    tools: {
        parallel_search: gateway.tools.parallelSearch({
            mode: "one-shot",
            maxResults: 15,
        }),
    },
})
```

Provider-specific search: `anthropic.tools.webSearch_20250305()`, `openai.tools.webSearch({})`, `vertex.tools.googleSearch({})`.

### Zero Data Retention Providers

ZDR-compliant: Amazon Bedrock, Anthropic, Baseten, Cerebras, DeepInfra, Fireworks, Google Vertex, Groq, Mistral, Parasail, Together.

### Model Variants

Anthropic Claude Sonnet 4/4.5 automatically gets 1M token context window through AI Gateway. No configuration needed.

---

## 4. Streaming on Vercel

### Recommended Approach

Vercel explicitly recommends using the AI SDK for streaming. The `streamText` function handles all the SSE boilerplate.

```typescript
import { streamText } from "ai"

export async function GET() {
    const response = streamText({
        model: "openai/gpt-4o-mini",
        messages: [{ role: "user", content: "..." }],
    })
    return response.toTextStreamResponse({
        headers: { "Content-Type": "text/event-stream" },
    })
}
```

Also available: `response.toUIMessageStreamResponse()`, `response.toDataStreamResponse()`.

### Function Duration for Streaming

- **Fluid compute (default)**: 300s default, up to 800s (Pro/Enterprise)
- **Edge runtime**: Must begin response within 25s, can continue streaming up to 300s
- **No fluid compute**: 10-15s default, up to 60s (Hobby) / 300s (Pro) / 900s (Enterprise)

For AI workloads, fluid compute is essential. It's enabled by default since April 2025.

---

## 5. Edge vs Node.js Runtime

### Vercel Recommendation

**Vercel now recommends Node.js over Edge** for most workloads. Both runtimes run on fluid compute with active CPU pricing. Edge has a smaller API surface and more restrictions.

### Edge Runtime Characteristics

- Built on V8 engine
- Subset of Web APIs (fetch, Request, Response, Streams, Crypto)
- **No filesystem access**
- **No `require`** - must use `import`
- **No `eval`** or dynamic code execution
- **1-4 MB code size limit** (after gzip)
- **5KB per env var limit**
- Must begin response within 25s
- Runs closest to user by default (multi-region)

### Node.js Runtime Characteristics

- Full Node.js API coverage
- 250 MB bundle size limit
- 2-4 GB memory
- Up to 800s duration
- 64KB total env var limit
- Single region by default (configurable)

### For AI Workloads

Node.js is better because:
- Full API coverage for AI SDKs
- Higher memory limits
- Longer max duration
- Fluid compute handles concurrency efficiently

---

## 6. Fluid Compute (Critical for AI)

Fluid compute is the execution model that makes AI workloads cost-effective on Vercel.

### Key Benefits for AI

- **Optimized concurrency**: Multiple invocations share a single function instance. While one request waits for an LLM response (I/O), another can use the CPU.
- **Active CPU billing**: Only billed when code actively executes, NOT during I/O waits (database queries, AI model calls, etc.)
- **Error isolation**: One broken request won't crash others on the same instance.
- **Bytecode caching**: Reduces cold starts on Node.js 20+.
- **Pre-warming**: Functions pre-warmed on production deployments.
- **AZ failover**: Automatic failover across availability zones and regions.

### Pricing Implications for AI

AI workloads are heavily I/O-bound (waiting for model responses). With fluid compute:
- **Active CPU**: Only billed for actual computation (parsing, prompt assembly, response processing)
- **Provisioned Memory**: Billed for full instance lifetime including I/O waits
- **Invocations**: Per-request count

This means a function spending 100ms on CPU and 4000ms waiting for an LLM is billed for 100ms of CPU, not 4000ms.

### Configuration

```json
// vercel.json
{ "fluid": true }
```

Or enable in dashboard under project Settings > Functions > Fluid Compute.

---

## 7. Caching for AI Responses

### Runtime Cache

Regional, ephemeral cache for function data. Good for caching repeated AI queries:

```typescript
import { getCache } from "@vercel/functions"

const cache = getCache()
const cached = await cache.get("ai-response-key")
if (cached) return new Response(JSON.stringify(cached))

const aiResult = await generateText({ ... })
await cache.set("ai-response-key", aiResult, {
    ttl: 3600,  // 1 hour
    tags: ["ai-responses"],
})
```

**Not suitable for**: user-specific data, data that must be fresh every request.

### AI Gateway-Level Caching

The AI Gateway supports automatic caching via `providerOptions.gateway.caching: "auto"`:
- OpenAI, Google, DeepSeek: implicit caching by default
- Anthropic: Gateway auto-adds `cache_control` breakpoints

Model pricing includes cache read/write tiers in the `/v1/models` response.

### CDN Cache

For complete HTTP responses. Not typically useful for dynamic AI responses.

---

## 8. Environment Variables for AI

### AI Gateway Key

```bash
# .env.local
AI_GATEWAY_API_KEY=your_key_here
```

The AI SDK automatically reads `AI_GATEWAY_API_KEY` when using the gateway provider.

### OIDC Token

On Vercel deployments, `VERCEL_OIDC_TOKEN` is automatically available. For local dev:
```bash
vercel link
vercel env pull  # Downloads .env file with OIDC token (valid 12 hours)
```

### Provider-Specific Keys (for BYOK)

Store provider keys as Vercel environment variables:
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

Then pass via `providerOptions.gateway.byok` for per-request BYOK.

### Limits

- Node.js: 64KB total env vars per deployment
- Edge: 5KB per individual env var

---

## 9. Deployment Patterns for AI Apps

### Standard Pattern: Next.js + AI SDK + AI Gateway

1. Install `ai` package
2. Set `AI_GATEWAY_API_KEY` in environment variables
3. Create API route or server action using `streamText`/`generateText`
4. Use plain string model IDs (auto-routes through AI Gateway)
5. Deploy to Vercel (fluid compute enabled by default)

### API Route (Streaming)

```typescript
// app/api/chat/route.ts
import { streamText } from "ai"

export async function POST(request: Request) {
    const { prompt } = await request.json()
    const result = streamText({
        model: "anthropic/claude-sonnet-4.5",
        prompt,
    })
    return result.toUIMessageStreamResponse()
}
```

### Function Duration Configuration

For AI routes that may need longer response times:

```typescript
// app/api/chat/route.ts
export const maxDuration = 300  // 5 minutes (or up to 800 for Pro)
```

### Region Configuration

Place functions close to your data, not necessarily close to users:

```typescript
// For Next.js App Router
export const preferredRegion = "iad1"  // US East (default)
```

### Recommended Runtime

Use Node.js (default). Edge is deprecated for new AI workloads:
```typescript
// DON'T set this for AI routes:
// export const runtime = "edge"
```

---

## 10. Vercel Agent (Platform AI Features)

Separate from the AI SDK - these are Vercel's own AI-powered tools:

- **Code Review**: Auto-reviews PRs, suggests fixes, runs them in sandboxes
- **Investigation**: Analyzes error alerts, queries logs/metrics, identifies root causes
- **Installation**: Auto-installs Web Analytics and Speed Insights via PR

Pricing: $0.30 USD per review/investigation + token costs. $100 promo credit for Pro teams.

---

## 11. Vercel Sandbox

Ephemeral Firecracker microVMs for running untrusted code. AI-relevant for:

- Executing AI agent output safely
- Code playgrounds and AI-powered UI builders
- Testing AI-generated code in isolation

Features: millisecond startup, snapshotting, Node.js 24/22/Python 3.13 runtimes, sudo access.

SDK: `@vercel/sandbox` (TypeScript), `sandbox` CLI.

---

## 12. Agent Resources

Vercel provides resources for AI coding agents:

- **`llms-full.txt`**: Machine-readable docs at `https://vercel.com/docs/llms-full.txt`
- **Markdown access**: Every doc page available as `.md`
- **Vercel MCP server**: Connects AI assistants to Vercel account
- **Skills.sh**: Open ecosystem for reusable AI agent capabilities (`npx skills add <owner/repo>`)
- **CLI workflows**: Step-by-step guides for agents using Vercel CLI

---

## 13. Framework Ecosystem Integration

AI Gateway works with non-AI-SDK frameworks via OpenAI-compatible endpoint:

| Framework | Language | Integration |
|-----------|----------|-------------|
| LangChain | Python/JS | OpenAI-compatible |
| LlamaIndex | Python | Native `llama-index-llms-vercel-ai-gateway` |
| Pydantic AI | Python | Native `VercelProvider` |
| Mastra | TypeScript | Native |
| LiteLLM | Python | Native prefix |
| Langfuse | Any | Observability integration |

---

## 14. App Attribution

Optional headers to identify your app in AI Gateway requests:

```typescript
const result = streamText({
    headers: {
        "http-referer": "https://myapp.vercel.app",
        "x-title": "MyApp",
    },
    model: "anthropic/claude-sonnet-4.5",
    prompt: "...",
})
```

Can be set at provider level via `createGateway({ headers: {...} })`.

---

## Summary

- **AI SDK** is the recommended TypeScript toolkit for AI on Vercel. Package: `ai`.
- **AI Gateway** is the unified proxy (200+ models, 35+ providers) with zero token markup, automatic fallbacks, BYOK, ZDR, web search, and observability.
- **Plain string model IDs** auto-route through AI Gateway. No provider import needed.
- **Fluid compute** is essential for AI workloads (active CPU billing, optimized concurrency).
- **Node.js runtime** preferred over Edge for AI.
- **Streaming** via `streamText().toUIMessageStreamResponse()` is the canonical pattern.
- **OIDC tokens** for zero-config auth on Vercel deployments, API keys for local/external.
- **`providerOptions.gateway`** controls routing, fallbacks, caching, ZDR, and BYOK.
- **Max duration**: 300s default, 800s max on Pro/Enterprise with fluid compute.
- **Runtime Cache** via `getCache()` for caching repeated AI queries.
- **Vercel Sandbox** for safely executing AI-generated code.
