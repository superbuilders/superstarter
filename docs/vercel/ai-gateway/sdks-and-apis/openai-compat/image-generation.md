---
title: Image Generation
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openai-compat/image-generation
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis/openai-compat
  - /docs/ai-gateway/sdks-and-apis
related:
  - /docs/ai-gateway/capabilities/image-generation
summary: Generate images using AI models that support multimodal output through the OpenAI-compatible API.
---

# Image Generation

Generate images using AI models that support multimodal output through the OpenAI-compatible API. This feature allows you to create images alongside text responses using models like Google's Gemini 2.5 Flash Image.

Endpoint

```
POST /chat/completions
```

Parameters

To enable image generation, include the `modalities` parameter in your request:

- `modalities` (array): Array of strings specifying the desired output modalities. Use `['text', 'image']` for both text and image generation, or `['image']` for image-only generation.

Example requests

#### TypeScript

```typescript filename="image-generation.ts"
import OpenAI from 'openai';

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const completion = await openai.chat.completions.create({
  model: 'google/gemini-2.5-flash-image-preview',
  messages: [
    {
      role: 'user',
      content:
        'Generate a beautiful sunset over mountains and describe the scene.',
    },
  ],
  // @ts-expect-error - modalities not yet in OpenAI types but supported by gateway
  modalities: ['text', 'image'],
  stream: false,
});

const message = completion.choices[0].message;

// Text content is always a string
console.log('Text:', message.content);

// Images are in a separate array
if (message.images && Array.isArray(message.images)) {
  console.log(`Generated ${message.images.length} images:`);
  for (const [index, img] of message.images.entries()) {
    if (img.type === 'image_url' && img.image_url) {
      console.log(`Image ${index + 1}:`, {
        size: img.image_url.url?.length || 0,
        preview: `${img.image_url.url?.substring(0, 50)}...`,
      });
    }
  }
}
```

#### Python

```python filename="image-generation.py"
import os
from openai import OpenAI

api_key = os.getenv('AI_GATEWAY_API_KEY') or os.getenv('VERCEL_OIDC_TOKEN')

client = OpenAI(
    api_key=api_key,
    base_url='https://ai-gateway.vercel.sh/v1'
)

completion = client.chat.completions.create(
    model='google/gemini-2.5-flash-image-preview',
    messages=[
        {
            'role': 'user',
            'content': 'Generate a beautiful sunset over mountains and describe the scene.'
        }
    ],
    # Note: modalities parameter is not yet in OpenAI Python types but supported by our gateway
    extra_body={'modalities': ['text', 'image']},
    stream=False,
)

message = completion.choices[0].message

# Text content is always a string
print(f"Text: {message.content}")

# Images are in a separate array
if hasattr(message, 'images') and message.images:
    print(f"Generated {len(message.images)} images:")
    for i, img in enumerate(message.images):
        if img.get('type') == 'image_url' and img.get('image_url'):
            image_url = img['image_url']['url']
            data_size = len(image_url) if image_url else 0
            print(f"Image {i+1}: size: {data_size} chars")
            print(f"Preview: {image_url[:50]}...")

print(f'Tokens used: {completion.usage}')
```

Response format

When image generation is enabled, the response separates text content from generated images:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "google/gemini-2.5-flash-image-preview",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Here's a beautiful sunset scene over the mountains...",
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            }
          }
        ]
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

### Response structure details

- **`content`**: Contains the text description as a string
- **`images`**: Array of generated images, each with:
  - `type`: Always `"image_url"`
  - `image_url.url`: Base64-encoded data URI of the generated image

### Streaming responses

For streaming requests, images are delivered in delta chunks:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "google/gemini-2.5-flash-image-preview",
  "choices": [
    {
      "index": 0,
      "delta": {
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
            }
          }
        ]
      },
      "finish_reason": null
    }
  ]
}
```

### Handling streaming image responses

When processing streaming responses, check for both text content and images in each delta:

#### TypeScript

```typescript filename="streaming-images.ts"
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh/v1',
});

const stream = await openai.chat.completions.create({
  model: 'google/gemini-2.5-flash-image-preview',
  messages: [{ role: 'user', content: 'Generate a sunset image' }],
  // @ts-expect-error - modalities not yet in OpenAI types
  modalities: ['text', 'image'],
  stream: true,
});

for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta;

  // Handle text content
  if (delta?.content) {
    process.stdout.write(delta.content);
  }

  // Handle images
  if (delta?.images) {
    for (const img of delta.images) {
      if (img.type === 'image_url' && img.image_url) {
        console.log(`\n[Image received: ${img.image_url.url.length} chars]`);
      }
    }
  }
}
```

#### Python

```python filename="streaming-images.py"
import os
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh/v1'
)

stream = client.chat.completions.create(
    model='google/gemini-2.5-flash-image-preview',
    messages=[{'role': 'user', 'content': 'Generate a sunset image'}],
    extra_body={'modalities': ['text', 'image']},
    stream=True,
)

for chunk in stream:
    if chunk.choices and chunk.choices[0].delta:
        delta = chunk.choices[0].delta

        # Handle text content
        if hasattr(delta, 'content') and delta.content:
            print(delta.content, end='', flush=True)

        # Handle images
        if hasattr(delta, 'images') and delta.images:
            for img in delta.images:
                if img.get('type') == 'image_url' and img.get('image_url'):
                    image_url = img['image_url']['url']
                    print(f"\n[Image received: {len(image_url)} chars]")
```

> **💡 Note:** **Image generation support:** Currently, image generation is supported by
> Google's Gemini 2.5 Flash Image model. The generated images are returned as
> base64-encoded data URIs in the response. For more detailed information about
> image generation capabilities, see the [Image Generation
> documentation](/docs/ai-gateway/capabilities/image-generation).


---

[View full sitemap](/docs/sitemap)
