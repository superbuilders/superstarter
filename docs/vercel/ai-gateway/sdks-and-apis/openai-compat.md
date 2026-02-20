---
title: OpenAI-Compatible API
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openai-compat
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/openai-compat/chat-completions
  - /docs/ai-gateway/openai-compat/tool-calls
  - /docs/ai-gateway/openai-compat/structured-outputs
  - /docs/ai-gateway/openai-compat/embeddings
  - /docs/ai-gateway/openai-compat/advanced
summary: Use OpenAI-compatible API endpoints with the AI Gateway for seamless integration with existing tools and libraries.
---

# OpenAI-Compatible API

AI Gateway provides OpenAI-compatible API endpoints, letting you use multiple AI providers through a familiar interface. You can use existing OpenAI client libraries, switch to the AI Gateway with a URL change, and keep your current tools and workflows without code rewrites.

The OpenAI-compatible API implements the same specification as the [OpenAI API](https://platform.openai.com/docs/api-reference/chat).

## Base URL

The OpenAI-compatible API is available at the following base URL:

```
https://ai-gateway.vercel.sh/v1
```

## Authentication

The OpenAI-compatible API supports the same authentication methods as the main AI Gateway:

- **API key**: Use your AI Gateway API key with the `Authorization: Bearer <token>` header
- **OIDC token**: Use your Vercel OIDC token with the `Authorization: Bearer <token>` header

You only need to use one of these forms of authentication. If an API key is specified it will take precedence over any OIDC token, even if the API key is invalid.

## Supported endpoints

The AI Gateway supports the following OpenAI-compatible endpoints:

- [`GET /models`](#list-models) - List available models
- [`GET /models/{model}`](#retrieve-model) - Retrieve a specific model
- [`POST /chat/completions`](/docs/ai-gateway/openai-compat/chat-completions) - Create chat completions with support for streaming, attachments, [tool calls](/docs/ai-gateway/openai-compat/tool-calls), and [structured outputs](/docs/ai-gateway/openai-compat/structured-outputs)
- [`POST /embeddings`](/docs/ai-gateway/openai-compat/embeddings) - Generate vector embeddings

For advanced features, see:

- [Advanced configuration](/docs/ai-gateway/openai-compat/advanced) - Reasoning, provider options, model fallbacks, BYOK, and prompt caching
- [Image generation](/docs/ai-gateway/openai-compat/image-generation) - Generate images using multimodal models
- [Direct REST API usage](/docs/ai-gateway/openai-compat/rest-api) - Use the API without client libraries

## Integration with existing tools

You can use the AI Gateway's OpenAI-compatible API with existing tools and
libraries like the [OpenAI client libraries](https://platform.openai.com/docs/libraries) and [AI SDK](https://ai-sdk.dev/). Point your existing
client to the AI Gateway's base URL and use your AI Gateway [API key](/docs/ai-gateway/authentication#api-key) or [OIDC token](/docs/ai-gateway/authentication#oidc-token) for authentication.

### OpenAI client libraries

#### TypeScript

```typescript filename="client.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const response = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [{ role: 'user', content: 'Hello, world!' }],
});
```

#### Python

```python filename="client.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {'role': 'user', 'content': 'Hello, world!'}
    ]
)
```

### AI SDK

For compatibility with [AI SDK](https://ai-sdk.dev/) and AI Gateway, install the [@ai-sdk/openai-compatible](https://ai-sdk.dev/providers/openai-compatible-providers) package.

```typescript filename="client.ts"
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText } from 'ai';

const gateway = createOpenAICompatible({
  name: 'openai',
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const response = await generateText({
  model: gateway('anthropic/claude-sonnet-4.5'),
  prompt: 'Hello, world!',
});
```

## List models

Retrieve a list of all available models that can be used with the AI Gateway.

Endpoint

```
GET /models
```

Example request

#### TypeScript

```typescript filename="list-models.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const models = await openai.models.list();
console.log(models);
```

#### Python

```python filename="list-models.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

models = client.models.list()
print(models)
```

Response format

The response follows the OpenAI API format:

```json
{
  "object": "list",
  "data": [
    {
      "id": "anthropic/claude-sonnet-4.5",
      "object": "model",
      "created": 1677610602,
      "owned_by": "anthropic"
    },
    {
      "id": "openai/gpt-5.2",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    }
  ]
}
```

## Retrieve model

Retrieve details about a specific model.

Endpoint

```
GET /models/{model}
```

Parameters

- `model` (required): The model ID to retrieve (e.g., `anthropic/claude-sonnet-4`)

Example request

#### TypeScript

```typescript filename="retrieve-model.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const model = await openai.models.retrieve('anthropic/claude-sonnet-4.5');
console.log(model);
```

#### Python

```python filename="retrieve-model.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

model = client.models.retrieve('anthropic/claude-sonnet-4.5')
print(model)
```

Response format

```json
{
  "id": "anthropic/claude-sonnet-4.5",
  "object": "model",
  "created": 1677610602,
  "owned_by": "anthropic"
}
```

## Error handling

The API returns standard HTTP status codes and error responses:

### Common error codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Model or endpoint not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error response format

```json
{
  "error": {
    "message": "Invalid request: missing required parameter 'model'",
    "type": "invalid_request_error",
    "param": "model",
    "code": "missing_parameter"
  }
}
```


---

[View full sitemap](/docs/sitemap)
