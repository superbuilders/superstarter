---
title: Provider Options
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openresponses/provider-options
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/openresponses
  - /docs/ai-gateway/sdks-and-apis
related:
  - /docs/ai-gateway/sdks-and-apis/openresponses
summary: Configure provider routing, fallbacks, and restrictions using the OpenResponses API.
---

# Provider Options

The [OpenResponses API](/docs/ai-gateway/sdks-and-apis/openresponses) lets you configure AI Gateway behavior using `providerOptions`. The `gateway` namespace gives you control over provider routing, fallbacks, and restrictions.

## Model fallbacks

Set up automatic fallbacks so if your primary model is unavailable, requests route to backup models in order. Use the `models` array to specify the fallback chain.

```typescript filename="fallbacks.ts"
const apiKey = process.env.AI_GATEWAY_API_KEY;

const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    input: [{ type: 'message', role: 'user', content: 'Tell me a fun fact about octopuses.' }],
    providerOptions: {
      gateway: {
        models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.2', 'google/gemini-3-flash'],
      },
    },
  }),
});
```

## Provider routing

Control the order in which providers are tried using the `order` array. AI Gateway will attempt providers in the specified order until one succeeds.

```typescript filename="routing.ts"
const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'google/gemini-3-flash',
    input: [{ type: 'message', role: 'user', content: 'Explain quantum computing in one sentence.' }],
    providerOptions: {
      gateway: {
        order: ['google', 'openai', 'anthropic'],
      },
    },
  }),
});
```

## Provider restriction

Restrict requests to specific providers using the `only` array. This ensures your requests only go to approved providers, which can be useful for compliance or cost control.

```typescript filename="restriction.ts"
const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'zai/glm-4.7',
    input: [{ type: 'message', role: 'user', content: 'What makes a great cup of coffee?' }],
    providerOptions: {
      gateway: {
        only: ['zai', 'deepseek'],
      },
    },
  }),
});
```

## Automatic caching

Some providers like Anthropic require explicit cache control markers to enable prompt caching, while others like OpenAI, Google, and DeepSeek cache automatically (sometimes called "implicit caching"). Use `caching: 'auto'` to let AI Gateway handle this for you - it applies the appropriate caching strategy based on the provider.

**Default behavior**: When `caching` is not set, AI Gateway passes your request through without modification. Providers with implicit caching (OpenAI, Google, DeepSeek) will still cache automatically. For Anthropic, you'll need to set `caching: 'auto'` or manually add `cache_control` markers to your messages.

```typescript filename="caching.ts"
const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    caching: 'auto',
    instructions: 'You are a helpful assistant with access to a large knowledge base...',
    input: [{ type: 'message', role: 'user', content: 'What is the capital of France?' }],
  }),
});
```

When `caching: 'auto'` is set and the request routes to Anthropic models, AI Gateway adds a `cache_control` breakpoint at the end of your static content.

> **💡 Note:** **Supported providers:** Automatic caching works with Anthropic models served
> directly by Anthropic or through Vertex AI. Bedrock is not yet supported for
> automatic caching.


---

[View full sitemap](/docs/sitemap)
