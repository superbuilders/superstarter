
# Ollama Provider

The AI SDK supports [Ollama](https://ollama.com/) through two community providers:

- [nordwestt/ollama-ai-provider-v2](https://github.com/nordwestt/ollama-ai-provider-v2) - Direct HTTP API integration
- [ai-sdk-ollama](https://github.com/jagreehal/ai-sdk-ollama) - Built on the official Ollama JavaScript client

Both provide language model support for the AI SDK with different approaches and feature sets.

## Choosing Your Provider

The AI SDK ecosystem offers multiple Ollama providers, each optimized for different use cases:

### For Simple Text Generation

[nordwestt/ollama-ai-provider-v2](https://github.com/nordwestt/ollama-ai-provider-v2) provides straightforward access to Ollama models with direct HTTP API calls, making it ideal for basic text generation and getting started quickly.

### For Advanced Features & Tool Reliability

[`ai-sdk-ollama` by jagreehal](https://github.com/jagreehal/ai-sdk-ollama) is recommended when you need:

- **Reliable tool calling** with guaranteed complete responses (solves common empty response issues)
- **Web search capabilities** using [Ollama's new web search API](https://docs.ollama.com/web-search) for current information
- **Cross-environment support** with automatic detection for Node.js and browsers
- **Advanced Ollama features** like `mirostat`, `repeat_penalty`, `num_ctx` for fine-tuned control
- **Enhanced reliability** with built-in error handling and retries via the official client

Key technical advantages:

- Built on the official [`Ollama`](https://www.npmjs.com/package/ollama) JavaScript client library
- Supports both CommonJS and ESM module formats
- Full TypeScript support with type-safe Ollama-specific options

Both providers implement the AI SDK specification and offer excellent TypeScript support. Choose based on your project's complexity and feature requirements.

## Setup

Choose and install your preferred Ollama provider:

### ollama-ai-provider-v2

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add ollama-ai-provider-v2" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install ollama-ai-provider-v2" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add ollama-ai-provider-v2" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add ollama-ai-provider-v2" dark />
  </Tab>
</Tabs>

### ai-sdk-ollama

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add ai-sdk-ollama" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install ai-sdk-ollama" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add ai-sdk-ollama" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add ai-sdk-ollama" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `ollama` from `ollama-ai-provider-v2`:

```ts
import { ollama } from 'ollama-ai-provider-v2';
```

If you need a customized setup, you can import `createOllama` from `ollama-ai-provider-v2` and create a provider instance with your settings:

```ts
import { createOllama } from 'ollama-ai-provider-v2';

const ollama = createOllama({
  // optional settings, e.g.
  baseURL: 'https://api.ollama.com',
});
```

You can use the following optional settings to customize the Ollama provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls, e.g. to use proxy servers.
  The default prefix is `http://localhost:11434/api`.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

## Language Models

You can create models that call the [Ollama Chat Completion API](https://github.com/ollama/ollama/blob/main/docs/api.md#generate-a-chat-completion) using the provider instance.
The first argument is the model id, e.g. `phi3`. Some models have multi-modal capabilities.

```ts
const model = ollama('phi3');
```

You can find more models on the [Ollama Library](https://ollama.com/library) homepage.

### Model Capabilities

This provider is capable of using hybrid reasoning models such as qwen3, allowing toggling of reasoning between messages.

```ts
import { ollama } from 'ollama-ai-provider-v2';
import { generateText } from 'ai';

const { text } = await generateText({
  model: ollama('qwen3:4b'),
  providerOptions: { ollama: { think: true } },
  prompt:
    'Write a vegetarian lasagna recipe for 4 people, but really think about it',
});
```

## Embedding Models

You can create models that call the [Ollama embeddings API](https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings)
using the `.embeddingModel()` factory method.

```ts
const model = ollama.embeddingModel('nomic-embed-text');

const { embeddings } = await embedMany({
  model: model,
  values: ['sunny day at the beach', 'rainy afternoon in the city'],
});

console.log(
  `cosine similarity: ${cosineSimilarity(embeddings[0], embeddings[1])}`,
);
```


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
