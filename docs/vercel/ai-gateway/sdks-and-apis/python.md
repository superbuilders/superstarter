---
title: Python
product: vercel
url: /docs/ai-gateway/sdks-and-apis/python
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat
  - /docs/ai-gateway/authentication-and-byok/authentication
  - /docs/ai-gateway/sdks-and-apis/openai-compat/tool-calls
  - /docs/ai-gateway/sdks-and-apis/anthropic-compat/tool-calls
summary: Use the AI Gateway with Python through OpenAI or Anthropic SDKs with full streaming, tool calling, and async support.
---

# Python

To get started with Python and AI Gateway, you can either call the
[OpenAI-Compatible](/docs/ai-gateway/sdks-and-apis/openai-compat) or [Anthropic-Compatible](/docs/ai-gateway/sdks-and-apis/anthropic-compat) API directly, or use the
official [OpenAI](https://github.com/openai/openai-python) and [Anthropic](https://github.com/anthropics/anthropic-sdk-python) Python SDKs,
which are covered below.

## Installation

Install your preferred SDK:

#### OpenAI SDK

```bash
pip install openai
```

#### Anthropic SDK

```bash
pip install anthropic
```

## Quick start

#### OpenAI SDK

```python filename="quickstart.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {'role': 'user', 'content': 'Explain quantum computing in one paragraph.'}
    ]
)

print(response.choices[0].message.content)
```

#### Anthropic SDK

```python filename="quickstart.py"
import os
import anthropic

client = anthropic.Anthropic(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=1024,
    messages=[
        {'role': 'user', 'content': 'Explain quantum computing in one paragraph.'}
    ]
)

print(message.content[0].text)
```

## Authentication

Both SDKs support the same authentication methods. Use an [API key](/docs/ai-gateway/authentication-and-byok/authentication#api-key) for local development or [OIDC tokens](/docs/ai-gateway/authentication-and-byok/authentication#oidc-token) for Vercel deployments.

```python filename="auth.py"
import os

# Option 1: API key (recommended for local development)
api_key = os.getenv('AI_GATEWAY_API_KEY')

# Option 2: OIDC token (automatic on Vercel deployments)
api_key = os.getenv('VERCEL_OIDC_TOKEN')

# Fallback pattern for code that runs both locally and on Vercel
api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')
```

## Streaming

Stream responses for real-time output in chat applications or long-running generations.

#### OpenAI SDK

```python filename="streaming.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

stream = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {'role': 'user', 'content': 'Write a short story about a robot.'}
    ],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end='', flush=True)
```

#### Anthropic SDK

```python filename="streaming.py"
import os
import anthropic

client = anthropic.Anthropic(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh'
)

with client.messages.stream(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=1024,
    messages=[
        {'role': 'user', 'content': 'Write a short story about a robot.'}
    ]
) as stream:
    for text in stream.text_stream:
        print(text, end='', flush=True)
```

## Async support

Both SDKs provide async clients for use with `asyncio`.

#### OpenAI SDK

```python filename="async_client.py"
import os
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

async def main():
    response = await client.chat.completions.create(
        model='anthropic/claude-sonnet-4.5',
        messages=[
            {'role': 'user', 'content': 'Hello!'}
        ]
    )
    print(response.choices[0].message.content)

asyncio.run(main())
```

#### Anthropic SDK

```python filename="async_client.py"
import os
import asyncio
import anthropic

client = anthropic.AsyncAnthropic(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh'
)

async def main():
    message = await client.messages.create(
        model='anthropic/claude-sonnet-4.5',
        max_tokens=1024,
        messages=[
            {'role': 'user', 'content': 'Hello!'}
        ]
    )
    print(message.content[0].text)

asyncio.run(main())
```

## Tool calling

Enable models to call functions you define. This example shows a weather tool that the model can invoke.

#### OpenAI SDK

```python filename="tools.py"
import os
import json
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

tools = [{
    'type': 'function',
    'function': {
        'name': 'get_weather',
        'description': 'Get the current weather for a location',
        'parameters': {
            'type': 'object',
            'properties': {
                'location': {
                    'type': 'string',
                    'description': 'City name, e.g. San Francisco'
                }
            },
            'required': ['location']
        }
    }
}]

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {'role': 'user', 'content': "What's the weather in Tokyo?"}
    ],
    tools=tools
)

# Check if the model wants to call a tool
if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    print(f"Model wants to call: {tool_call.function.name}")
    print(f"With arguments: {args}")
```

#### Anthropic SDK

```python filename="tools.py"
import os
import anthropic

client = anthropic.Anthropic(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh'
)

tools = [{
    'name': 'get_weather',
    'description': 'Get the current weather for a location',
    'input_schema': {
        'type': 'object',
        'properties': {
            'location': {
                'type': 'string',
                'description': 'City name, e.g. San Francisco'
            }
        },
        'required': ['location']
    }
}]

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=1024,
    messages=[
        {'role': 'user', 'content': "What's the weather in Tokyo?"}
    ],
    tools=tools
)

# Check if the model wants to call a tool
for block in message.content:
    if block.type == 'tool_use':
        print(f"Model wants to call: {block.name}")
        print(f"With arguments: {block.input}")
```

See [OpenAI-compatible tool calls](/docs/ai-gateway/sdks-and-apis/openai-compat/tool-calls) or [Anthropic-compatible tool calls](/docs/ai-gateway/sdks-and-apis/anthropic-compat/tool-calls) for more examples.

## Structured outputs

Generate responses that conform to a JSON schema for reliable parsing.

```python filename="structured.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

response = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {'role': 'user', 'content': 'Extract: John is 30 years old and lives in NYC'}
    ],
    response_format={
        'type': 'json_schema',
        'json_schema': {
            'name': 'person',
            'schema': {
                'type': 'object',
                'properties': {
                    'name': {'type': 'string'},
                    'age': {'type': 'integer'},
                    'city': {'type': 'string'}
                },
                'required': ['name', 'age', 'city']
            }
        }
    }
)

import json
data = json.loads(response.choices[0].message.content)
print(data)  # {'name': 'John', 'age': 30, 'city': 'NYC'}
```

See [structured outputs](/docs/ai-gateway/sdks-and-apis/openai-compat/structured-outputs) for more details.

## Framework integrations

Python frameworks with dedicated AI Gateway support:

| Framework                                                                    | Integration                                  |
| ---------------------------------------------------------------------------- | -------------------------------------------- |
| [Pydantic AI](/docs/ai-gateway/ecosystem/framework-integrations/pydantic-ai) | Native `VercelProvider` for type-safe agents |
| [LlamaIndex](/docs/ai-gateway/ecosystem/framework-integrations/llamaindex)   | `llama-index-llms-vercel-ai-gateway` package |
| [LiteLLM](/docs/ai-gateway/ecosystem/framework-integrations/litellm)         | Use `vercel_ai_gateway/` model prefix        |
| [LangChain](/docs/ai-gateway/ecosystem/framework-integrations/langchain)     | Configure via OpenAI-compatible endpoint     |

See [Framework Integrations](/docs/ai-gateway/ecosystem/framework-integrations) for the complete list and setup guides.

## API reference

For complete API documentation, see:

- **[OpenAI-compatible API](/docs/ai-gateway/sdks-and-apis/openai-compat)** — Chat completions, embeddings, streaming, tool calls, structured outputs, image inputs, and provider routing
- **[Anthropic-compatible API](/docs/ai-gateway/sdks-and-apis/anthropic-compat)** — Messages API, streaming, tool calls, extended thinking, web search, and file attachments


---

[View full sitemap](/docs/sitemap)
