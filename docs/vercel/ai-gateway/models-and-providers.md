---
title: Models & Providers
product: vercel
url: /docs/ai-gateway/models-and-providers
type: integration
prerequisites:
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/models-and-providers/provider-options
summary: Learn about models and providers for the AI Gateway.
---

# Models & Providers

The AI Gateway's unified API provides flexibility, allowing you to switch between [different AI models](https://vercel.com/ai-gateway/models) and providers without rewriting parts of your application. This is useful for testing different models or when you want to change the underlying AI provider for cost or performance reasons. You can also configure [provider routing and model fallbacks](/docs/ai-gateway/models-and-providers/provider-options) to ensure high availability and reliability.

> **💡 Note:** To view the list of supported models and providers, check out the [AI Gateway
> models page](https://vercel.com/ai-gateway/models).

### What are models and providers?

Models are AI algorithms that process your input data to generate responses, such as [Grok 4.1](/ai-gateway/models/grok-4.1-fast-reasoning), [GPT-5.2](/ai-gateway/models/gpt-5.2), or [Claude Opus 4.5](/ai-gateway/models/claude-opus-4.5). Providers are the companies or services that host these models, such as xAI, OpenAI, or Anthropic.

In some cases, multiple providers, including the model creator, host the same model. For example, you can use the `xai/grok-code-fast-1` model from xAI or the `openai/gpt-5.2` model from OpenAI, following the format `creator/model-name`.

Different providers may have different specifications for the same model such as different pricing and performance. You can choose the one that best fits your needs.

You can view the list of supported models and providers in three ways:

**Through the AI Gateway dashboard:**

1. Go to the [**AI Gateway** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in your Vercel dashboard
2. Click **Model List** within the AI Gateway tab

**Through the AI Gateway site:**

Visit the [AI Gateway models page](https://vercel.com/ai-gateway/models) to browse all available models, filter by provider, and view pricing details.

**Through the REST API:**

Query the models endpoint directly to get a JSON list of all available models with pricing and capabilities:

```
https://ai-gateway.vercel.sh/v1/models
```

This endpoint requires no authentication and returns detailed information including model IDs, context windows, and pricing. See [Dynamic model discovery](#dynamic-model-discovery) for usage examples.

### Specifying the model

There are two ways to specify the model and provider to use for an AI Gateway request:

- [As part of an AI SDK function call](#as-part-of-an-ai-sdk-function-call)
- [Globally for all requests in your application](#globally-for-all-requests-in-your-application)

#### As part of an AI SDK function call

In the AI SDK, you can specify the model and provider directly in your API calls using either plain strings or the AI Gateway provider. This allows you to switch models or providers for specific requests without affecting the rest of your application.

To use AI Gateway, specify a model and provider via a plain string, for example:

```typescript filename="app/api/chat/route.ts" {6}
import { generateText } from 'ai';
import { NextRequest } from 'next/server';

export async function GET() {
  const result = await generateText({
    model: 'xai/grok-4.1-fast-non-reasoning',
    prompt: 'Tell me the history of the San Francisco Mission-style burrito.',
  });
  return Response.json(result);
}
```

You can test different models by changing the `model` parameter and opening your browser to `http://localhost:3000/api/chat`.

You can also use a provider instance. This can be useful if you'd like to create models to use with a [custom provider](https://ai-sdk.dev/docs/ai-sdk-core/provider-management#custom-providers) or if you'd like to use a Gateway provider with the AI SDK [Provider Registry](https://ai-sdk.dev/docs/ai-sdk-core/provider-management#provider-registry).

Install the `@ai-sdk/gateway` package directly as a dependency in your project.

```bash filename="terminal"
pnpm install @ai-sdk/gateway
```

You can change the model by changing the string passed to `gateway()`.

```typescript filename="app/api/chat/route.ts" {2, 7}
import { generateText } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { NextRequest } from 'next/server';

export async function GET() {
  const result = await generateText({
    model: gateway('anthropic/claude-opus-4.5'),
    prompt: 'Tell me the history of the San Francisco Mission-style burrito.',
  });
  return Response.json(result);
}
```

The example above uses the default `gateway` provider instance. You can also create a custom provider instance to use in your application. Creating a custom instance is useful when you need to specify a different environment variable for your API key, or when you need to set a custom base URL (for example, if you're working behind a corporate proxy server).

```typescript filename="app/api/chat/route.ts" {4-7, 11}
import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY, // the default environment variable for the API key
  baseURL: 'https://ai-gateway.vercel.sh/v1/ai', // the default base URL
});

export async function GET() {
  const result = await generateText({
    model: gateway('anthropic/claude-opus-4.5'),
    prompt: 'Why is the sky blue?',
  });
  return Response.json(result);
}
```

#### Globally for all requests in your application

The Vercel AI Gateway is the default provider for the AI SDK when a model is specified as a string. You can set a different provider as the default by assigning the provider instance to the `globalThis.AI_SDK_DEFAULT_PROVIDER` variable.

This is intended to be done in a file that runs before any other AI SDK calls. In the case of a Next.js application, you can do this in [`instrumentation.ts`](https://nextjs.org/docs/app/guides/instrumentation):

```typescript filename="instrumentation.ts" {1, 5}
import { openai } from '@ai-sdk/openai';

export async function register() {
  // This runs once when the Node.js runtime starts
  globalThis.AI_SDK_DEFAULT_PROVIDER = openai;

  // You can also do other initialization here
  console.log('App initialization complete');
}
```

Then, you can use the `generateText` function without specifying the provider in each call.

```typescript filename="app/api/chat/route.ts" {13}
import { generateText } from 'ai';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get('prompt');

  if (!prompt) {
    return Response.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const result = await generateText({
    model: 'openai/gpt-5.2',
    prompt,
  });

  return Response.json(result);
}
```

### Embedding models

Generate vector embeddings for semantic search, similarity matching, and retrieval-augmented generation (RAG).

#### Single value

```typescript filename="app/api/embed/route.ts" {5-7}
import { embed } from 'ai';

export async function GET() {
  const result = await embed({
    model: 'openai/text-embedding-3-small',
    value: 'Sunny day at the beach',
  });

  return Response.json(result);
}
```

#### Multiple values

```typescript filename="app/api/embed/route.ts" {5-7}
import { embedMany } from 'ai';

export async function GET() {
  const result = await embedMany({
    model: 'openai/text-embedding-3-small',
    values: ['Sunny day at the beach', 'Cloudy city skyline'],
  });

  return Response.json(result);
}
```

#### Gateway provider instance

Alternatively, if you're using the Gateway provider instance, specify embedding models with `gateway.textEmbeddingModel(...)`.

```typescript filename="app/api/embed/route.ts" {2,6}
import { embed } from 'ai';
import { gateway } from '@ai-sdk/gateway';

export async function GET() {
  const result = await embed({
    model: gateway.textEmbeddingModel('openai/text-embedding-3-small'),
    value: 'Sunny day at the beach',
  });

  return Response.json(result);
}
```

### Dynamic model discovery

You can programmatically discover all available models and their pricing through the AI SDK or REST API.

#### Using AI SDK

The `getAvailableModels` function retrieves detailed information about
all models configured for the `gateway` provider, including each model's `id`, `name`, `description`, and `pricing` details.

```typescript filename="app/api/chat/route.ts" {4}
import { gateway } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const availableModels = await gateway.getAvailableModels();

availableModels.models.forEach((model) => {
  console.log(`${model.id}: ${model.name}`);
  if (model.description) {
    console.log(`  Description: ${model.description}`);
  }
  if (model.pricing) {
    console.log(`  Input: $${model.pricing.input}/token`);
    console.log(`  Output: $${model.pricing.output}/token`);

    // Some models have tiered pricing based on context size
    if (model.pricing.inputTiers) {
      console.log('  Input tiers:');
      model.pricing.inputTiers.forEach((tier) => {
        const range =
          tier.max !== undefined ? `${tier.min}-${tier.max}` : `${tier.min}+`;
        console.log(`    ${range} tokens: $${tier.cost}/token`);
      });
    }

    if (model.pricing.cachedInputTokens) {
      console.log(
        `  Cached input (read): $${model.pricing.cachedInputTokens}/token`,
      );
    }
    if (model.pricing.cacheCreationInputTokens) {
      console.log(
        `  Cache creation (write): $${model.pricing.cacheCreationInputTokens}/token`,
      );
    }
  }
});

const { text } = await generateText({
  model: availableModels.models[0].id, // e.g., 'openai/gpt-5.2'
  prompt: 'Hello world',
});
```

#### Using REST API

You can also query the models endpoint directly via REST. This endpoint follows the OpenAI models API format and requires no authentication:

```
GET /v1/models
```

```typescript filename="discover-models.ts"
const response = await fetch('https://ai-gateway.vercel.sh/v1/models');
const { data: models } = await response.json();

models.forEach((model) => {
  console.log(`${model.id}: ${model.name}`);
  console.log(`  Type: ${model.type}`);
  console.log(`  Context window: ${model.context_window} tokens`);
  console.log(`  Max output: ${model.max_tokens} tokens`);
  if (model.pricing) {
    if (model.pricing.input) {
      console.log(`  Input: $${model.pricing.input}/token`);
    }
    if (model.pricing.output) {
      console.log(`  Output: $${model.pricing.output}/token`);
    }

    // Some models have tiered pricing based on context size
    if (model.pricing.input_tiers) {
      console.log('  Input tiers:');
      model.pricing.input_tiers.forEach((tier) => {
        const range =
          tier.max !== undefined ? `${tier.min}-${tier.max}` : `${tier.min}+`;
        console.log(`    ${range} tokens: $${tier.cost}/token`);
      });
    }

    if (model.pricing.image) {
      console.log(`  Per image: $${model.pricing.image}`);
    }
  }
});
```

##### Response format

```json
{
  "object": "list",
  "data": [
    {
      "id": "google/gemini-3-pro",
      "object": "model",
      "created": 1755815280,
      "owned_by": "google",
      "name": "Gemini 3 Pro",
      "description": "This model improves upon Gemini 2.5 Pro and is catered towards challenging tasks, especially those involving complex reasoning or agentic workflows.",
      "context_window": 1000000,
      "max_tokens": 64000,
      "type": "language",
      "tags": ["file-input", "tool-use", "reasoning", "vision"],
      "pricing": {
        "input": "0.000002",
        "input_tiers": [
          { "cost": "0.000002", "min": 0, "max": 200001 },
          { "cost": "0.000004", "min": 200001 }
        ],
        "output": "0.000012",
        "output_tiers": [
          { "cost": "0.000012", "min": 0, "max": 200001 },
          { "cost": "0.000018", "min": 200001 }
        ],
        "input_cache_read": "0.0000002",
        "input_cache_read_tiers": [
          { "cost": "0.0000002", "min": 0, "max": 200001 },
          { "cost": "0.0000004", "min": 200001 }
        ],
        "input_cache_write": "0.000002",
        "input_cache_write_tiers": [
          { "cost": "0.000002", "min": 0, "max": 200001 },
          { "cost": "0.000004", "min": 200001 }
        ]
      }
    }
  ]
}
```

##### Response fields

| Field                                    | Type     | Description                                                    |
| ---------------------------------------- | -------- | -------------------------------------------------------------- |
| `object`                                 | string   | Always `"list"`                                                |
| `data`                                   | array    | Array of available models                                      |
| `data[].id`                              | string   | Model identifier (e.g., `openai/gpt-5.2`)                      |
| `data[].object`                          | string   | Always `"model"`                                               |
| `data[].created`                         | integer  | Unix timestamp when the model was added                        |
| `data[].owned_by`                        | string   | Model provider/owner                                           |
| `data[].name`                            | string   | Human-readable model name                                      |
| `data[].description`                     | string   | Model description                                              |
| `data[].context_window`                  | integer  | Maximum context length in tokens                               |
| `data[].max_tokens`                      | integer  | Maximum output tokens                                          |
| `data[].type`                            | string   | Model type: `language`, `embedding`, `image`, or `video`       |
| `data[].tags`                            | string\[] | Capability tags (e.g., `reasoning`, `tool-use`, `vision`)      |
| `data[].pricing`                         | object   | Pricing information (structure varies by model type)           |
| `data[].pricing.input`                   | string   | Base cost per input token (language and embedding models)      |
| `data[].pricing.input_tiers`             | array    | Tiered pricing for input tokens based on token count           |
| `data[].pricing.input_tiers[].cost`      | string   | Cost per token for this tier                                   |
| `data[].pricing.input_tiers[].min`       | integer  | Minimum token count for this tier (inclusive)                  |
| `data[].pricing.input_tiers[].max`       | integer  | Maximum token count for this tier (exclusive, omitted if none) |
| `data[].pricing.output`                  | string   | Base cost per output token (language models only)              |
| `data[].pricing.output_tiers`            | array    | Tiered pricing for output tokens based on token count          |
| `data[].pricing.output_tiers[].cost`     | string   | Cost per token for this tier                                   |
| `data[].pricing.output_tiers[].min`      | integer  | Minimum token count for this tier (inclusive)                  |
| `data[].pricing.output_tiers[].max`      | integer  | Maximum token count for this tier (exclusive, omitted if none) |
| `data[].pricing.input_cache_read`        | string   | Base cost per cached input token when reading from cache       |
| `data[].pricing.input_cache_read_tiers`  | array    | Tiered pricing for cache reads based on token count            |
| `data[].pricing.input_cache_write`       | string   | Base cost per input token when writing to cache                |
| `data[].pricing.input_cache_write_tiers` | array    | Tiered pricing for cache writes based on token count           |
| `data[].pricing.image`                   | string   | Cost per generated image (image models only)                   |
| `data[].pricing.web_search`              | string   | Cost per web search request                                    |

#### Get provider endpoints for a model

For models available through multiple providers, you can query for all available provider endpoints. This returns detailed pricing and capability information for each provider:

```
GET /v1/models/{creator}/{model}/endpoints
```

```typescript filename="endpoints.ts"
const response = await fetch(
  'https://ai-gateway.vercel.sh/v1/models/google/gemini-3-pro/endpoints',
);
const { data } = await response.json();

console.log(`Model: ${data.name}`);
console.log(`Modality: ${data.architecture.modality}`);
console.log(`Input Modalities: ${data.architecture.input_modalities.join(', ')}`);
console.log(`Output Modalities: ${data.architecture.output_modalities.join(', ')}`);
console.log(`\nAvailable from ${data.endpoints.length} provider(s):`);

data.endpoints.forEach((endpoint) => {
  console.log(`\n  ${endpoint.provider_name}:`);
  console.log(`    Context: ${endpoint.context_length} tokens`);
  console.log(`    Prompt: $${endpoint.pricing.prompt}/token`);
  console.log(`    Completion: $${endpoint.pricing.completion}/token`);
  console.log(`    Parameters: ${endpoint.supported_parameters.join(', ')}`);

  if (endpoint.pricing.prompt_tiers) {
    console.log('    Prompt tiers:');
    endpoint.pricing.prompt_tiers.forEach((tier) => {
      const range =
        tier.max !== undefined ? `${tier.min}-${tier.max}` : `${tier.min}+`;
      console.log(`      ${range} tokens: $${tier.cost}/token`);
    });
  }
});
```

##### Response format

```json
{
  "data": {
    "id": "google/gemini-3-pro",
    "name": "Gemini 3 Pro",
    "created": 1755815280,
    "description": "This model improves upon Gemini 2.5 Pro and is catered towards challenging tasks, especially those involving complex reasoning or agentic workflows.",
    "architecture": {
      "tokenizer": null,
      "instruct_type": null,
      "modality": "text+image+file→text",
      "input_modalities": ["text", "image", "file"],
      "output_modalities": ["text"]
    },
    "endpoints": [
      {
        "name": "google | google/gemini-3-pro",
        "model_name": "Gemini 3 Pro",
        "context_length": 1000000,
        "pricing": {
          "prompt": "0.000002",
          "prompt_tiers": [
            { "cost": "0.000002", "min": 0, "max": 200001 },
            { "cost": "0.000004", "min": 200001 }
          ],
          "completion": "0.000012",
          "completion_tiers": [
            { "cost": "0.000012", "min": 0, "max": 200001 },
            { "cost": "0.000018", "min": 200001 }
          ],
          "request": "0",
          "image": "0",
          "image_output": "0",
          "web_search": "0",
          "internal_reasoning": "0",
          "input_cache_read": "0.0000002",
          "input_cache_read_tiers": [
            { "cost": "0.0000002", "min": 0, "max": 200001 },
            { "cost": "0.0000004", "min": 200001 }
          ],
          "input_cache_write": "0.000002",
          "input_cache_write_tiers": [
            { "cost": "0.000002", "min": 0, "max": 200001 },
            { "cost": "0.000004", "min": 200001 }
          ],
          "discount": 0
        },
        "provider_name": "google",
        "tag": "google",
        "quantization": null,
        "max_completion_tokens": 64000,
        "max_prompt_tokens": null,
        "supported_parameters": ["max_tokens", "temperature", "stop", "tools", "tool_choice", "reasoning", "include_reasoning"],
        "status": 0,
        "uptime_last_30m": null,
        "supports_implicit_caching": false
      }
    ]
  }
}
```

##### Response fields

| Field                                              | Type     | Description                                            |
| -------------------------------------------------- | -------- | ------------------------------------------------------ |
| `data.id`                                          | string   | Model identifier (e.g., `google/gemini-3-pro`)         |
| `data.name`                                        | string   | Human-readable model name                              |
| `data.created`                                     | integer  | Unix timestamp when the model was added                |
| `data.description`                                 | string   | Model description                                      |
| `data.architecture`                                | object   | Model architecture details                             |
| `data.architecture.modality`                       | string   | Input/output modality string (e.g., `text+image→text`) |
| `data.architecture.input_modalities`               | string\[] | Supported input types (`text`, `image`, `file`)        |
| `data.architecture.output_modalities`              | string\[] | Supported output types (`text`, `image`)               |
| `data.endpoints`                                   | array    | Array of provider endpoints                            |
| `data.endpoints[].name`                            | string   | Endpoint name (e.g., `google \| google/gemini-3-pro`)  |
| `data.endpoints[].provider_name`                   | string   | Provider name (e.g., `google`, `anthropic`)            |
| `data.endpoints[].context_length`                  | integer  | Maximum context window in tokens                       |
| `data.endpoints[].max_completion_tokens`           | integer  | Maximum output tokens                                  |
| `data.endpoints[].pricing.prompt`                  | string   | Cost per prompt token                                  |
| `data.endpoints[].pricing.prompt_tiers`            | array    | Tiered pricing for prompt tokens (if applicable)       |
| `data.endpoints[].pricing.completion`              | string   | Cost per completion token                              |
| `data.endpoints[].pricing.completion_tiers`        | array    | Tiered pricing for completion tokens (if applicable)   |
| `data.endpoints[].pricing.input_cache_read`        | string   | Cost per cached input token (read)                     |
| `data.endpoints[].pricing.input_cache_read_tiers`  | array    | Tiered pricing for cache reads (if applicable)         |
| `data.endpoints[].pricing.input_cache_write`       | string   | Cost per input token (cache write)                     |
| `data.endpoints[].pricing.input_cache_write_tiers` | array    | Tiered pricing for cache writes (if applicable)        |
| `data.endpoints[].supported_parameters`            | string\[] | API parameters supported by this endpoint              |
| `data.endpoints[].supports_implicit_caching`       | boolean  | Whether provider supports automatic caching            |
| `data.endpoints[].status`                          | integer  | Endpoint status: `0` = active                          |

##### Tiered pricing

Some models have tiered pricing based on context size. When tiered pricing is available, the `*_tiers` arrays contain pricing tiers with:

| Field  | Type   | Description                                                   |
| ------ | ------ | ------------------------------------------------------------- |
| `cost` | string | Cost per token for this tier                                  |
| `min`  | number | Minimum token count (inclusive)                               |
| `max`  | number | Maximum token count (exclusive), omitted for the highest tier |

For example, a model with tiered prompt pricing might charge `$0.000002/token` for prompts up to 200K tokens, and `$0.000004/token` for prompts exceeding 200K tokens.

#### Filtering models by type

You can filter the available models by their type to separate language models, embedding models, image models, and video models:

```typescript filename="app/api/models/route.ts"
// Using AI SDK
import { gateway } from '@ai-sdk/gateway';

const { models } = await gateway.getAvailableModels();
const textModels = models.filter((m) => m.modelType === 'language');
const embeddingModels = models.filter((m) => m.modelType === 'embedding');
const imageModels = models.filter((m) => m.modelType === 'image');
const videoModels = models.filter((m) => m.modelType === 'video');
```

```typescript filename="filter-models-rest.ts"
// Using REST API
const response = await fetch('https://ai-gateway.vercel.sh/v1/models');
const { data: models } = await response.json();

const textModels = models.filter((m) => m.type === 'language');
const embeddingModels = models.filter((m) => m.type === 'embedding');
const imageModels = models.filter((m) => m.type === 'image');
const videoModels = models.filter((m) => m.type === 'video');
```


---

[View full sitemap](/docs/sitemap)
