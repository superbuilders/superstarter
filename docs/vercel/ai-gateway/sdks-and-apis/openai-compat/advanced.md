---
title: Advanced Configuration
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openai-compat/advanced
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  - /docs/ai-gateway/models-and-providers/provider-options
  - /docs/ai-gateway/authentication-and-byok/byok
summary: Configure reasoning, provider options, model fallbacks, BYOK credentials, and prompt caching.
---

# Advanced Configuration

## Reasoning configuration

Configure reasoning behavior for models that support extended thinking or chain-of-thought reasoning. The `reasoning` parameter allows you to control how reasoning tokens are generated and returned.

Example request

#### TypeScript

```typescript filename="reasoning-openai-sdk.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error - reasoning parameter not yet in OpenAI types
const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life? Think before answering.',
    },
  ],
  stream: false,
  reasoning: {
    max_tokens: 2000, // Limit reasoning tokens
    enabled: true, // Enable reasoning
  },
});

console.log('Reasoning:', completion.choices[0].message.reasoning);
console.log('Answer:', completion.choices[0].message.content);
console.log(
  'Reasoning tokens:',
  completion.usage.completion_tokens_details?.reasoning_tokens,
);
```

#### Python

```python filename="reasoning.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'What is the meaning of life? Think before answering.'
        }
    ],
    stream=False,
    extra_body={
        'reasoning': {
            'max_tokens': 2000,
            'enabled': True
        }
    }
)

print('Reasoning:', completion.choices[0].message.reasoning)
print('Answer:', completion.choices[0].message.content)
print('Reasoning tokens:', completion.usage.completion_tokens_details.reasoning_tokens)
```

#### Reasoning parameters

The `reasoning` object supports the following parameters:

- **`enabled`** (boolean, optional): Enable reasoning output. When `true`, the model will provide its reasoning process.

- **`max_tokens`** (number, optional): Maximum number of tokens to allocate for reasoning. This helps control costs and response times. Cannot be used with `effort`.

- **`effort`** (string, optional): Control reasoning effort level. Accepts:

  - `'none'` - Disables reasoning
  - `'minimal'` - ~10% of max\_tokens
  - `'low'` - ~20% of max\_tokens
  - `'medium'` - ~50% of max\_tokens
  - `'high'` - ~80% of max\_tokens
  - `'xhigh'` - ~95% of max\_tokens

  Cannot be used with `max_tokens`.

- **`exclude`** (boolean, optional): When `true`, excludes reasoning content from the response but still generates it internally. Useful for reducing response payload size.

> **💡 Note:** **Mutually exclusive parameters:** You cannot specify both `effort` and
> `max_tokens` in the same request. Choose one based on your use case.

#### Response format with reasoning

When reasoning is enabled, the response includes reasoning content:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "anthropic/claude-sonnet-4.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The meaning of life is a deeply personal question...",
        "reasoning": "Let me think about this carefully. The question asks about..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165,
    "completion_tokens_details": {
      "reasoning_tokens": 50
    }
  }
}
```

#### Streaming with reasoning

Reasoning content is streamed incrementally in the `delta.reasoning` field:

#### TypeScript

```typescript filename="reasoning-streaming.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error - reasoning parameter not yet in OpenAI types
const stream = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'What is the meaning of life? Think before answering.',
    },
  ],
  stream: true,
  reasoning: {
    enabled: true,
  },
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;

  // Handle reasoning content
  if (delta?.reasoning) {
    process.stdout.write(`[Reasoning] ${delta.reasoning}`);
  }

  // Handle regular content
  if (delta?.content) {
    process.stdout.write(delta.content);
  }
}
```

#### Python

```python filename="reasoning-streaming.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

stream = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'What is the meaning of life? Think before answering.'
        }
    ],
    stream=True,
    extra_body={
        'reasoning': {
            'enabled': True
        }
    }
)

for chunk in stream:
    if chunk.choices and chunk.choices[0].delta:
        delta = chunk.choices[0].delta

        # Handle reasoning content
        if hasattr(delta, 'reasoning') and delta.reasoning:
            print(f"[Reasoning] {delta.reasoning}", end='', flush=True)

        # Handle regular content
        if hasattr(delta, 'content') and delta.content:
            print(delta.content, end='', flush=True)
```

#### Preserving reasoning details across providers

The AI Gateway preserves reasoning details from models across interactions,
normalizing the different formats used by OpenAI, Anthropic, and other providers into a consistent structure.
This allows you to switch between models without rewriting your conversation management logic.

This is particularly useful during tool calling workflows where the model needs to
resume its thought process after receiving tool results.

**Controlling reasoning details**

When `reasoning.enabled` is `true` (or when `reasoning.exclude` is not set),
responses include a `reasoning_details` array alongside the standard `reasoning` text field.
This structured field captures cryptographic signatures, encrypted content, and other verification
data that providers include with their reasoning output.

Each detail object contains:

- **`type`**: one or more of the below, depending on the provider and model
  - `'reasoning.text'`: Contains the actual reasoning content as plain text in the `text` field. May include a `signature` field (Anthropic models) for cryptographic verification.
  - `'reasoning.encrypted'`: Contains encrypted or redacted reasoning content in the `data` field. Used by OpenAI models when reasoning is protected, or by Anthropic models when thinking is redacted. Preserves the encrypted payload for verification purposes.
  - `'reasoning.summary'`: Contains a condensed version of the reasoning process in the `summary` field. Used by OpenAI models to provide a readable summary alongside encrypted reasoning.
- **`id`** (optional): Unique identifier for the reasoning block, used for tracking and correlation
- **`format`**: Provider format identifier - `'openai-responses-v1'`, `'anthropic-claude-v1'`, or `'unknown'`
- **`index`** (optional): Position in the reasoning sequence (for responses with multiple reasoning blocks)

**Example response with reasoning details**

For Anthropic models:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "anthropic/claude-sonnet-4.5",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The meaning of life is a deeply personal question...",
        "reasoning": "Let me think about this carefully. The question asks about...",
        "reasoning_details": [
          {
            "type": "reasoning.text",
            "text": "Let me think about this carefully. The question asks about...",
            "signature": "anthropic-signature-xyz",
            "format": "anthropic-claude-v1",
            "index": 0
          }
        ]
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165,
    "completion_tokens_details": {
      "reasoning_tokens": 50
    }
  }
}
```

For OpenAI models (returns both summary and encrypted):

```json
{
  "id": "chatcmpl-456",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "openai/o3-mini",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "The answer is 42.",
        "reasoning": "Let me calculate this step by step...",
        "reasoning_details": [
          {
            "type": "reasoning.summary",
            "summary": "Let me calculate this step by step...",
            "format": "openai-responses-v1",
            "index": 0
          },
          {
            "type": "reasoning.encrypted",
            "data": "encrypted_reasoning_content_xyz",
            "format": "openai-responses-v1",
            "index": 1
          }
        ]
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 150,
    "total_tokens": 165,
    "completion_tokens_details": {
      "reasoning_tokens": 50
    }
  }
}
```

**Streaming reasoning details**

When streaming, reasoning details are delivered incrementally in `delta.reasoning_details`:

For Anthropic models:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "anthropic/claude-sonnet-4.5",
  "choices": [
    {
      "index": 0,
      "delta": {
        "reasoning": "Let me think.",
        "reasoning_details": [
          {
            "type": "reasoning.text",
            "text": "Let me think.",
            "signature": "anthropic-signature-xyz",
            "format": "anthropic-claude-v1",
            "index": 0
          }
        ]
      },
      "finish_reason": null
    }
  ]
}
```

For OpenAI models (summary chunks during reasoning, then encrypted at end):

```json
{
  "id": "chatcmpl-456",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "openai/o3-mini",
  "choices": [
    {
      "index": 0,
      "delta": {
        "reasoning": "Step 1:",
        "reasoning_details": [
          {
            "type": "reasoning.summary",
            "summary": "Step 1:",
            "format": "openai-responses-v1",
            "index": 0
          }
        ]
      },
      "finish_reason": null
    }
  ]
}
```

#### Provider-specific behavior

The AI Gateway automatically maps reasoning parameters to each provider's native format:

- **OpenAI**: Maps `effort` to `reasoningEffort` and controls summary detail
- **Anthropic**: Maps `max_tokens` to thinking budget tokens
- **Google**: Maps to `thinkingConfig` with budget and visibility settings
- **Groq**: Maps `exclude` to control reasoning format (hidden/parsed)
- **xAI**: Maps `effort` to reasoning effort levels
- **Other providers**: Generic mapping applied for compatibility

> **💡 Note:** **Automatic extraction:** For models that don't natively support reasoning
> output, the gateway automatically extracts reasoning
> from `<think>` tags in the response.

## Provider options

The AI Gateway can route your requests across multiple AI providers for better reliability and performance. You can control which providers are used and in what order through the `providerOptions` parameter.

Example request

#### TypeScript

```typescript filename="provider-options.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error
const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content:
        'Tell me the history of the San Francisco Mission-style burrito in two paragraphs.',
    },
  ],
  stream: false,
  // Provider options for gateway routing preferences
  providerOptions: {
    gateway: {
      order: ['vertex', 'anthropic'], // Try Vertex AI first, then Anthropic
    },
  },
});

console.log('Assistant:', completion.choices[0].message.content);
console.log('Tokens used:', completion.usage);
```

#### Python

```python filename="provider-options.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'Tell me the history of the San Francisco Mission-style burrito in two paragraphs.'
        }
    ],
    stream=False,
    # Provider options for gateway routing preferences
    extra_body={
        'providerOptions': {
            'gateway': {
                'order': ['vertex', 'anthropic']  # Try Vertex AI first, then Anthropic
            }
        }
    }
)

print('Assistant:', completion.choices[0].message.content)
print('Tokens used:', completion.usage)
```

> **💡 Note:** **Provider routing:** In this example, the gateway will first attempt to use
> Vertex AI to serve the Claude model. If Vertex AI is unavailable or fails, it
> will fall back to Anthropic. Other providers are still available but will only
> be used after the specified providers.

#### Model fallbacks

You can specify fallback models that will be tried in order if the primary model fails. There are two ways to do this:

##### Option 1: Direct `models` field

The simplest way is to use the `models` field directly at the top level of your request:

#### TypeScript

```typescript filename="model-fallbacks.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-5.2', // Primary model
  // @ts-ignore - models is a gateway extension
  models: ['anthropic/claude-sonnet-4.5', 'google/gemini-3-pro'], // Fallback models
  messages: [
    {
      role: 'user',
      content: 'Write a haiku about TypeScript.',
    },
  ],
  stream: false,
});

console.log('Assistant:', completion.choices[0].message.content);

// Check which model was actually used
console.log('Model used:', completion.model);
```

#### Python

```python filename="model-fallbacks.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='openai/gpt-5.2',  # Primary model
    messages=[
        {
            'role': 'user',
            'content': 'Write a haiku about TypeScript.'
        }
    ],
    stream=False,
    # models is a gateway extension for fallback models
    extra_body={
        'models': ['anthropic/claude-sonnet-4.5', 'google/gemini-3-pro']  # Fallback models
    }
)

print('Assistant:', completion.choices[0].message.content)

# Check which model was actually used
print('Model used:', completion.model)
```

##### Option 2: Via provider options

Alternatively, you can specify model fallbacks through the `providerOptions.gateway.models` field:

#### TypeScript

```typescript filename="model-fallbacks-provider-options.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error
const completion = await openai.chat.completions.create({
  model: 'openai/gpt-5.2', // Primary model
  messages: [
    {
      role: 'user',
      content: 'Write a haiku about TypeScript.',
    },
  ],
  stream: false,
  // Model fallbacks via provider options
  providerOptions: {
    gateway: {
      models: ['anthropic/claude-sonnet-4.5', 'google/gemini-3-pro'], // Fallback models
    },
  },
});

console.log('Assistant:', completion.choices[0].message.content);
console.log('Model used:', completion.model);
```

#### Python

```python filename="model-fallbacks-provider-options.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='openai/gpt-5.2',  # Primary model
    messages=[
        {
            'role': 'user',
            'content': 'Write a haiku about TypeScript.'
        }
    ],
    stream=False,
    # Model fallbacks via provider options
    extra_body={
        'providerOptions': {
            'gateway': {
                'models': ['anthropic/claude-sonnet-4.5', 'google/gemini-3-pro']  # Fallback models
            }
        }
    }
)

print('Assistant:', completion.choices[0].message.content)
print('Model used:', completion.model)
```

> **💡 Note:** **Which approach to use:** Both methods achieve the same result. Use the
> direct `models` field (Option 1) for simplicity, or use `providerOptions`
> (Option 2) if you're already using provider options for other configurations.

Both configurations will:

1. Try the primary model (`openai/gpt-4o`) first
2. If it fails, try `openai/gpt-5-nano`
3. If that also fails, try `gemini-2.0-flash`
4. Return the result from the first model that succeeds

#### Streaming with provider options

Provider options work with streaming requests as well:

#### TypeScript

```typescript filename="streaming-provider-options.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error
const stream = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content:
        'Tell me the history of the San Francisco Mission-style burrito in two paragraphs.',
    },
  ],
  stream: true,
  providerOptions: {
    gateway: {
      order: ['vertex', 'anthropic'],
    },
  },
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

#### Python

```python filename="streaming-provider-options.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

stream = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'Tell me the history of the San Francisco Mission-style burrito in two paragraphs.'
        }
    ],
    stream=True,
    extra_body={
        'providerOptions': {
            'gateway': {
                'order': ['vertex', 'anthropic']
            }
        }
    }
)

for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end='', flush=True)
```

For more details about available providers and advanced provider configuration, see the [Provider Options documentation](/docs/ai-gateway/models-and-providers/provider-options).

#### Request-scoped BYOK (Bring Your Own Key)

You can pass your own provider credentials on a per-request basis using the `byok` option in `providerOptions.gateway`. This allows you to use your existing provider accounts and access private resources without configuring credentials in the gateway settings.

Example request

#### TypeScript

```typescript filename="byok.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error - byok is a gateway extension
const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'Hello, world!',
    },
  ],
  providerOptions: {
    gateway: {
      byok: {
        anthropic: [{ apiKey: process.env.ANTHROPIC_API_KEY }],
      },
    },
  },
});

console.log(completion.choices[0].message.content);
```

#### Python

```python filename="byok.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'Hello, world!'
        }
    ],
    extra_body={
        'providerOptions': {
            'gateway': {
                'byok': {
                    'anthropic': [{'apiKey': os.getenv('ANTHROPIC_API_KEY')}]
                }
            }
        }
    }
)

print(completion.choices[0].message.content)
```

The `byok` option is a record where keys are provider slugs and values are arrays of credential objects. Each provider can have multiple credentials that are tried in order.

**Credential structure by provider:**

- **Anthropic**: `{ apiKey: string }`
- **OpenAI**: `{ apiKey: string }`
- **Google Vertex AI**: `{ project: string, location: string, googleCredentials: { privateKey: string, clientEmail: string } }`
- **Amazon Bedrock**: `{ accessKeyId: string, secretAccessKey: string, region?: string }`

For detailed credential parameters for each provider, see the [AI SDK providers documentation](https://ai-sdk.dev/providers/ai-sdk-providers).

**Multiple credentials example:**

```typescript
providerOptions: {
  gateway: {
    byok: {
      // Multiple credentials for the same provider (tried in order)
      vertex: [
        { project: 'proj-1', location: 'us-east5', googleCredentials: { privateKey: '...', clientEmail: '...' } },
        { project: 'proj-2', location: 'us-east5', googleCredentials: { privateKey: '...', clientEmail: '...' } },
      ],
      // Multiple providers
      anthropic: [{ apiKey: 'sk-ant-...' }],
    },
  },
},
```

> **💡 Note:** **Credential precedence:** When request-scoped BYOK credentials are provided,
> any cached BYOK credentials configured in the gateway settings are not
> considered. Requests may still fall back to system credentials if the provided
> credentials fail. For persistent BYOK configuration, see the [BYOK
> documentation](/docs/ai-gateway/authentication-and-byok/byok).

## Prompt caching

Anthropic Claude models support prompt caching, which can significantly reduce costs and latency for repeated prompts. You can enable caching automatically or manually.

### Automatic caching

Some providers like Anthropic require explicit cache control markers to enable prompt caching, while others like OpenAI, Google, and DeepSeek cache automatically (sometimes called "implicit caching"). Use `caching: 'auto'` to let AI Gateway handle this for you - it applies the appropriate caching strategy based on the provider.

**Default behavior**: When `caching` is not set, AI Gateway passes your request through without modification. Providers with implicit caching (OpenAI, Google, DeepSeek) will still cache automatically. For Anthropic, you'll need to set `caching: 'auto'` or manually add `cache_control` markers to your messages.

#### TypeScript

```typescript filename="auto-caching.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// @ts-expect-error - providerOptions is a gateway extension
const response = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'system',
      content: 'You are a helpful assistant with access to a large knowledge base...',
    },
    {
      role: 'user',
      content: 'What is the capital of France?',
    },
  ],
  providerOptions: {
    gateway: {
      caching: 'auto',
    },
  },
});

console.log(response.choices[0].message.content);
```

#### Python

```python filename="auto-caching.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'system',
            'content': 'You are a helpful assistant with access to a large knowledge base...'
        },
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

print(response.choices[0].message.content)
```

When `caching: 'auto'` is set and the request routes to Anthropic models, AI Gateway adds a `cache_control` breakpoint at the end of your static content.

> **💡 Note:** **Supported providers:** Automatic caching works with Anthropic models served
> directly by Anthropic or through Vertex AI. Bedrock is not yet supported for
> automatic caching.

### Manual caching

For fine-grained control, you can manually mark content with `cache_control`:

#### TypeScript

```typescript filename="prompt-caching.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const response = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'Analyze this document and summarize the key points.',
      cache_control: {
        type: 'ephemeral',
      },
    },
  ],
});

console.log(response.choices[0].message.content);
```

#### Python

```python filename="prompt-caching.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'Analyze this document and summarize the key points.',
            'cache_control': {
                'type': 'ephemeral'
            }
        }
    ]
)

print(response.choices[0].message.content)
```

> **💡 Note:** **Cache control types:** The `ephemeral` cache type stores content for the
> duration of the session. This is useful for large system prompts, documents,
> or context that you want to reuse across multiple requests. Prompt caching
> works with Anthropic models across all supported providers (Anthropic, Vertex
> AI, and Bedrock). For more details, see [Anthropic's prompt caching
> documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).


---

[View full sitemap](/docs/sitemap)
