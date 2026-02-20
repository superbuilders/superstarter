---
title: AI Gateway
product: vercel
url: /docs/ai-gateway
type: integration
prerequisites:
  []
related:
  - /docs/ai-gateway/getting-started
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
  - /docs/ai-gateway/ecosystem/framework-integrations
  - /docs/ai-gateway/authentication-and-byok/byok
summary: TypeScript toolkit for building AI-powered applications with React, Next.js, Vue, Svelte and Node.js
---

# AI Gateway

> **🔒 Permissions Required**: AI Gateway

The [AI Gateway](https://vercel.com/ai-gateway) provides a unified API to access [hundreds of models](https://vercel.com/ai-gateway/models) through a single endpoint.
It gives you the ability to set budgets, monitor usage, load-balance requests, and manage fallbacks.

The design allows it to work seamlessly with [AI SDK v5 and v6](/docs/ai-gateway/getting-started), [OpenAI SDK](/docs/ai-gateway/sdks-and-apis/openai-compat), [Anthropic SDK](/docs/ai-gateway/sdks-and-apis/anthropic-compat), or your [preferred framework](/docs/ai-gateway/ecosystem/framework-integrations).

## Key features

- **One key, hundreds of models**: access models from multiple providers with a single API key
- **Unified API**: helps you switch between providers and models with minimal code changes
- **High reliability**: automatically retries requests to other providers if one fails
- **Embeddings support**: generate vector embeddings for search, retrieval, and other tasks
- **Spend monitoring**: monitor your spending across different providers
- **No markup on tokens**: tokens cost the same as they would from the provider directly, with zero markup, including with [Bring Your Own Key (BYOK)](/docs/ai-gateway/authentication-and-byok/byok).

#### TypeScript

```typescript filename="index.ts" {4}
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'What is the capital of France?',
});

```

#### Python

```python filename="index.py" {10}
import os
from openai import OpenAI

client = OpenAI(
  api_key=os.getenv('AI_GATEWAY_API_KEY'),
  base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
  model='xai/grok-4',
  messages=[
    {
      'role': 'user',
      'content': 'Why is the sky blue?'
    }
  ]
)
```

#### cURL

```bash filename="index.sh" {5}
curl -X POST "https://ai-gateway.vercel.sh/v1/chat/completions" \
-H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
-H "Content-Type: application/json" \
-d '{
  "model": "openai/gpt-5.2",
  "messages": [
    {
      "role": "user",
      "content": "Why is the sky blue?"
    }
  ],
  "stream": false
}'
```

## More resources

- [Getting started with AI Gateway](/docs/ai-gateway/getting-started)
- [Models and providers](/docs/ai-gateway/models-and-providers)
- [Provider options (routing & fallbacks)](/docs/ai-gateway/models-and-providers/provider-options)
- [Web search](/docs/ai-gateway/capabilities/web-search)
- [Observability](/docs/ai-gateway/capabilities/observability)
- [Claude Code](/docs/agent-resources/coding-agents/claude-code)
- [Anthropic compatibility](/docs/ai-gateway/sdks-and-apis/anthropic-compat)
- [OpenAI compatibility](/docs/ai-gateway/sdks-and-apis/openai-compat)
- [Usage and billing](/docs/ai-gateway/capabilities/usage)
- [Authentication](/docs/ai-gateway/authentication-and-byok/authentication)
- [Bring your own key](/docs/ai-gateway/authentication-and-byok/byok)
- [Framework integrations](/docs/ai-gateway/ecosystem/framework-integrations)
- [App attribution](/docs/ai-gateway/ecosystem/app-attribution)


---

[View full sitemap](/docs/sitemap)
