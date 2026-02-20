---
title: Image Generation with OpenAI-Compatible API
product: vercel
url: /docs/ai-gateway/capabilities/image-generation/openai
type: integration
prerequisites:
  - /docs/ai-gateway/capabilities/image-generation
  - /docs/ai-gateway/capabilities
related:
  []
summary: Generate and edit images using AI models through Vercel AI Gateway with OpenAI-compatible API.
---

# Image Generation with OpenAI-Compatible API

AI Gateway supports image generation using the OpenAI-compatible API for the models listed under the **Image Gen** filter at the [AI Gateway Models
page](https://vercel.com/ai-gateway/models?type=image), including multimodal LLMs and image-only models.

## Multimodal LLMs

Multimodal LLMs like Nano Banana, Nano Banana Pro, and GPT-5 variants can generate images alongside text using the `/v1/chat/completions` endpoint. Images are returned in the response's `images` array.

### Generate response format

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "google/gemini-3-pro-image",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "I've generated a beautiful sunset image for you.",
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
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

### Streaming response format

For streaming requests, images are delivered in delta chunks:

```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion.chunk",
  "created": 1677652288,
  "model": "google/gemini-3-pro-image",
  "choices": [
    {
      "index": 0,
      "delta": {
        "images": [
          {
            "type": "image_url",
            "image_url": {
              "url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
            }
          }
        ]
      },
      "finish_reason": null
    }
  ]
}
```

## Image-only models

Image-only models use the OpenAI Images API (`/v1/images/generations`) for specialized image creation.

### Google Vertex Imagen

Google's Imagen models provide high-quality image generation with fine-grained control. Multiple models are available including `google/imagen-4.0-ultra-generate-001` and `google/imagen-4.0-generate-001`.

View available [Imagen provider options](https://ai-sdk.dev/providers/ai-sdk-providers/google-vertex#image-models) for configuration details.

#### TypeScript (Basic)

```typescript filename="generate-imagen-simple.ts"
import OpenAI from 'openai';
import 'dotenv/config';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const result = await openai.images.generate({
    model: 'google/imagen-4.0-ultra-generate-001',
    prompt: `A snow leopard prowling through a rocky mountain landscape during a light snowfall`,
    n: 2,
  });

  // Process the generated images
  for (const image of result.data) {
    if (image.b64_json) {
      console.log(
        'Generated image (base64):',
        image.b64_json.substring(0, 50) + '...',
      );
    }
  }
}

main().catch(console.error);
```

#### TypeScript (With Options)

```typescript filename="generate-imagen-options.ts"
import OpenAI from 'openai';
import 'dotenv/config';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const result = await openai.images.generate({
    model: 'google/imagen-4.0-ultra-generate-001',
    prompt: `A cascading waterfall in a lush rainforest with mist rising and exotic birds flying`,
    n: 2,
    // @ts-expect-error - Provider options are not in OpenAI types
    providerOptions: {
      googleVertex: {
        aspectRatio: '1:1',
        safetyFilterLevel: 'block_some',
      },
    },
  });

  // Process the generated images
  for (const image of result.data) {
    if (image.b64_json) {
      console.log(
        'Generated image (base64):',
        image.b64_json.substring(0, 50) + '...',
      );
    }
  }
}

main().catch(console.error);
```

#### Python

```python filename="generate-imagen.py"
import base64
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def main():
    api_key = os.getenv("AI_GATEWAY_API_KEY") or os.getenv("VERCEL_OIDC_TOKEN")
    base_url = (
        os.getenv("AI_GATEWAY_BASE_OPENAI_COMPAT_URL")
        or "https://ai-gateway.vercel.sh/v1"
    )

    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
    )

    result = client.images.generate(
        model="google/imagen-4.0-ultra-generate-001",
        prompt=(
            "A red fox walking through a snowy forest clearing "
            "with pine trees in the background"
        ),
        n=2,
        response_format="b64_json",
        extra_body={
            "providerOptions": {
                "googleVertex": {
                    "aspectRatio": "1:1",
                    "safetyFilterLevel": "block_some",
                }
            }
        },
    )

    if not result or not result.data or len(result.data) == 0:
        raise Exception("No image data received from OpenAI-compatible endpoint")

    print(f"Generated {len(result.data)} image(s)")

    for i, image in enumerate(result.data):
        if hasattr(image, "b64_json") and image.b64_json:
            # Decode base64 to get image size
            image_bytes = base64.b64decode(image.b64_json)
            print(f"Image {i+1}:")
            print(f"  Size: {len(image_bytes)} bytes")
            print(f"  Base64 preview: {image.b64_json[:50]}...")

            # Save image to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"output/output_image_{timestamp}_{i+1}.png"
            print(f"  Saving image to {output_file}")
            with open(output_file, "wb") as f:
                f.write(image_bytes)

    if hasattr(result, "provider_metadata"):
        print("\nProvider metadata:")
        print(json.dumps(result.provider_metadata, indent=2))

if __name__ == "__main__":
    main()
```

### Black Forest Labs

Black Forest Labs' Flux models offer advanced image generation with various capabilities. Multiple models are available including but not limited to:

- `bfl/flux-2-pro`
- `bfl/flux-2-flex`
- `bfl/flux-kontext-max`
- `bfl/flux-kontext-pro`
- `bfl/flux-pro-1.0-fill`
- `bfl/flux-pro-1.1`

View available [Black Forest Labs provider options](https://ai-sdk.dev/providers/ai-sdk-providers/black-forest-labs#provider-options) for configuration details.

#### TypeScript (Basic)

```typescript filename="generate-bfl-simple.ts"
import OpenAI from 'openai';
import 'dotenv/config';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const result = await openai.images.generate({
    model: 'bfl/flux-2-pro',
    prompt: `Render an echidna swimming across the Mozambique channel at sunset with phosphorescent jellyfish`,
  });

  // Process the generated images
  for (const image of result.data) {
    if (image.b64_json) {
      console.log(
        'Generated image (base64):',
        image.b64_json.substring(0, 50) + '...',
      );
    }
  }
}

main().catch(console.error);
```

#### TypeScript (With Options)

```typescript filename="generate-bfl-options.ts"
import OpenAI from 'openai';
import 'dotenv/config';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY,
    baseURL: 'https://ai-gateway.vercel.sh/v1',
  });

  const result = await openai.images.generate({
    model: 'bfl/flux-2-pro',
    prompt: `Draw a gorgeous image of a river made of white owl feathers snaking through a serene winter landscape`,
    // @ts-expect-error - Provider options are not in OpenAI types
    providerOptions: {
      blackForestLabs: {
        outputFormat: 'jpeg',
        safetyTolerance: 2,
      },
    },
  });

  // Process the generated images
  for (const image of result.data) {
    if (image.b64_json) {
      console.log(
        'Generated image (base64):',
        image.b64_json.substring(0, 50) + '...',
      );
    }
  }
}

main().catch(console.error);
```

#### Python

```python filename="generate-bfl.py"
import base64
import json
import os
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def main():
    api_key = os.getenv("AI_GATEWAY_API_KEY") or os.getenv("VERCEL_OIDC_TOKEN")
    base_url = (
        os.getenv("AI_GATEWAY_BASE_OPENAI_COMPAT_URL")
        or "https://ai-gateway.vercel.sh/v1"
    )

    client = OpenAI(
        api_key=api_key,
        base_url=base_url,
    )

    result = client.images.generate(
        model="bfl/flux-2-pro",
        prompt=(
            "A mystical aurora borealis dancing over a frozen lake "
            "with snow-covered mountains reflected in the ice"
        ),
        n=1,
        response_format="b64_json",
        extra_body={
            "providerOptions": {
                "blackForestLabs": {
                    "outputFormat": "jpeg",
                    "safetyTolerance": 2,
                }
            }
        },
    )

    if not result or not result.data or len(result.data) == 0:
        raise Exception("No image data received from OpenAI-compatible endpoint")

    print(f"Generated {len(result.data)} image(s)")

    for i, image in enumerate(result.data):
        if hasattr(image, "b64_json") and image.b64_json:
            # Decode base64 to get image size
            image_bytes = base64.b64decode(image.b64_json)
            print(f"Image {i+1}:")
            print(f"  Size: {len(image_bytes)} bytes")
            print(f"  Base64 preview: {image.b64_json[:50]}...")

            # Save image to file with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"output/output_image_{timestamp}_{i+1}.png"
            print(f"  Saving image to {output_file}")
            with open(output_file, "wb") as f:
                f.write(image_bytes)

    if hasattr(result, "provider_metadata"):
        print("\nProvider metadata:")
        print(json.dumps(result.provider_metadata, indent=2))

if __name__ == "__main__":
    main()
```

## Python

You can use the OpenAI Python client to generate images with the AI Gateway:

```python filename="generate-image.py"
import base64
import os
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def main():
    # Initialize the OpenAI client with AI Gateway
    client = OpenAI(
        api_key=os.getenv("AI_GATEWAY_API_KEY"),
        base_url="https://ai-gateway.vercel.sh/v1",
    )

    # Generate an image
    result = client.images.generate(
        model="bfl/flux-2-pro",
        prompt="A majestic blue whale breaching the ocean surface at sunset",
        n=1,
        response_format="b64_json",
    )

    if not result.data:
        raise Exception("No image data received")

    print(f"Generated {len(result.data)} image(s)")

    # Save images to disk
    for i, image in enumerate(result.data):
        if image.b64_json:
            image_bytes = base64.b64decode(image.b64_json)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"output/image_{timestamp}_{i+1}.png"

            with open(output_file, "wb") as f:
                f.write(image_bytes)
            print(f"Saved image to {output_file}")

if __name__ == "__main__":
    main()
```

## REST API

You can use the OpenAI Images API directly via REST without a client library:

```typescript filename="generate-image-rest.ts"
import 'dotenv/config';

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const baseURL = 'https://ai-gateway.vercel.sh/v1';

  // Send POST request to images/generations endpoint
  const response = await fetch(`${baseURL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'bfl/flux-2-pro',
      prompt: `A playful dolphin pod jumping through ocean waves at sunrise with seabirds flying overhead`,
      providerOptions: {
        blackForestLabs: { outputFormat: 'jpeg' },
      },
      n: 3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.status}`);
  }

  const json = await response.json();

  // Images are returned as base64 strings in json.data
  for (const image of json.data) {
    if (image.b64_json) {
      console.log(
        'Generated image (base64):',
        image.b64_json.substring(0, 50) + '...',
      );
    }
  }

  console.log('Generated', json.data.length, 'image(s)');
}

main().catch(console.error);
```


---

[View full sitemap](/docs/sitemap)
