
# Firemoon Provider

[Firemoon Studio](https://firemoon.studio/) is an AI platform specializing in high-quality image and video generation models, specifically fine-tunes and state-of-the-art models.

The Firemoon provider for the AI SDK enables you to use these models with a simple, consistent API:

- **Image generation**: Generate images today, with early video model support.
- **Model variety**: Access multiple model families through a single provider.
- **Provider options**: Pass model-specific parameters when you need more control.

## Setup

The Firemoon provider is available via the `@firemoon/ai-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @firemoon/ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @firemoon/ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @firemoon/ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @firemoon/ai-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

Create a Firemoon provider instance with your API key:

```ts
import { createFiremoon } from '@firemoon/ai-provider';

const firemoon = createFiremoon({
  apiKey: process.env.FIREMOON_API_KEY,
});
```

You can obtain your Firemoon API key from the [Firemoon Dashboard](https://firemoon.studio/keys).

## Image Generation

Firemoon supports various image generation models through the `image()` method:

```ts
import { generateImage } from 'ai';

const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'An orangered moon with a dark background',
  size: 'square_hd',
});

console.log(result.images[0]);
```

### Available Models

- `flux/dev` - Fast, high-quality image generation
- `flux-2-dev/edit` - Fast, high-quality image editing with Flux 2
- `nano-banana` - Fast, high-quality image generation
- `nano-banana/edit` - High quality image editing by Gemini, also known as Gemini 2.5 Flash Image
- `nano-banana-pro/edit` - High quality image editing by Gemini 3 Pro
- `firemoon-studio/memphis-style` - Memphis style image generation

You can browse all available models on the [Firemoon Studio Models](https://firemoon.studio/models) page.

### Parameters

#### Size

You can specify the image size using the `size` parameter:

```ts
const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'A beautiful landscape with an orangered moon in the background',
  size: 'square_hd', // or 'landscape_16_9', etc.
});
```

Or use aspect ratio mapping:

```ts
const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'A beautiful landscape with an orangered moon in the background',
  aspectRatio: '16:9', // maps to landscape_16_9
});
```

#### Seed

For reproducible results, you can specify a seed:

```ts
const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'A beautiful landscape with an orangered moon in the background',
  seed: 12345,
});
```

#### Custom Parameters

You can pass additional parameters specific to Firemoon models:

```ts
const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'A beautiful landscape with an orangered moon in the background',
  providerOptions: {
    firemoon: {
      // custom parameters
    },
  },
});
```

#### Fine-tuned Models

You can use a fine-tuned model by passing the model id to the `image()` method:

```ts
const result = await generateImage({
  model: firemoon.image('firemoon-studio/memphis-style'),
  prompt: 'a man smiling at the camera',
  size: 'landscape_16_9',
  providerOptions: {
    firemoon: {
      lora_scale: 0.6,
      num_images: 1,
      image_size: 'landscape_4_3',
      output_format: 'jpeg',
      guidance_scale: 3.5,
      num_inference_steps: 28,
      enable_safety_checker: true,
    },
  },
});
```

## Quickstart Examples

### `generateImage`

```ts
import { createFiremoon } from '@firemoon/ai-provider';
import { generateImage } from 'ai';

const firemoon = createFiremoon({
  apiKey: process.env.FIREMOON_API_KEY,
});

const result = await generateImage({
  model: firemoon.image('flux/dev'),
  prompt: 'A beautiful landscape with an orangered moon in the background',
  aspectRatio: '16:9',
});

console.log(result.images[0]);
```

## Advanced features

1. **Aspect ratio mapping**: Use `aspectRatio` for convenient presets instead of hard-coding sizes.
2. **Reproducible outputs**: Provide `seed` to make results more repeatable.
3. **Model-specific options**: Use `providerOptions.firemoon` to pass through Firemoon parameters.

## Error handling

The Firemoon provider throws `APICallError` for API-related errors:

```ts
import { APICallError } from 'ai';

try {
  const result = await generateImage({
    model: firemoon.image('flux/dev'),
    prompt: 'A beautiful landscape with an orangered moon in the background',
  });
} catch (error) {
  if (error instanceof APICallError) {
    console.error('API Error:', error.message);
    console.error('Status:', error.statusCode);
  }
}
```

## Additional resources

- [Firemoon Studio](https://firemoon.studio/)
- [Firemoon Studio Models](https://firemoon.studio/models)
- [Firemoon Studio API Reference](https://docs.firemoon.studio)


## Navigation

- [Writing a Custom Provider](/providers/community-providers/custom-providers)
- [A2A](/providers/community-providers/a2a)
- [ACP (Agent Client Protocol)](/providers/community-providers/acp)
- [Aihubmix](/providers/community-providers/aihubmix)
- [AI/ML API](/providers/community-providers/aimlapi)
- [Anthropic Vertex](/providers/community-providers/anthropic-vertex-ai)
- [Automatic1111](/providers/community-providers/automatic1111)
- [Azure AI](/providers/community-providers/azure-ai)
- [Browser AI](/providers/community-providers/browser-ai)
- [Claude Code](/providers/community-providers/claude-code)
- [Cloudflare AI Gateway](/providers/community-providers/cloudflare-ai-gateway)
- [Cloudflare Workers AI](/providers/community-providers/cloudflare-workers-ai)
- [Codex CLI](/providers/community-providers/codex-cli)
- [Crosshatch](/providers/community-providers/crosshatch)
- [Dify](/providers/community-providers/dify)
- [Firemoon](/providers/community-providers/firemoon)
- [FriendliAI](/providers/community-providers/friendliai)
- [Gemini CLI](/providers/community-providers/gemini-cli)
- [Helicone](/providers/community-providers/helicone)
- [Inflection AI](/providers/community-providers/inflection-ai)
- [Jina AI](/providers/community-providers/jina-ai)
- [LangDB](/providers/community-providers/langdb)
- [Letta](/providers/community-providers/letta)
- [llama.cpp](/providers/community-providers/llama-cpp)
- [LlamaGate](/providers/community-providers/llamagate)
- [MCP Sampling AI Provider](/providers/community-providers/mcp-sampling)
- [Mem0](/providers/community-providers/mem0)
- [MiniMax](/providers/community-providers/minimax)
- [Mixedbread](/providers/community-providers/mixedbread)
- [Ollama](/providers/community-providers/ollama)
- [OpenCode](/providers/community-providers/opencode-sdk)
- [OpenRouter](/providers/community-providers/openrouter)
- [Portkey](/providers/community-providers/portkey)
- [Qwen](/providers/community-providers/qwen)
- [React Native Apple](/providers/community-providers/react-native-apple)
- [Requesty](/providers/community-providers/requesty)
- [Runpod](/providers/community-providers/runpod)
- [SambaNova](/providers/community-providers/sambanova)
- [SAP AI Core](/providers/community-providers/sap-ai)
- [Sarvam](/providers/community-providers/sarvam)
- [Soniox](/providers/community-providers/soniox)
- [Spark](/providers/community-providers/spark)
- [Supermemory](/providers/community-providers/supermemory)
- [Voyage AI](/providers/community-providers/voyage-ai)
- [Zhipu AI (Z.AI)](/providers/community-providers/zhipu)
- [vectorstores](/providers/community-providers/vectorstores)
- [Codex CLI (App Server)](/providers/community-providers/codex-app-server)
- [Apertis](/providers/community-providers/apertis)
- [OLLM](/providers/community-providers/ollm)
- [Flowise](/providers/community-providers/flowise)


[Full Sitemap](/sitemap.md)
