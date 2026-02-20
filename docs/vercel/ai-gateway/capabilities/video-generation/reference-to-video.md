---
title: Reference-to-Video
product: vercel
url: /docs/ai-gateway/capabilities/video-generation/reference-to-video
type: conceptual
prerequisites:
  - /docs/ai-gateway/capabilities/video-generation
  - /docs/ai-gateway/capabilities
related:
  - /docs/ai-gateway/capabilities/video-generation/image-to-video
  - /docs/vercel-blob
summary: Learn about reference-to-video on Vercel.
---

# Reference-to-Video Generation

Generate a completely new video scene featuring characters from reference media.

This is different from [image-to-video](/docs/ai-gateway/capabilities/video-generation/image-to-video), which animates an existing image. With reference-to-video, the reference images only show the model what your characters look like. They don't become the video content. Instead, your prompt describes a completely new scene, and the model generates that scene from scratch with your characters in it.

For example, you could provide photos of a cat and a dog, then prompt "character1 and character2 have a conversation in a cafe." The model creates that cafe scene from scratch, using the reference images only to understand what the characters look like.

## Wan

Wan's reference-to-video models can incorporate multiple characters from reference media into a generated video. References must be URLs (use [Vercel Blob](/docs/vercel-blob) for local files). Use `character1`, `character2`, etc. in your prompt to refer to each reference.

### Models

| Model                        | Description                         |
| ---------------------------- | ----------------------------------- |
| `alibaba/wan-v2.6-r2v`       | Standard quality reference-to-video |
| `alibaba/wan-v2.6-r2v-flash` | Faster generation                   |

### Parameters

| Parameter                                | Type                    | Required | Description                                                                          |
| ---------------------------------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------ |
| `prompt`                                 | `string`                | Yes      | Scene description using `character1`, `character2`, etc. to reference each character |
| `resolution`                             | `string`                | No       | Resolution (`'1280x720'` or `'1920x1080'`)                                           |
| `duration`                               | `number`                | No       | Video length in seconds                                                              |
| `providerOptions.alibaba.referenceUrls`  | `string[]`              | Yes      | Array of URLs to reference images or videos                                          |
| `providerOptions.alibaba.shotType`       | `'single'` | `'multi'` | No       | `'single'` for continuous shot. `'multi'` for multiple camera angles                 |
| `providerOptions.alibaba.pollIntervalMs` | `number`                | No       | How often to check task status. Defaults to `5000`                                   |
| `providerOptions.alibaba.pollTimeoutMs`  | `number`                | No       | Maximum wait time. Defaults to `600000` (10 minutes)                                 |

### Example

```typescript filename="reference-to-video.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'alibaba/wan-v2.6-r2v',
  prompt: 'character1 and character2 have a friendly conversation in a cozy cafe',
  resolution: '1920x1080',
  duration: 4,
  providerOptions: {
    alibaba: {
      // References can be images or videos
      referenceUrls: [
        'https://example.com/cat.png',
        'https://example.com/dog.png',
      ],
      shotType: 'single',
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

### Example with Vercel Blob

If you have local files, upload them to [Vercel Blob](/docs/vercel-blob) first:

```typescript filename="reference-to-video-with-blob.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import { put } from '@vercel/blob';
import fs from 'node:fs';

const catImage = fs.readFileSync('./cat.png');
const { url: catUrl } = await put('cat.png', catImage, { access: 'public' });

const dogImage = fs.readFileSync('./dog.png');
const { url: dogUrl } = await put('dog.png', dogImage, { access: 'public' });

const result = await generateVideo({
  model: 'alibaba/wan-v2.6-r2v',
  prompt: 'character1 and character2 play together in a sunny garden',
  resolution: '1280x720',
  duration: 4,
  providerOptions: {
    alibaba: {
      referenceUrls: [catUrl, dogUrl],
      shotType: 'single',
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```


---

[View full sitemap](/docs/sitemap)
