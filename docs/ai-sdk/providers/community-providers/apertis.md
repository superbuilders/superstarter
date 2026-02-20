
# Apertis Provider

[Apertis](https://apertis.ai) is a unified AI gateway providing access to 470+ models from leading providers including OpenAI, Anthropic, Google, and more through a single API.

## Key Features

- **One API Key**: Access 470+ models from multiple providers with a single API key
- **Pay-as-you-go**: Transparent pricing with no monthly fees
- **Enterprise Ready**: High availability infrastructure with automatic failover
- **OpenAI Compatible**: Drop-in replacement for OpenAI API
- **Latest Models**: Immediate access to newly released models

## Setup

<Tabs items={['pnpm', 'npm', 'yarn']}>
  <Tab>
    <Snippet text="pnpm add @apertis/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @apertis/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @apertis/ai-sdk-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default `apertis` provider instance or create a custom one:

```ts
import { apertis } from '@apertis/ai-sdk-provider';
```

Or create a custom instance with your API key:

```ts
import { createApertis } from '@apertis/ai-sdk-provider';

const apertis = createApertis({
  apiKey: process.env.APERTIS_API_KEY,
});
```

Get your API key from the [Apertis Dashboard](https://apertis.ai/token).

## Language Models

Access chat models using `apertis()` or `apertis.chat()`:

```ts
const model = apertis('gpt-5.2');
// or
const model = apertis.chat('claude-sonnet-4.5');
```

### Supported Models

- **OpenAI**: `gpt-5.2`, `gpt-5.2-chat`, `gpt-5.2-pro`
- **Anthropic**: `claude-opus-4-5-20251101`, `claude-sonnet-4.5`, `claude-haiku-4.5`
- **Google**: `gemini-3-pro-preview`, `gemini-3-flash-preview`, `gemini-2.5-pro`
- **Other**: `glm-4.7`, `minimax-m2.1`, and 470+ more

## Embedding Models

Create text embeddings using `apertis.textEmbeddingModel()`:

```ts
const embeddingModel = apertis.textEmbeddingModel('text-embedding-3-small');
```

### Supported Embedding Models

- `text-embedding-3-small`
- `text-embedding-3-large`
- `text-embedding-ada-002`

## Examples

### Generate Text

```ts
import { apertis } from '@apertis/ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: apertis('gpt-5.2'),
  prompt: 'Explain quantum computing in simple terms.',
});
```

### Stream Text

```ts
import { apertis } from '@apertis/ai-sdk-provider';
import { streamText } from 'ai';

const { textStream } = await streamText({
  model: apertis('claude-sonnet-4.5'),
  prompt: 'Write a haiku about programming.',
});

for await (const chunk of textStream) {
  process.stdout.write(chunk);
}
```

### Generate Embeddings

```ts
import { apertis } from '@apertis/ai-sdk-provider';
import { embed } from 'ai';

const { embedding } = await embed({
  model: apertis.textEmbeddingModel('text-embedding-3-small'),
  value: 'Hello world',
});
```

## Additional Resources

- [GitHub Repository](https://github.com/apertis-ai/apertis-sdk)
- [Apertis Documentation](https://docs.apertis.ai)
- [Apertis Dashboard](https://apertis.ai/token)


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
