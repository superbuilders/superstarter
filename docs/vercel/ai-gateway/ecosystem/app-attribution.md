---
title: App Attribution
product: vercel
url: /docs/ai-gateway/ecosystem/app-attribution
type: integration
prerequisites:
  - /docs/ai-gateway/ecosystem
  - /docs/ai-gateway
related:
  []
summary: Attribute your requests so Vercel can identify and feature your app on AI Gateway pages
---

# App Attribution

App attribution allows Vercel to identify the application making a request
through AI Gateway. When provided, your app can be featured on AI Gateway pages,
driving awareness.

> **💡 Note:** App Attribution is optional. If you do not send these headers, your requests
> will work normally.

## How it works

AI Gateway reads two request headers when present:

- `http-referer`: The URL of the page or site making the request.
- `x-title`: A human‑readable name for your app (for example, *"Acme Chat"*).

You can set these headers directly in your server-side requests to AI Gateway.

## Examples

#### \[&#xA;    'TypeScript (AI SDK)'

```typescript filename="ai-sdk.ts"
import { streamText } from 'ai';

const result = streamText({
  headers: {
    'http-referer': 'https://myapp.vercel.app',
    'x-title': 'MyApp',
  },
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'Hello, world!',
});

for await (const part of result.textStream) {
  process.stdout.write(part);
}
```

#### 'TypeScript (OpenAI)'

```typescript filename="openai.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const response = await openai.chat.completions.create(
  {
    model: 'anthropic/claude-sonnet-4.5',
    messages: [
      {
        role: 'user',
        content: 'Hello, world!',
      },
    ],
  },
  {
    headers: {
      'http-referer': 'https://myapp.vercel.app',
      'x-title': 'MyApp',
    },
  },
);

console.log(response.choices[0].message.content);
```

#### 'Python (OpenAI)'

```python filename="openai.py"
import os
from openai import OpenAI

client = OpenAI(
  api_key=os.getenv('AI_GATEWAY_API_KEY'),
  base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': 'Hello, world!',
        },
    ],
    extra_headers={
        'http-referer': 'https://myapp.vercel.app',
        'x-title': 'MyApp',
    },
)

print(response.choices[0].message.content)
```

## Setting headers at the provider level

You can also configure attribution headers when you create the AI Gateway
provider instance. This way, the headers are automatically included in
all requests without needing to specify them for each function call.

```typescript filename="provider-level.ts"
import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  headers: {
    'http-referer': 'https://myapp.vercel.app',
    'x-title': 'MyApp',
  },
});

const result = streamText({
  model: gateway('anthropic/claude-sonnet-4.5'),
  prompt: 'Hello, world!',
});

for await (const part of result.textStream) {
  process.stdout.write(part);
}
```

## Using the Global Default Provider

You can also use the AI SDK's [global provider configuration](https://ai-sdk.dev/docs/ai-sdk-core/provider-management#global-provider-configuration) to set your custom provider instance as the default. This allows you to use plain string model IDs throughout your application while automatically including your attribution headers.

```typescript filename="global-provider.ts"
import { streamText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

const gateway = createGateway({
  headers: {
    'http-referer': 'https://myapp.vercel.app',
    'x-title': 'MyApp',
  },
});

// Set your provider as the default to allow plain-string model id creation with this instance
globalThis.AI_SDK_DEFAULT_PROVIDER = gateway;

// Now you can use plain string model IDs and they'll use your custom provider
const result = streamText({
  model: 'anthropic/claude-sonnet-4.5', // Uses the gateway provider with headers
  prompt: 'Hello, world!',
});

for await (const part of result.textStream) {
  process.stdout.write(part);
}
```


---

[View full sitemap](/docs/sitemap)
