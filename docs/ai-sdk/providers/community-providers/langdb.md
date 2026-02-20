
# LangDB

<Note type="warning">
  This community provider is not yet compatible with AI SDK 5. Please wait for
  the provider to be updated or consider using an [AI SDK 5 compatible
  provider](/providers/ai-sdk-providers).
</Note>

[LangDB](https://langdb.ai) is a high-performance enterprise AI gateway built in Rust, designed to govern, secure, and optimize AI traffic.

LangDB provides OpenAI-compatible APIs, enabling developers to connect with multiple LLMs by changing just two lines of code. With LangDB, you can:

- Provide access to all major LLMs
- Enable plug-and-play functionality using any framework like Langchain, Vercel AI SDK, CrewAI, etc., for easy adoption.
- Simplify implementation of tracing and cost optimization features, ensuring streamlined operations.
- Dynamically route requests to the most suitable LLM based on predefined parameters.

## Setup

The LangDB provider is available via the `@langdb/vercel-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @langdb/vercel-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @langdb/vercel-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @langdb/vercel-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @langdb/vercel-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

To create a LangDB provider instance, use the `createLangDB` function:

```tsx
import { createLangDB } from '@langdb/vercel-provider';

const langdb = createLangDB({
  apiKey: process.env.LANGDB_API_KEY, // Required
  projectId: 'your-project-id', // Required
  threadId: uuidv4(), // Optional
  runId: uuidv4(), // Optional
  label: 'code-agent', // Optional
  headers: { 'Custom-Header': 'value' }, // Optional
});
```

You can find your LangDB API key in the [LangDB dashboard](https://app.langdb.ai).

## Examples

You can use LangDB with the `generateText` or `streamText` function:

### `generateText`

```tsx
import { createLangDB } from '@langdb/vercel-provider';
import { generateText } from 'ai';

const langdb = createLangDB({
  apiKey: process.env.LANGDB_API_KEY,
  projectId: 'your-project-id',
});

export async function generateTextExample() {
  const { text } = await generateText({
    model: langdb('openai/gpt-4o-mini'),
    prompt: 'Write a Python function that sorts a list:',
  });

  console.log(text);
}
```

### generateImage

```tsx
import { createLangDB } from '@langdb/vercel-provider';
import { generateImage } from 'ai';
import fs from 'fs';
import path from 'path';

const langdb = createLangDB({
  apiKey: process.env.LANGDB_API_KEY,
  projectId: 'your-project-id',
});

export async function generateImageExample() {
  const { images } = await generateImage({
    model: langdb.image('openai/dall-e-3'),
    prompt: 'A delighted resplendent quetzal mid-flight amidst raindrops',
  });

  const imagePath = path.join(__dirname, 'generated-image.png');
  fs.writeFileSync(imagePath, images[0].uint8Array);
  console.log(`Image saved to: ${imagePath}`);
}
```

### embed

```tsx
import { createLangDB } from '@langdb/vercel-provider';
import { embed } from 'ai';

const langdb = createLangDB({
  apiKey: process.env.LANGDB_API_KEY,
  projectId: 'your-project-id',
});

export async function generateEmbeddings() {
  const { embedding } = await embed({
    model: langdb.embeddingModel('text-embedding-3-small'),
    value: 'sunny day at the beach',
  });

  console.log('Embedding:', embedding);
}
```

## Supported Models

LangDB supports over 250+ models, enabling seamless interaction with a wide range of AI capabilities.

Checkout the [model list](https://app.langdb.ai/models) for more information.

For more information, visit the [LangDB documentation](https://docs.langdb.ai/).


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
