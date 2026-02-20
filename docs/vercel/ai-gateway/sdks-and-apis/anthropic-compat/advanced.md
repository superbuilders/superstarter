---
title: Advanced Features
product: vercel
url: /docs/ai-gateway/sdks-and-apis/anthropic-compat/advanced
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  []
summary: Advanced Anthropic API features including extended thinking and web search.
---

# Advanced Features

## Extended thinking

Configure extended thinking for models that support chain-of-thought reasoning. The `thinking` parameter allows you to control how reasoning tokens are generated and returned.

Example request

#### TypeScript

```typescript filename="thinking.ts"
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const anthropic = new Anthropic({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await anthropic.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 2048,
  thinking: {
    type: 'enabled',
    budget_tokens: 5000,
  },
  messages: [
    {
      role: 'user',
      content: 'Explain quantum entanglement in simple terms.',
    },
  ],
});

for (const block of message.content) {
  if (block.type === 'thinking') {
    console.log('🧠 Thinking:', block.thinking);
  } else if (block.type === 'text') {
    console.log('💬 Response:', block.text);
  }
}
```

#### Python

```python filename="thinking.py"
import os
import anthropic

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = anthropic.Anthropic(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=2048,
    thinking={
        'type': 'enabled',
        'budget_tokens': 5000,
    },
    messages=[
        {
            'role': 'user',
            'content': 'Explain quantum entanglement in simple terms.'
        }
    ],
)

for block in message.content:
    if block.type == 'thinking':
        print('🧠 Thinking:', block.thinking)
    elif block.type == 'text':
        print('💬 Response:', block.text)
```

### Thinking parameters

- **`type`**: Set to `'enabled'` to enable extended thinking
- **`budget_tokens`**: Maximum number of tokens to allocate for thinking

### Response with thinking

When thinking is enabled, the response includes thinking blocks:

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me think about how to explain quantum entanglement...",
      "signature": "anthropic-signature-xyz"
    },
    {
      "type": "text",
      "text": "Quantum entanglement is like having two magic coins..."
    }
  ],
  "model": "anthropic/claude-sonnet-4.5",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 15,
    "output_tokens": 150
  }
}
```

## Web search

Use the built-in web search tool to give the model access to current information from the web.

Example request

#### TypeScript

```typescript filename="web-search.ts"
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const anthropic = new Anthropic({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await anthropic.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 2048,
  tools: [
    {
      type: 'web_search_20250305',
      name: 'web_search',
    },
  ],
  messages: [
    {
      role: 'user',
      content: 'What are the latest developments in quantum computing?',
    },
  ],
});

for (const block of message.content) {
  if (block.type === 'text') {
    console.log(block.text);
  } else if (block.type === 'web_search_tool_result') {
    console.log('Search results received');
  }
}
```

#### Python

```python filename="web-search.py"
import os
import anthropic

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = anthropic.Anthropic(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=2048,
    tools=[
        {
            'type': 'web_search_20250305',
            'name': 'web_search',
        }
    ],
    messages=[
        {
            'role': 'user',
            'content': 'What are the latest developments in quantum computing?'
        }
    ],
)

for block in message.content:
    if block.type == 'text':
        print(block.text)
    elif block.type == 'web_search_tool_result':
        print('Search results received')
```

## Automatic caching

Some providers like Anthropic require explicit cache control markers to enable prompt caching, while others like OpenAI, Google, and DeepSeek cache automatically (sometimes called "implicit caching"). Use `caching: 'auto'` in `providerOptions.gateway` to let AI Gateway handle this for you - it applies the appropriate caching strategy based on the provider.

**Default behavior**: When `caching` is not set, AI Gateway passes your request through without modification. For Anthropic, you'll need to set `caching: 'auto'` or manually add `cache_control` markers to your messages.

#### TypeScript

```typescript filename="auto-caching.ts"
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const anthropic = new Anthropic({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await anthropic.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 2048,
  system: 'You are a helpful assistant with access to a large knowledge base...',
  messages: [
    {
      role: 'user',
      content: 'What is the capital of France?',
    },
  ],
  // @ts-expect-error - providerOptions is a gateway extension
  providerOptions: {
    gateway: {
      caching: 'auto',
    },
  },
});

console.log(message.content[0].type === 'text' ? message.content[0].text : '');
```

#### Python

```python filename="auto-caching.py"
import os
import anthropic

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = anthropic.Anthropic(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=2048,
    system='You are a helpful assistant with access to a large knowledge base...',
    messages=[
        {
            'role': 'user',
            'content': 'What is the capital of France?'
        }
    ],
    extra_body={
        'providerOptions': {
            'gateway': {
                'caching': 'auto'
            }
        }
    }
)

print(message.content[0].text)
```

When `caching: 'auto'` is set, AI Gateway adds a `cache_control` breakpoint at the end of your static content.

> **💡 Note:** **Supported providers:** Automatic caching works with Anthropic models served
> directly by Anthropic or through Vertex AI. Bedrock is not yet supported for
> automatic caching.


---

[View full sitemap](/docs/sitemap)
