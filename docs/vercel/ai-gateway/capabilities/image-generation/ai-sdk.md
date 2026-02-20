---
title: Image Generation with AI SDK
product: vercel
url: /docs/ai-gateway/capabilities/image-generation/ai-sdk
type: integration
prerequisites:
  - /docs/ai-gateway/capabilities/image-generation
  - /docs/ai-gateway/capabilities
related:
  []
summary: Generate and edit images using AI models through Vercel AI Gateway with the AI SDK.
---

# Image Generation with AI SDK

AI Gateway supports image generation using the [AI SDK](https://ai-sdk.dev/docs/ai-sdk-core/image-generation) for the models listed under the **Image Gen** filter at the [AI Gateway Models
page](https://vercel.com/ai-gateway/models?type=image), including multimodal LLMs and image-only models.

## Multimodal LLMs

These models can generate both text and images in their responses. They use `generateText` or `streamText` functions with special configuration to enable image outputs.

### Nano Banana Pro (`google/gemini-3-pro-image`)

Google's Nano Banana Pro model offers state-of-the-art image generation and editing capabilities with higher quality outputs. Images are returned as content parts in `result.files`.

#### generateText

```typescript filename="generate-nanobanana-pro.ts"
import { generateText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = await generateText({
    model: 'google/gemini-3-pro-image',
    prompt: `Create a detailed illustration of a turquoise-throated puffleg hummingbird resting on a branch covered with dew at sunrise`,
  });

  // Print any text response from the model
  if (result.text) {
    console.log(result.text);
  }

  // Images are available in result.files
  console.log(`Generated ${result.files.length} image(s)`);
  console.log('Usage:', JSON.stringify(result.usage, null, 2));
}

main().catch(console.error);
```

#### streamText

```typescript filename="stream-nanobanana-pro.ts"
import { streamText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = streamText({
    model: 'google/gemini-3-pro-image',
    prompt: `Generate an artistic rendering of a pond tortoise sleeping on a log in a misty lake at sunset`,
  });

  // Stream text output as it arrives
  for await (const delta of result.fullStream) {
    if (delta.type === 'text-delta') {
      process.stdout.write(delta.text);
    }
  }

  // Access generated images after streaming completes
  const finalResult = await result;
  console.log(`\nGenerated ${finalResult.files.length} image(s)`);
  console.log('Usage:', JSON.stringify(finalResult.usage, null, 2));
}

main().catch(console.error);
```

### Nano Banana (`google/gemini-2.5-flash-image`)

Google's Nano Banana model offers fast, efficient image generation alongside text responses. Images are returned as content parts in `result.files`.

#### generateText

```typescript filename="generate-nanobanana.ts"
import { generateText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = await generateText({
    model: 'google/gemini-2.5-flash-image',
    prompt: `Render two different images of a snowy plover at dusk looking out at San Francisco Bay`,
  });

  // Print any text response from the model
  if (result.text) {
    console.log(result.text);
  }

  // Images are available in result.files
  console.log(`Generated ${result.files.length} image(s)`);
  console.log('Usage:', JSON.stringify(result.usage, null, 2));
}

main().catch(console.error);
```

#### streamText

```typescript filename="stream-nanobanana.ts"
import { streamText } from 'ai';
import 'dotenv/config';

async function main() {
  const result = streamText({
    model: 'google/gemini-2.5-flash-image',
    prompt: `Render two images of a golden-crowned kinglet perched on a frost-covered pine branch`,
  });

  // Stream text output as it arrives
  for await (const delta of result.fullStream) {
    if (delta.type === 'text-delta') {
      process.stdout.write(delta.text);
    }
  }

  // Access generated images after streaming completes
  const finalResult = await result;
  console.log(`\nGenerated ${finalResult.files.length} image(s)`);
  console.log('Usage:', JSON.stringify(finalResult.usage, null, 2));
}

main().catch(console.error);
```

#### Save images from Nano Banana models

Nano Banana models (like `google/gemini-2.5-flash-image` and `google/gemini-3-pro-image`) return images as content parts in `result.files`. These include a `uint8Array` property that you can write directly to disk:

```typescript filename="save-nanobanana-images.ts"
import fs from 'node:fs';
import path from 'node:path';

// Filter for image files from result.files
const imageFiles = result.files.filter((f) =>
  f.mediaType?.startsWith('image/'),
);

if (imageFiles.length > 0) {
  const outputDir = 'output';
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = Date.now();

  for (const [index, file] of imageFiles.entries()) {
    const extension = file.mediaType?.split('/')[1] || 'png';
    const filename = `image-${timestamp}-${index}.${extension}`;
    const filepath = path.join(outputDir, filename);

    // Save to file (uint8Array can be written directly)
    await fs.promises.writeFile(filepath, file.uint8Array);
    console.log(`Saved image to ${filepath}`);
  }
}
```

### OpenAI models with image generation tool

OpenAI's GPT-5 model variants and a few others support multi-modal image generation through a provider-defined tool. The image generation uses `gpt-image-1` behind the scenes. Images are returned as tool results in `result.staticToolResults` (for `generateText`) or as `tool-result` events (for `streamText`).

Learn more about the [OpenAI Image Generation Tool](https://ai-sdk.dev/providers/ai-sdk-providers/openai#image-generation-tool) in the AI SDK documentation.

#### generateText

```typescript filename="generate-openai-image.ts"
import { generateText } from 'ai';
import 'dotenv/config';
import { openai } from '@ai-sdk/openai';

async function main() {
  const result = await generateText({
    model: 'openai/gpt-5.1-instant',
    prompt: `Generate an image of a black shiba inu dog eating a cake in a green grass field`,
    tools: {
      image_generation: openai.tools.imageGeneration({
        outputFormat: 'webp',
        quality: 'high',
      }),
    },
  });

  // Extract generated images from tool results
  for (const toolResult of result.staticToolResults) {
    if (toolResult.toolName === 'image_generation') {
      const base64Image = toolResult.output.result;
      console.log(
        'Generated image (base64):',
        base64Image.substring(0, 50) + '...',
      );
    }
  }

  console.log('Usage:', JSON.stringify(result.usage, null, 2));
}

main().catch(console.error);
```

#### streamText

```typescript filename="stream-openai-image.ts"
import { streamText } from 'ai';
import 'dotenv/config';
import { openai } from '@ai-sdk/openai';

async function main() {
  const result = streamText({
    model: 'openai/gpt-5.1-instant',
    prompt: `Generate an image of a corgi puppy playing with colorful balloons in a sunny garden`,
    tools: {
      image_generation: openai.tools.imageGeneration({
        outputFormat: 'webp',
        quality: 'high',
      }),
    },
  });

  for await (const part of result.fullStream) {
    if (part.type === 'tool-result' && !part.dynamic) {
      if (part.toolName === 'image_generation') {
        const base64Image = part.output.result;
        console.log(
          'Generated image (base64):',
          base64Image.substring(0, 50) + '...',
        );
      }
    }
  }

  console.log('Usage:', JSON.stringify(await result.usage, null, 2));
}

main().catch(console.error);
```

#### Save images from OpenAI tool results

OpenAI models return images as base64-encoded strings in tool results. The approach differs depending on whether you use `generateText` or `streamText`.

#### generateText

With `generateText`, images are available in `result.staticToolResults` after the call completes:

```typescript filename="save-openai-images.ts"
import fs from 'node:fs';
import path from 'node:path';

const outputDir = 'output';
fs.mkdirSync(outputDir, { recursive: true });

const timestamp = Date.now();

// Extract images from staticToolResults and save to file
for (const [index, toolResult] of result.staticToolResults.entries()) {
  if (toolResult.toolName === 'image_generation') {
    // Decode base64 image from tool result
    const base64Image = toolResult.output.result;
    const buffer = Buffer.from(base64Image, 'base64');

    const filename = `image-${timestamp}-${index}.webp`;
    const filepath = path.join(outputDir, filename);

    // Save to file
    await fs.promises.writeFile(filepath, buffer);
    console.log(`Saved image to ${filepath}`);
  }
}
```

#### streamText

With `streamText`, images arrive as `tool-result` events in the stream. Save them as they come in:

```typescript filename="save-openai-images-stream.ts"
import fs from 'node:fs';
import path from 'node:path';

const outputDir = 'output';
fs.mkdirSync(outputDir, { recursive: true });

const timestamp = Date.now();
let imageIndex = 0;

// Extract images from tool-result events and save to file
for await (const part of result.fullStream) {
  if (part.type === 'tool-result' && !part.dynamic) {
    if (part.toolName === 'image_generation') {
      // Decode base64 image from tool result
      const base64Image = part.output.result;
      const buffer = Buffer.from(base64Image, 'base64');

      const filename = `image-${timestamp}-${imageIndex}.webp`;
      const filepath = path.join(outputDir, filename);

      // Save to file
      await fs.promises.writeFile(filepath, buffer);
      console.log(`Saved image to ${filepath}`);
      imageIndex++;
    }
  }
}
```

## Image-only models

These models are specialized for image generation and use the `experimental_generateImage` function.

### Google Vertex Imagen

Google's Imagen models provide high-quality image generation with fine-grained control over output parameters. Multiple Imagen models are available, including but not limited to:

- `google/imagen-4.0-ultra-generate-001`
- `google/imagen-4.0-generate-001`

```typescript filename="generate-imagen.ts"
import { experimental_generateImage as generateImage } from 'ai';
import 'dotenv/config';

async function main() {
  const result = await generateImage({
    model: 'google/imagen-4.0-ultra-generate-001',
    prompt: `A majestic Bengal tiger drinking water from a crystal-clear mountain stream at golden hour`,
    n: 2,
    aspectRatio: '16:9',
  });

  console.log(`Generated ${result.images.length} image(s)`);
}

main().catch(console.error);
```

### Black Forest Labs

Black Forest Labs' Flux models offer advanced image generation with support for various aspect ratios and capabilities. Multiple Flux models are available, including but not limited to:

- `bfl/flux-2-pro`
- `bfl/flux-2-flex`
- `bfl/flux-kontext-max`
- `bfl/flux-kontext-pro`
- `bfl/flux-pro-1.0-fill`
- `bfl/flux-pro-1.1`

```typescript filename="generate-bfl.ts"
import { experimental_generateImage as generateImage } from 'ai';
import 'dotenv/config';

async function main() {
  const result = await generateImage({
    model: 'bfl/flux-2-pro',
    prompt: `A vibrant coral reef ecosystem with tropical fish swimming around colorful sea anemones`,
    aspectRatio: '4:3',
  });

  console.log(`Generated ${result.images.length} image(s)`);
}

main().catch(console.error);
```

### Save generated images from image-only models

All generated images from image-only models are returned in `result.images` as objects containing:

- `base64`: The image as a base64-encoded string
- `mediaType`: The MIME type (e.g., `image/png`, `image/jpeg`, `image/webp`)

```typescript filename="save-image-only-models.ts"
import fs from 'node:fs';
import path from 'node:path';

const outputDir = 'output';
fs.mkdirSync(outputDir, { recursive: true });

const timestamp = Date.now();

// Extract images from result.images and save to file
for (const [index, image] of result.images.entries()) {
  // Decode base64 image
  const buffer = Buffer.from(image.base64, 'base64');

  const extension = image.mediaType?.split('/')[1] || 'png';
  const filename = `image-${timestamp}-${index}.${extension}`;
  const filepath = path.join(outputDir, filename);

  // Save to file
  await fs.promises.writeFile(filepath, buffer);
  console.log(`Saved image to ${filepath}`);
}
```

For more information on generating images with the AI SDK, see the [AI SDK documentation](https://ai-sdk.dev/docs/ai-sdk-core/image-generation).


---

[View full sitemap](/docs/sitemap)
