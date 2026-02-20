---
title: Chat Completions
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openai-compat/chat-completions
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  - /docs/ai-gateway/openai-compat/advanced
  - /docs/ai-gateway/openai-compat/structured-outputs
summary: Create chat completions using the OpenAI-compatible API with support for streaming, image attachments, and PDF documents.
---

# Chat Completions

Create chat completions using various AI models available through the AI Gateway.

Endpoint

```
POST /chat/completions
```

### Basic chat completion

Create a non-streaming chat completion.

Example request

#### TypeScript

```typescript filename="chat-completion.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'Write a one-sentence bedtime story about a unicorn.',
    },
  ],
  stream: false,
});

console.log('Assistant:', completion.choices[0].message.content);
console.log('Tokens used:', completion.usage);
```

#### Python

```python filename="chat-completion.py"
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
            'content': 'Write a one-sentence bedtime story about a unicorn.'
        }
    ],
    stream=False,
)

print('Assistant:', completion.choices[0].message.content)
print('Tokens used:', completion.usage)
```

Response format

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
        "content": "Once upon a time, a gentle unicorn with a shimmering silver mane danced through moonlit clouds, sprinkling stardust dreams upon sleeping children below."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 28,
    "total_tokens": 43
  }
}
```

### Streaming chat completion

Create a streaming chat completion that streams tokens as they are generated.

Example request

#### TypeScript

```typescript filename="streaming-chat.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const stream = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: 'Write a one-sentence bedtime story about a unicorn.',
    },
  ],
  stream: true,
});

for await (const chunk of stream) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    process.stdout.write(content);
  }
}
```

#### Python

```python filename="streaming-chat.py"
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
            'content': 'Write a one-sentence bedtime story about a unicorn.'
        }
    ],
    stream=True,
)

for chunk in stream:
    content = chunk.choices[0].delta.content
    if content:
        print(content, end='', flush=True)
```

#### Streaming response format

Streaming responses are sent as [Server-Sent Events (SSE)](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events), a web standard for real-time data streaming over HTTP. Each event contains a JSON object with the partial response data.

The response format follows the OpenAI streaming specification:

```http
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{"content":"Once"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"anthropic/claude-sonnet-4.5","choices":[{"index":0,"delta":{"content":" upon"},"finish_reason":null}]}

data: [DONE]
```

**Key characteristics:**

- Each line starts with `data:` followed by JSON
- Content is delivered incrementally in the `delta.content` field
- The stream ends with `data: [DONE]`
- Empty lines separate events

**SSE Parsing Libraries:**

If you're building custom SSE parsing (instead of using the OpenAI SDK), these libraries can help:

- **JavaScript/TypeScript**: [`eventsource-parser`](https://www.npmjs.com/package/eventsource-parser) - Robust SSE parsing with support for partial events
- **Python**: [`httpx-sse`](https://pypi.org/project/httpx-sse/) - SSE support for HTTPX, or [`sseclient-py`](https://pypi.org/project/sseclient-py/) for requests

For more details about the SSE specification, see the [W3C specification](https://html.spec.whatwg.org/multipage/server-sent-events.html).

### Image attachments

Send images as part of your chat completion request.

Example request

#### TypeScript

```typescript filename="image-analysis.ts"
import fs from 'node:fs';
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// Read the image file as base64
const imageBuffer = fs.readFileSync('./path/to/image.png');
const imageBase64 = imageBuffer.toString('base64');

const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in detail.' },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
            detail: 'auto',
          },
        },
      ],
    },
  ],
  stream: false,
});

console.log('Assistant:', completion.choices[0].message.content);
console.log('Tokens used:', completion.usage);
```

#### Python

```python filename="image-analysis.py"
import os
import base64
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

# Read the image file as base64
with open('./path/to/image.png', 'rb') as image_file:
    image_base64 = base64.b64encode(image_file.read()).decode('utf-8')

completion = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': [
                {'type': 'text', 'text': 'Describe this image in detail.'},
                {
                    'type': 'image_url',
                    'image_url': {
                        'url': f'data:image/png;base64,{image_base64}',
                        'detail': 'auto'
                    }
                }
            ]
        }
    ],
    stream=False,
)

print('Assistant:', completion.choices[0].message.content)
print('Tokens used:', completion.usage)
```

### PDF attachments

Send PDF documents as part of your chat completion request.

Example request

#### TypeScript

```typescript filename="pdf-analysis.ts"
import fs from 'node:fs';
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

// Read the PDF file as base64
const pdfBuffer = fs.readFileSync('./path/to/document.pdf');
const pdfBase64 = pdfBuffer.toString('base64');

const completion = await openai.chat.completions.create({
  model: 'anthropic/claude-sonnet-4.5',
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'What is the main topic of this document? Please summarize the key points.',
        },
        {
          type: 'file',
          file: {
            data: pdfBase64,
            media_type: 'application/pdf',
            filename: 'document.pdf',
          },
        },
      ],
    },
  ],
  stream: false,
});

console.log('Assistant:', completion.choices[0].message.content);
console.log('Tokens used:', completion.usage);
```

#### Python

```python filename="pdf-analysis.py"
import os
import base64
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

# Read the PDF file as base64
with open('./path/to/document.pdf', 'rb') as pdf_file:
    pdf_base64 = base64.b64encode(pdf_file.read()).decode('utf-8')

completion = client.chat.completions.create(
    model='anthropic/claude-sonnet-4.5',
    messages=[
        {
            'role': 'user',
            'content': [
                {
                    'type': 'text',
                    'text': 'What is the main topic of this document? Please summarize the key points.'
                },
                {
                    'type': 'file',
                    'file': {
                        'data': pdf_base64,
                        'media_type': 'application/pdf',
                        'filename': 'document.pdf'
                    }
                }
            ]
        }
    ],
    stream=False,
)

print('Assistant:', completion.choices[0].message.content)
print('Tokens used:', completion.usage)
```

### Parameters

The chat completions endpoint supports the following parameters:

#### Required parameters

- `model` (string): The model to use for the completion (e.g., `anthropic/claude-sonnet-4`)
- `messages` (array): Array of message objects with `role` and `content` fields

#### Optional parameters

- `stream` (boolean): Whether to stream the response. Defaults to `false`
- `temperature` (number): Controls randomness in the output. Range: 0-2
- `max_tokens` (integer): Maximum number of tokens to generate
- `top_p` (number): Nucleus sampling parameter. Range: 0-1
- `frequency_penalty` (number): Penalty for frequent tokens. Range: -2 to 2
- `presence_penalty` (number): Penalty for present tokens. Range: -2 to 2
- `stop` (string or array): Stop sequences for the generation
- `tools` (array): Array of tool definitions for function calling
- `tool_choice` (string or object): Controls which tools are called (`auto`, `none`, or specific function)
- `providerOptions` (object): [Provider routing and configuration options](/docs/ai-gateway/openai-compat/advanced#provider-options)
- `response_format` (object): Controls the format of the model's response
  - For OpenAI standard format: `{ type: "json_schema", json_schema: { name, schema, strict?, description? } }`
  - For legacy format: `{ type: "json", schema?, name?, description? }`
  - For plain text: `{ type: "text" }`
  - See [Structured outputs](/docs/ai-gateway/openai-compat/structured-outputs) for detailed examples

### Message format

Messages support different content types:

#### Text messages

```json
{
  "role": "user",
  "content": "Hello, how are you?"
}
```

#### Multimodal messages

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "What's in this image?" },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD..."
      }
    }
  ]
}
```

#### File messages

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Summarize this document" },
    {
      "type": "file",
      "file": {
        "data": "JVBERi0xLjQKJcfsj6IKNSAwIG9iago8PAovVHlwZSAvUGFnZQo...",
        "media_type": "application/pdf",
        "filename": "document.pdf"
      }
    }
  ]
}
```


---

[View full sitemap](/docs/sitemap)
