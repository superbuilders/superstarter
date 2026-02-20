
# Flowise Provider

The **[Flowise provider](https://github.com/ahmedrowaihi/flowise-ai-sdk-provider)** allows you to easily integrate [Flowise](https://flowiseai.com/) chatflows with your applications using the AI SDK.

## Setup

The Flowise provider is available in the `@ahmedrowaihi/flowise-vercel-ai-sdk-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn']}>
  <Tab>
    <Snippet
      text="pnpm add @ahmedrowaihi/flowise-vercel-ai-sdk-provider"
      dark
    />
  </Tab>
  <Tab>
    <Snippet
      text="npm install @ahmedrowaihi/flowise-vercel-ai-sdk-provider"
      dark
    />
  </Tab>
  <Tab>
    <Snippet
      text="yarn add @ahmedrowaihi/flowise-vercel-ai-sdk-provider"
      dark
    />
  </Tab>
</Tabs>

## Provider Instance

You can import the provider factory from `@ahmedrowaihi/flowise-vercel-ai-sdk-provider`:

```ts
import { createFlowiseProvider } from '@ahmedrowaihi/flowise-vercel-ai-sdk-provider';
```

## Quick Start

### Using a Reusable Provider

Create a file called `.env.local` and add your Flowise configuration:

```text
FLOWISE_BASE_URL=https://your-flowise-instance.com
FLOWISE_API_KEY=your_api_key_optional
```

```ts
import { createFlowiseProvider } from '@ahmedrowaihi/flowise-vercel-ai-sdk-provider';
import { generateText } from 'ai';

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL!,
  apiKey: process.env.FLOWISE_API_KEY,
});

const { text } = await generateText({
  model: flowise('your-chatflow-id'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Using a One-shot Model

```ts
import { createFlowiseModel } from '@ahmedrowaihi/flowise-vercel-ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: createFlowiseModel({
    baseUrl: process.env.FLOWISE_BASE_URL!,
    apiKey: process.env.FLOWISE_API_KEY,
    chatflowId: 'your-chatflow-id',
  }),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Streaming Example

```ts
import { streamText } from 'ai';
import { createFlowiseProvider } from '@ahmedrowaihi/flowise-vercel-ai-sdk-provider';

const flowise = createFlowiseProvider({
  baseUrl: process.env.FLOWISE_BASE_URL!,
  apiKey: process.env.FLOWISE_API_KEY,
});

const result = streamText({
  model: flowise('your-chatflow-id'),
  prompt: 'Write a story about a robot learning to cook.',
});

return result.toDataStreamResponse();
```

## More Information

For more information and advanced usage, see the [Flowise provider documentation](https://github.com/ahmedrowaihi/flowise-ai-sdk-provider#readme).


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
