
# AI/ML API Provider

The [AI/ML API](https://aimlapi.com/?utm_source=aimlapi-vercel-ai&utm_medium=github&utm_campaign=integration) provider gives access to more than 300 AI models over an OpenAI-compatible API.

## Setup

The AI/ML API provider is available via the `@ai-ml.api/aimlapi-vercel-ai` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-ml.api/aimlapi-vercel-ai" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-ml.api/aimlapi-vercel-ai" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-ml.api/aimlapi-vercel-ai" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @ai-ml.api/aimlapi-vercel-ai" dark />
  </Tab>
</Tabs>

### API Key

Set the `AIMLAPI_API_KEY` environment variable with your key:

```bash
export AIMLAPI_API_KEY="sk-..."
```

## Provider Instance

You can import the default provider instance `aimlapi`:

```ts
import { aimlapi } from '@ai-ml.api/aimlapi-vercel-ai';
```

## Language Models

Create models for text generation with `aimlapi` and use them with `generateText`:

```ts
import { aimlapi } from '@ai-ml.api/aimlapi-vercel-ai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: aimlapi('gpt-4o'),
  system: 'You are a friendly assistant!',
  prompt: 'Why is the sky blue?',
});
```

## Image Generation

You can generate images by calling `doGenerate` on an image model:

```ts
import { aimlapi } from '@ai-ml.api/aimlapi-vercel-ai';

const model = aimlapi.imageModel('flux-pro');

const res = await model.doGenerate({
  prompt: 'a red balloon floating over snowy mountains, cinematic',
  n: 1,
  aspectRatio: '16:9',
  seed: 42,
  size: '1024x768',
  providerOptions: {},
});

console.log(`✅ Generated image url: ${res.images[0]}`);
```

## Embeddings

AI/ML API also supports embedding models:

```ts
import { aimlapi } from '@ai-ml.api/aimlapi-vercel-ai';
import { embed } from 'ai';

const { embedding } = await embed({
  model: aimlapi.embeddingModel('text-embedding-3-large'),
  value: 'sunny day at the beach',
});
```

For more information and a full model list, visit the [AI/ML API dashboard](https://aimlapi.com/app?utm_source=aimlapi-vercel-ai&utm_medium=github&utm_campaign=integration) and the [AI/ML API documentation](https://docs.aimlapi.com/?utm_source=aimlapi-vercel-ai&utm_medium=github&utm_campaign=integration).


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
