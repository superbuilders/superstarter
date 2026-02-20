---
title: Structured Outputs
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openai-compat/structured-outputs
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  []
summary: Generate structured JSON responses that conform to a specific schema using the OpenAI-compatible API.
---

# Structured Outputs

Generate structured JSON responses that conform to a specific schema, ensuring predictable and reliable data formats for your applications.

#### JSON Schema format

Use the OpenAI standard `json_schema` response format for the most robust structured output experience. This follows the official [OpenAI Structured Outputs specification](https://platform.openai.com/docs/guides/structured-outputs).

Example request

#### TypeScript

```typescript filename="structured-output-json-schema.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-5.2',
  messages: [
    {
      role: 'user',
      content: 'Create a product listing for a wireless gaming headset.',
    },
  ],
  stream: false,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'product_listing',
      description: 'A product listing with details and pricing',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Product name',
          },
          brand: {
            type: 'string',
            description: 'Brand name',
          },
          price: {
            type: 'number',
            description: 'Price in USD',
          },
          category: {
            type: 'string',
            description: 'Product category',
          },
          description: {
            type: 'string',
            description: 'Product description',
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key product features',
          },
        },
        required: ['name', 'brand', 'price', 'category', 'description'],
        additionalProperties: false,
      },
    },
  },
});

console.log('Assistant:', completion.choices[0].message.content);

// Parse the structured response
const structuredData = JSON.parse(completion.choices[0].message.content);
console.log('Structured Data:', structuredData);
```

#### Python

```python filename="structured-output-json-schema.py"
import os
import json
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='openai/gpt-5.2',
    messages=[
        {
            'role': 'user',
            'content': 'Create a product listing for a wireless gaming headset.'
        }
    ],
    stream=False,
    response_format={
        'type': 'json_schema',
        'json_schema': {
            'name': 'product_listing',
            'description': 'A product listing with details and pricing',
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {
                        'type': 'string',
                        'description': 'Product name'
                    },
                    'brand': {
                        'type': 'string',
                        'description': 'Brand name'
                    },
                    'price': {
                        'type': 'number',
                        'description': 'Price in USD'
                    },
                    'category': {
                        'type': 'string',
                        'description': 'Product category'
                    },
                    'description': {
                        'type': 'string',
                        'description': 'Product description'
                    },
                    'features': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Key product features'
                    }
                },
                'required': ['name', 'brand', 'price', 'category', 'description'],
                'additionalProperties': False
            },
        }
    }
)

print('Assistant:', completion.choices[0].message.content)

# Parse the structured response
structured_data = json.loads(completion.choices[0].message.content)
print('Structured Data:', json.dumps(structured_data, indent=2))
```

Response format

The response contains structured JSON that conforms to your specified schema:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "openai/gpt-5.2",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "{\"name\":\"SteelSeries Arctis 7P\",\"brand\":\"SteelSeries\",\"price\":149.99,\"category\":\"Gaming Headsets\",\"description\":\"Wireless gaming headset with 7.1 surround sound\",\"features\":[\"Wireless 2.4GHz\",\"7.1 Surround Sound\",\"24-hour battery\",\"Retractable microphone\"]}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 45,
    "total_tokens": 70
  }
}
```

#### JSON Schema parameters

- **`type`**: Must be `"json_schema"`
- **`json_schema`**: Object containing schema definition
  - **`name`** (required): Name of the response schema
  - **`description`** (optional): Human-readable description of the expected output
  - **`schema`** (required): Valid JSON Schema object defining the structure

#### Legacy JSON format (alternative)

> **💡 Note:** **Legacy format:** The following format is supported for backward
> compatibility. For new implementations, use the `json_schema` format above.

#### TypeScript

```typescript filename="structured-output-legacy.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const completion = await openai.chat.completions.create({
  model: 'openai/gpt-5.2',
  messages: [
    {
      role: 'user',
      content: 'Create a product listing for a wireless gaming headset.',
    },
  ],
  stream: false,
  // @ts-expect-error - Legacy format not in OpenAI types
  response_format: {
    type: 'json',
    name: 'product_listing',
    description: 'A product listing with details and pricing',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Product name' },
        brand: { type: 'string', description: 'Brand name' },
        price: { type: 'number', description: 'Price in USD' },
        category: { type: 'string', description: 'Product category' },
        description: { type: 'string', description: 'Product description' },
        features: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key product features',
        },
      },
      required: ['name', 'brand', 'price', 'category', 'description'],
    },
  },
});

console.log('Assistant:', completion.choices[0].message.content);
```

#### Python

```python filename="structured-output-legacy.py"
import os
import json
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='openai/gpt-5.2',
    messages=[
        {
            'role': 'user',
            'content': 'Create a product listing for a wireless gaming headset.'
        }
    ],
    stream=False,
    response_format={
        'type': 'json',
        'name': 'product_listing',
        'description': 'A product listing with details and pricing',
        'schema': {
            'type': 'object',
            'properties': {
                'name': {'type': 'string', 'description': 'Product name'},
                'brand': {'type': 'string', 'description': 'Brand name'},
                'price': {'type': 'number', 'description': 'Price in USD'},
                'category': {'type': 'string', 'description': 'Product category'},
                'description': {'type': 'string', 'description': 'Product description'},
                'features': {
                    'type': 'array',
                    'items': {'type': 'string'},
                    'description': 'Key product features'
                }
            },
            'required': ['name', 'brand', 'price', 'category', 'description']
        }
    }
)

print('Assistant:', completion.choices[0].message.content)

# Parse the structured response
structured_data = json.loads(completion.choices[0].message.content)
print('Structured Data:', json.dumps(structured_data, indent=2))
```

#### Streaming with structured outputs

Both `json_schema` and legacy `json` formats work with streaming responses:

#### TypeScript

```typescript filename="structured-streaming.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const stream = await openai.chat.completions.create({
  model: 'openai/gpt-5.2',
  messages: [
    {
      role: 'user',
      content: 'Create a product listing for a wireless gaming headset.',
    },
  ],
  stream: true,
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'product_listing',
      description: 'A product listing with details and pricing',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Product name' },
          brand: { type: 'string', description: 'Brand name' },
          price: { type: 'number', description: 'Price in USD' },
          category: { type: 'string', description: 'Product category' },
          description: { type: 'string', description: 'Product description' },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key product features',
          },
        },
        required: ['name', 'brand', 'price', 'category', 'description'],
        additionalProperties: false,
      },
    },
  },
});

let completeResponse = '';
for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
    completeResponse += content;
  }
}

// Parse the complete structured response
const structuredData = JSON.parse(completeResponse);
console.log('\nParsed Product:', structuredData);
```

#### Python

```python filename="structured-streaming.py"
import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

stream = client.chat.completions.create(
    model='openai/gpt-5.2',
    messages=[
        {
            'role': 'user',
            'content': 'Create a product listing for a wireless gaming headset.'
        }
    ],
    stream=True,
    response_format={
        'type': 'json_schema',
        'json_schema': {
            'name': 'product_listing',
            'description': 'A product listing with details and pricing',
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string', 'description': 'Product name'},
                    'brand': {'type': 'string', 'description': 'Brand name'},
                    'price': {'type': 'number', 'description': 'Price in USD'},
                    'category': {'type': 'string', 'description': 'Product category'},
                    'description': {'type': 'string', 'description': 'Product description'},
                    'features': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Key product features'
                    }
                },
                'required': ['name', 'brand', 'price', 'category', 'description'],
                'additionalProperties': False
            },
        }
    }
)

complete_response = ''
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        content = chunk.choices[0].delta.content
        print(content, end='', flush=True)
        complete_response += content

# Parse the complete structured response
structured_data = json.loads(complete_response)
print('\nParsed Product:', json.dumps(structured_data, indent=2))
```

> **💡 Note:** **Streaming assembly:** When using structured outputs with streaming, you'll
> need to collect all the content chunks and parse the complete JSON response
> once the stream is finished.


---

[View full sitemap](/docs/sitemap)
