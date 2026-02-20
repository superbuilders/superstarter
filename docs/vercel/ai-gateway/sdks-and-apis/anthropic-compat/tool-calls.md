---
title: Tool Calls
product: vercel
url: /docs/ai-gateway/sdks-and-apis/anthropic-compat/tool-calls
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  []
summary: Use Anthropic-compatible function calling to allow models to call tools and functions.
---

# Tool Calls

The AI Gateway supports Anthropic-compatible function calling, allowing models to call tools and functions.

Example request

#### TypeScript

```typescript filename="tool-calls.ts"
import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const anthropic = new Anthropic({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await anthropic.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 1024,
  tools: [
    {
      name: 'get_weather',
      description: 'Get the current weather in a given location',
      input_schema: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city and state, e.g. San Francisco, CA',
          },
          unit: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'The unit for temperature',
          },
        },
        required: ['location'],
      },
    },
  ],
  messages: [
    {
      role: 'user',
      content: 'What is the weather like in San Francisco?',
    },
  ],
});

console.log('Response:', JSON.stringify(message.content, null, 2));
```

#### Python

```python filename="tool-calls.py"
import os
import anthropic

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = anthropic.Anthropic(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=1024,
    tools=[
        {
            'name': 'get_weather',
            'description': 'Get the current weather in a given location',
            'input_schema': {
                'type': 'object',
                'properties': {
                    'location': {
                        'type': 'string',
                        'description': 'The city and state, e.g. San Francisco, CA'
                    },
                    'unit': {
                        'type': 'string',
                        'enum': ['celsius', 'fahrenheit'],
                        'description': 'The unit for temperature'
                    }
                },
                'required': ['location']
            }
        }
    ],
    messages=[
        {
            'role': 'user',
            'content': 'What is the weather like in San Francisco?'
        }
    ],
)

print('Response:', message.content)
```

Tool call response format

When the model makes tool calls, the response includes tool use blocks:

```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "tool_use",
      "id": "toolu_123",
      "name": "get_weather",
      "input": {
        "location": "San Francisco, CA",
        "unit": "fahrenheit"
      }
    }
  ],
  "model": "anthropic/claude-sonnet-4.5",
  "stop_reason": "tool_use",
  "usage": {
    "input_tokens": 82,
    "output_tokens": 45
  }
}
```


---

[View full sitemap](/docs/sitemap)
