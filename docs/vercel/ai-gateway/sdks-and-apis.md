---
title: SDKs & APIs
product: vercel
url: /docs/ai-gateway/sdks-and-apis
type: integration
prerequisites:
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis/openai-compat/chat-completions
  - /docs/ai-gateway/sdks-and-apis/openai-compat/tool-calls
  - /docs/ai-gateway/sdks-and-apis/openai-compat/embeddings
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
summary: Use the AI Gateway with various SDKs and API specifications including OpenAI, Anthropic, and OpenResponses.
---

# SDKs & APIs

AI Gateway provides drop-in compatible APIs that let you switch by changing a base URL. No code rewrites required. Use the same SDKs and tools you already know, with access to 200+ models from every major provider.

## Quick start

Point your existing SDK to the gateway:

#### OpenAI SDK

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const response = await client.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5', // Any available model
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

#### Anthropic SDK

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await client.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

#### cURL

```bash
curl https://ai-gateway.vercel.sh/v1/chat/completions \
  -H "Authorization: Bearer $AI_GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Why use these APIs?

- **No vendor lock-in**: Switch between Claude, GPT, Gemini, and other models without changing your code
- **Unified billing**: One invoice for all providers instead of managing multiple accounts
- **Built-in fallbacks**: Automatic retry with alternative providers if one fails
- **Streaming support**: Real-time responses with SSE across all compatible endpoints
- **Full feature parity**: Tool calling, structured outputs, vision, and embeddings work exactly as documented

## Available APIs

| API                                                                     | Best for                                             | Documentation                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI-Compatible](/docs/ai-gateway/sdks-and-apis/openai-compat)       | Existing OpenAI integrations, broad language support | [Chat](/docs/ai-gateway/sdks-and-apis/openai-compat/chat-completions), [Tools](/docs/ai-gateway/sdks-and-apis/openai-compat/tool-calls), [Embeddings](/docs/ai-gateway/sdks-and-apis/openai-compat/embeddings)       |
| [Anthropic-Compatible](/docs/ai-gateway/sdks-and-apis/anthropic-compat) | Claude Code, Anthropic SDK users                     | [Messages](/docs/ai-gateway/sdks-and-apis/anthropic-compat/messages), [Tools](/docs/ai-gateway/sdks-and-apis/anthropic-compat/tool-calls), [Files](/docs/ai-gateway/sdks-and-apis/anthropic-compat/file-attachments) |
| [OpenResponses](/docs/ai-gateway/sdks-and-apis/openresponses)           | New projects, provider-agnostic design               | [Streaming](/docs/ai-gateway/sdks-and-apis/openresponses/streaming), [Tools](/docs/ai-gateway/sdks-and-apis/openresponses/tool-calling), [Vision](/docs/ai-gateway/sdks-and-apis/openresponses/image-input)          |
| [Python](/docs/ai-gateway/sdks-and-apis/python)                         | Python developers                                    | [Async](/docs/ai-gateway/sdks-and-apis/python#async-support), [Streaming](/docs/ai-gateway/sdks-and-apis/python#streaming), [Frameworks](/docs/ai-gateway/sdks-and-apis/python#framework-integrations)               |

## Choosing an API

**Already using OpenAI?** Use the [OpenAI-Compatible API](/docs/ai-gateway/sdks-and-apis/openai-compat). Change your base URL and you're done.

**Using Claude Code or Anthropic SDK?** Use the [Anthropic-Compatible API](/docs/ai-gateway/sdks-and-apis/anthropic-compat) for native feature support.

**Starting fresh?** Consider the [OpenResponses API](/docs/ai-gateway/sdks-and-apis/openresponses) for a modern, provider-agnostic interface, or [AI SDK](/docs/ai-gateway/getting-started) for the best TypeScript experience.

## Next steps

- [Get your API key](/docs/ai-gateway/authentication-and-byok/authentication) to start making requests
- [Browse available models](/docs/ai-gateway/models-and-providers) to find the right model for your use case
- [Set up observability](/docs/ai-gateway/capabilities/observability) to monitor usage and debug requests


---

[View full sitemap](/docs/sitemap)
