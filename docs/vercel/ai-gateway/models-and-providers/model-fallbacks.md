---
title: Model Fallbacks
product: vercel
url: /docs/ai-gateway/models-and-providers/model-fallbacks
type: integration
prerequisites:
  - /docs/ai-gateway/models-and-providers
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/models-and-providers/provider-options
summary: Configure model-level failover to try backup models when the primary model is unavailable
---

# Model Fallbacks

You can configure model failover to specify backups that are tried in order if the primary model fails or is unavailable.

## Using the `models` option

Use the `models` array in `providerOptions.gateway` to specify fallback models:

```typescript filename="app/api/chat/route.ts" {7,11}
import { streamText } from 'ai';

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const result = streamText({
    model: 'openai/gpt-5.2', // Primary model
    prompt,
    providerOptions: {
      gateway: {
        models: ['anthropic/claude-sonnet-4.5', 'google/gemini-3-flash'], // Fallback models
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

In this example:

- The gateway first attempts the primary model (`openai/gpt-5.2`)
- If that fails, it tries `anthropic/claude-sonnet-4.5`
- If that also fails, it tries `google/gemini-3-flash`
- The response comes from the first model that succeeds

## Combining with provider routing

You can use `models` together with `order` to control both model failover and provider preference:

```typescript filename="app/api/chat/route.ts" {12}
import { streamText } from 'ai';

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const result = streamText({
    model: 'openai/gpt-5.2',
    prompt,
    providerOptions: {
      gateway: {
        models: ['openai/gpt-5-nano', 'anthropic/claude-sonnet-4.5'],
        order: ['azure', 'openai'], // Provider preference for each model
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
```

This configuration:

1. Tries `openai/gpt-5.2` via Azure, then OpenAI
2. If both fail, tries `openai/gpt-5-nano` via Azure first, then OpenAI
3. If those fail, tries `anthropic/claude-sonnet-4.5` via available providers

## How failover works

When processing a request with model fallbacks:

1. The gateway routes the request to the primary model (the `model` parameter)
2. For each model, provider routing rules apply (using `order` or `only` if specified)
3. If all providers for a model fail, the gateway tries the next model in the `models` array
4. The response comes from the first successful model/provider combination

> **💡 Note:** Failover happens automatically. To see which model and provider served your
> request, check the [provider
> metadata](/docs/ai-gateway/models-and-providers/provider-options#example-provider-metadata-output).


---

[View full sitemap](/docs/sitemap)
