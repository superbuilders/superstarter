---
title: Text-to-Video
product: vercel
url: /docs/ai-gateway/capabilities/video-generation/text-to-video
type: conceptual
prerequisites:
  - /docs/ai-gateway/capabilities/video-generation
  - /docs/ai-gateway/capabilities
related:
  []
summary: Learn about text-to-video on Vercel.
---

# Text-to-Video Generation

Generate videos from text prompts. Describe what you want to see and the model creates a video matching your description.

## Google Veo

Google's Veo models generate high-quality videos with optional audio. Veo 3.1 supports up to 4K resolution.

> **💡 Note:** Veo videos are always 8 seconds. Duration is fixed and cannot be changed.

### Models

| Model                              | Description                                       |
| ---------------------------------- | ------------------------------------------------- |
| `google/veo-3.1-generate-001`      | Latest model with 4K support and audio generation |
| `google/veo-3.1-fast-generate-001` | Fast generation with 4K support                   |
| `google/veo-3.0-generate-001`      | Previous generation, 1080p max                    |
| `google/veo-3.0-fast-generate-001` | Faster generation, lower quality                  |

### Parameters

| Parameter                              | Type      | Required | Description                                                       |
| -------------------------------------- | --------- | -------- | ----------------------------------------------------------------- |
| `prompt`                               | `string`  | Yes      | Text description of the video to generate                         |
| `aspectRatio`                          | `string`  | No       | Aspect ratio (e.g., `'16:9'`, `'9:16'`)                           |
| `resolution`                           | `string`  | No       | Resolution (e.g., `'1920x1080'`, `'3840x2160'` for 4K on Veo 3.1) |
| `providerOptions.vertex.generateAudio` | `boolean` | No       | Generate audio alongside the video. Defaults to `false`           |

### Example

```typescript filename="veo-text-to-video.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'google/veo-3.1-generate-001',
  prompt: 'A pangolin curled on a mossy stone in a glowing bioluminescent forest',
  aspectRatio: '16:9',
  resolution: '1920x1080',
  providerOptions: {
    vertex: {
      generateAudio: true,
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

***

## KlingAI

KlingAI offers text-to-video with standard and professional quality modes. Audio generation requires v2.6+ models. Duration is 5-10 seconds.

### Models

| Model                          | Description                                            |
| ------------------------------ | ------------------------------------------------------ |
| `klingai/kling-v3.0-t2v`       | Multi-shot generation, 15s clips, enhanced consistency |
| `klingai/kling-v2.6-t2v`       | Audio-visual co-generation, cinematic motion           |
| `klingai/kling-v2.5-turbo-t2v` | Faster generation, lower cost                          |

### Parameters

| Parameter                                | Type               | Required | Description                                                                          |
| ---------------------------------------- | ------------------ | -------- | ------------------------------------------------------------------------------------ |
| `prompt`                                 | `string`           | Yes      | Text description of the video to generate. Max 2500 characters.                      |
| `aspectRatio`                            | `string`           | No       | Aspect ratio (`'16:9'`, `'9:16'`, `'1:1'`). Defaults to `'16:9'`.                    |
| `duration`                               | `5` | `10`        | No       | Video length in seconds. Defaults to `5`.                                            |
| `providerOptions.klingai.mode`           | `'std'` | `'pro'` | No       | `'std'` for standard quality. `'pro'` for professional quality. Defaults to `'std'`. |
| `providerOptions.klingai.negativePrompt` | `string`           | No       | What to avoid in the video. Max 2500 characters.                                     |
| `providerOptions.klingai.sound`          | `'on'` | `'off'`  | No       | Generate audio. Defaults to `'off'`. Requires v2.6+.                                 |
| `providerOptions.klingai.cfgScale`       | `number`           | No       | Prompt adherence (0-1). Higher = stricter. Defaults to `0.5`. Not supported on v2.x. |
| `providerOptions.klingai.watermarkInfo`  | `object`           | No       | Set `{ enabled: true }` to generate watermarked result.                              |
| `providerOptions.klingai.pollIntervalMs` | `number`           | No       | How often to check task status. Defaults to `5000`.                                  |
| `providerOptions.klingai.pollTimeoutMs`  | `number`           | No       | Maximum wait time. Defaults to `600000` (10 minutes).                                |

### Example

```typescript filename="klingai-text-to-video.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'klingai/kling-v2.6-t2v',
  prompt: 'A chicken flying into the sunset in the style of 90s anime',
  aspectRatio: '16:9',
  duration: 5,
  providerOptions: {
    klingai: {
      mode: 'std',
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

### Camera control

Control camera movement during video generation.

| Parameter                                      | Type     | Required | Description                                                 |
| ---------------------------------------------- | -------- | -------- | ----------------------------------------------------------- |
| `providerOptions.klingai.cameraControl.type`   | `string` | Yes      | Camera movement type. See options below.                    |
| `providerOptions.klingai.cameraControl.config` | `object` | No       | Movement configuration. Required when `type` is `'simple'`. |

**Camera movement types:**

| Type                   | Description                        | Config required |
| ---------------------- | ---------------------------------- | --------------- |
| `'simple'`             | Basic movement with one axis       | Yes             |
| `'down_back'`          | Camera descends and moves backward | No              |
| `'forward_up'`         | Camera moves forward and tilts up  | No              |
| `'right_turn_forward'` | Rotate right then move forward     | No              |
| `'left_turn_forward'`  | Rotate left then move forward      | No              |

**Simple camera config options** (use only one, set others to 0):

| Config       | Range     | Description                                                  |
| ------------ | --------- | ------------------------------------------------------------ |
| `horizontal` | \[-10, 10] | Camera translation along x-axis. Negative = left.            |
| `vertical`   | \[-10, 10] | Camera translation along y-axis. Negative = down.            |
| `pan`        | \[-10, 10] | Camera rotation around y-axis. Negative = left.              |
| `tilt`       | \[-10, 10] | Camera rotation around x-axis. Negative = down.              |
| `roll`       | \[-10, 10] | Camera rotation around z-axis. Negative = counter-clockwise. |
| `zoom`       | \[-10, 10] | Focal length change. Negative = narrower FOV.                |

```typescript filename="camera-control.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'klingai/kling-v2.6-t2v',
  prompt: 'A serene mountain landscape at sunset',
  aspectRatio: '16:9',
  providerOptions: {
    klingai: {
      mode: 'std',
      cameraControl: {
        type: 'simple',
        config: {
          zoom: 5,
          horizontal: 0,
          vertical: 0,
          pan: 0,
          tilt: 0,
          roll: 0,
        },
      },
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

***

## Wan

Wan (by Alibaba) offers text-to-video with prompt enhancement and multiple resolution options. Use `resolution` parameter (e.g., `'1280x720'`), not `aspectRatio`.

### Models

| Model                          | Description                              |
| ------------------------------ | ---------------------------------------- |
| `alibaba/wan-v2.6-t2v`         | Latest model with 720p and 1080p support |
| `alibaba/wan-v2.5-t2v-preview` | Preview model with 480p, 720p, and 1080p |

### Parameters

| Parameter                                | Type      | Required | Description                                           |
| ---------------------------------------- | --------- | -------- | ----------------------------------------------------- |
| `prompt`                                 | `string`  | Yes      | Text description of the video to generate             |
| `resolution`                             | `string`  | No       | Resolution (e.g., `'1280x720'`, `'1920x1080'`)        |
| `duration`                               | `number`  | No       | Video length in seconds                               |
| `providerOptions.alibaba.promptExtend`   | `boolean` | No       | Automatically enhance the prompt. Defaults to `false` |
| `providerOptions.alibaba.pollIntervalMs` | `number`  | No       | How often to check task status. Defaults to `5000`    |
| `providerOptions.alibaba.pollTimeoutMs`  | `number`  | No       | Maximum wait time. Defaults to `600000` (10 minutes)  |

### Example

```typescript filename="wan-text-to-video.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'alibaba/wan-v2.6-t2v',
  prompt: 'A chicken flying into the sunset in the style of 90s anime',
  resolution: '1280x720',
  duration: 5,
  providerOptions: {
    alibaba: {
      promptExtend: true,
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

***

## Grok Imagine Video

Grok Imagine Video (by xAI) generates videos from text prompts with support for multiple aspect ratios and resolutions. Duration ranges from 1-15 seconds.

### Models

| Model                    | Duration | Aspect Ratios                       | Resolution |
| ------------------------ | -------- | ----------------------------------- | ---------- |
| `xai/grok-imagine-video` | 1-15s    | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3 | 480p, 720p |

### Parameters

| Parameter                            | Type                 | Required | Description                                                                                          |
| ------------------------------------ | -------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `prompt`                             | `string`             | Yes      | Text description of the video to generate                                                            |
| `aspectRatio`                        | `string`             | No       | Aspect ratio (`'16:9'`, `'9:16'`, `'1:1'`, `'4:3'`, `'3:4'`, `'3:2'`, `'2:3'`). Defaults to `'16:9'` |
| `duration`                           | `number`             | No       | Video length in seconds (1-15)                                                                       |
| `resolution`                         | `string`             | No       | Resolution (`'854x480'` for 480p, `'1280x720'` for 720p). Defaults to 480p                           |
| `providerOptions.xai.resolution`     | `'480p'` | `'720p'` | No       | Native resolution format. Alternative to standard `resolution` parameter                             |
| `providerOptions.xai.pollIntervalMs` | `number`             | No       | How often to check task status. Defaults to `5000`                                                   |
| `providerOptions.xai.pollTimeoutMs`  | `number`             | No       | Maximum wait time. Defaults to `600000` (10 minutes)                                                 |

### Example

```typescript filename="grok-imagine-video.ts"
import { experimental_generateVideo as generateVideo } from 'ai';
import fs from 'node:fs';

const result = await generateVideo({
  model: 'xai/grok-imagine-video',
  prompt: 'A chicken flying into the sunset in the style of 90s anime',
  aspectRatio: '16:9',
  duration: 5,
  providerOptions: {
    xai: {
      pollTimeoutMs: 600000,
    },
  },
});

fs.writeFileSync('output.mp4', result.videos[0].uint8Array);
```

> **💡 Note:** Video generation can take several minutes. Set `pollTimeoutMs` to at least 10
> minutes (600000ms) for reliable operation. Generated video URLs are ephemeral
> and should be downloaded promptly.


---

[View full sitemap](/docs/sitemap)
