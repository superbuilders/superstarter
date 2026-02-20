
# Supermemory

[Supermemory](https://supermemory.ai) is a long-term memory platform that adds persistent, self-growing memory to your AI applications. The Supermemory provider for the AI SDK enables you to build AI applications with memory that works like the human brain:

- **Persistent Memory**: Long-term storage that grows with each interaction
- **Semantic Search**: Find relevant memories using natural language queries
- **Automatic Memory Management**: AI automatically saves and retrieves relevant information
- **Easy Integration**: Simple setup with existing AI SDK applications
- **Memory Router**: Direct integration with language model providers
- **Free Tier Available**: Get started with a free API key

Learn more about Supermemory's capabilities in the [Supermemory Documentation](https://supermemory.ai/docs/ai-sdk/overview).

## Setup

The Supermemory provider is available in the `@supermemory/tools` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @supermemory/tools" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @supermemory/tools" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @supermemory/tools" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @supermemory/tools" dark />
  </Tab>
</Tabs>

## Provider Instance

You can obtain your Supermemory API key for free at [https://console.supermemory.ai](https://console.supermemory.ai).

There are two ways to integrate Supermemory with your AI applications:

**1. Using Supermemory Tools**

Import and use Supermemory tools with your existing AI SDK setup:

```typescript
import { supermemoryTools } from '@supermemory/tools/ai-sdk';
```

**2. Using the Memory Router**

Use the Memory Router for direct integration with language model providers:

```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const supermemoryRouter = createAnthropic({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id',
  },
});
```

## Examples

Here are examples of using Supermemory with the AI SDK:

### `generateText` with Tools

```javascript
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';

const openai = createOpenAI({
  apiKey: 'YOUR_OPENAI_KEY',
});

const { text } = await generateText({
  model: openai('gpt-4-turbo'),
  prompt: 'Remember that my name is Alice',
  tools: supermemoryTools('YOUR_SUPERMEMORY_KEY'),
});

console.log(text);
```

### `streamText` with Automatic Memory

```javascript
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { supermemoryTools } from '@supermemory/tools/ai-sdk';

const openai = createOpenAI({
  apiKey: 'YOUR_OPENAI_KEY',
});

const result = streamText({
  model: openai('gpt-4'),
  prompt: 'What are my dietary preferences?',
  tools: supermemoryTools('YOUR_SUPERMEMORY_KEY'),
});

// The AI will automatically call searchMemories tool
// Example tool call:
// searchMemories({ informationToGet: "dietary preferences and restrictions" })
// OR
// addMemory({ memory: "User is allergic to peanuts" })

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Using Memory Router

```javascript
import { streamText } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';

const supermemoryRouter = createAnthropic({
  baseUrl: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
  apiKey: 'your-provider-api-key',
  headers: {
    'x-supermemory-api-key': 'supermemory-api-key',
    'x-sm-conversation-id': 'conversation-id',
  },
});

const result = streamText({
  model: supermemoryRouter('claude-3-sonnet'),
  messages: [
    { role: 'user', content: 'Hello! Remember that I love TypeScript.' },
  ],
});
```

For more information about these features and advanced configuration options, visit the [Supermemory Documentation](https://supermemory.ai/docs/).

## Additional Resources

- [Supermemory Documentation](https://supermemory.ai/docs/?ref=ai-sdk)
- [AI SDK Integration Cookbook](https://supermemory.ai/docs/cookbook/ai-sdk-integration)
- [Supermemory Console](https://console.supermemory.ai)
- [Memory Engine Blog Post](https://supermemory.ai/blog/memory-engine/)


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
