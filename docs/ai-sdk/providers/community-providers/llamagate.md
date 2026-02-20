
# LlamaGate

[LlamaGate](https://llamagate.dev) is an OpenAI-compatible API gateway providing access to 26+ open-source LLMs with competitive pricing. Perfect for indie developers and startups who want affordable access to models like Llama, Qwen, DeepSeek, and Mistral.

- **26+ Open-Source Models**: Access Llama, Mistral, DeepSeek R1, Qwen, and more
- **OpenAI-Compatible API**: Drop-in replacement for existing OpenAI integrations
- **Competitive Pricing**: $0.02-$0.55 per 1M tokens
- **Vision Models**: Qwen VL, LLaVA for multimodal tasks
- **Reasoning Models**: DeepSeek R1 for complex problem-solving
- **Code Models**: CodeLlama, DeepSeek Coder, Qwen Coder
- **Embedding Models**: Nomic Embed Text, Qwen 3 Embedding

Learn more about LlamaGate's capabilities in the [LlamaGate Documentation](https://llamagate.dev/docs).

## Setup

The LlamaGate provider is available in the `@llamagate/ai-sdk-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @llamagate/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @llamagate/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @llamagate/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @llamagate/ai-sdk-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

To create a LlamaGate provider instance, use the `createLlamaGate` function:

```typescript
import { createLlamaGate } from '@llamagate/ai-sdk-provider';

const llamagate = createLlamaGate({
  apiKey: 'YOUR_LLAMAGATE_API_KEY',
});
```

You can obtain your LlamaGate API key from the [LlamaGate Dashboard](https://llamagate.dev/dashboard).

Alternatively, you can use the default instance which reads from the `LLAMAGATE_API_KEY` environment variable:

```typescript
import { llamagate } from '@llamagate/ai-sdk-provider';
```

## Language Models

LlamaGate provides chat models via the `llamagate()` function or `llamagate.chatModel()`:

```typescript
// Default usage
const model = llamagate('llama-3.1-8b');

// Explicit chat model
const chatModel = llamagate.chatModel('qwen3-8b');
```

### Available Models

| Model ID              | Description                 | Context |
| --------------------- | --------------------------- | ------- |
| `llama-3.1-8b`        | Llama 3.1 8B Instruct       | 131K    |
| `llama-3.2-3b`        | Llama 3.2 3B                | 131K    |
| `qwen3-8b`            | Qwen 3 8B                   | 32K     |
| `mistral-7b-v0.3`     | Mistral 7B v0.3             | 32K     |
| `deepseek-r1-8b`      | DeepSeek R1 8B (Reasoning)  | 64K     |
| `deepseek-r1-7b-qwen` | DeepSeek R1 Distill Qwen 7B | 131K    |
| `openthinker-7b`      | OpenThinker 7B              | 32K     |
| `dolphin3-8b`         | Dolphin 3 8B                | 128K    |
| `qwen2.5-coder-7b`    | Qwen 2.5 Coder 7B           | 32K     |
| `codellama-7b`        | CodeLlama 7B                | 16K     |
| `qwen3-vl-8b`         | Qwen 3 VL 8B (Vision)       | 32K     |
| `llava-7b`            | LLaVA 1.5 7B (Vision)       | 4K      |
| `gemma3-4b`           | Gemma 3 4B (Vision)         | 128K    |

You can find the full list of available models in the [LlamaGate Models documentation](https://llamagate.dev/docs/models).

## Embedding Models

LlamaGate provides text embedding models via `llamagate.textEmbeddingModel()`:

```typescript
const embeddingModel = llamagate.textEmbeddingModel('nomic-embed-text');
```

### Available Embedding Models

| Model ID              | Description         | Context |
| --------------------- | ------------------- | ------- |
| `nomic-embed-text`    | Nomic Embed Text    | 8K      |
| `embeddinggemma-300m` | EmbeddingGemma 300M | 2K      |
| `qwen3-embedding-8b`  | Qwen 3 Embedding 8B | 40K     |

## Examples

Here are examples of using LlamaGate with the AI SDK:

### `generateText`

```typescript
import { createLlamaGate } from '@llamagate/ai-sdk-provider';
import { generateText } from 'ai';

const llamagate = createLlamaGate({
  apiKey: 'YOUR_LLAMAGATE_API_KEY',
});

const { text } = await generateText({
  model: llamagate('llama-3.1-8b'),
  prompt: 'Explain quantum computing in simple terms.',
});

console.log(text);
```

### `streamText`

```typescript
import { createLlamaGate } from '@llamagate/ai-sdk-provider';
import { streamText } from 'ai';

const llamagate = createLlamaGate({
  apiKey: 'YOUR_LLAMAGATE_API_KEY',
});

const result = streamText({
  model: llamagate('qwen3-8b'),
  prompt: 'Write a short story about a robot.',
});

for await (const chunk of result) {
  console.log(chunk);
}
```

### `embed`

```typescript
import { createLlamaGate } from '@llamagate/ai-sdk-provider';
import { embed } from 'ai';

const llamagate = createLlamaGate({
  apiKey: 'YOUR_LLAMAGATE_API_KEY',
});

const { embedding } = await embed({
  model: llamagate.textEmbeddingModel('nomic-embed-text'),
  value: 'The quick brown fox jumps over the lazy dog.',
});

console.log(embedding);
```

### Vision

```typescript
import { createLlamaGate } from '@llamagate/ai-sdk-provider';
import { generateText } from 'ai';

const llamagate = createLlamaGate({
  apiKey: 'YOUR_LLAMAGATE_API_KEY',
});

const { text } = await generateText({
  model: llamagate('qwen3-vl-8b'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image', image: new URL('https://example.com/image.jpg') },
      ],
    },
  ],
});

console.log(text);
```

## Additional Resources

- [LlamaGate Website](https://llamagate.dev)
- [LlamaGate Documentation](https://llamagate.dev/docs)
- [LlamaGate Dashboard](https://llamagate.dev/dashboard)
- [GitHub Repository](https://github.com/llamagate/llama-gate)


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
