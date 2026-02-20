
# Dify Provider

The **[Dify provider](https://github.com/warmwind/dify-ai-provider)** allows you to easily integrate Dify's application workflow with your applications using the AI SDK.

## Setup

The Dify provider is available in the `dify-ai-provider` module. You can install it with:

```bash
npm install dify-ai-provider

# pnpm
pnpm add dify-ai-provider

# yarn
yarn add dify-ai-provider
```

## Provider Instance

You can import `difyProvider` from `dify-ai-provider` to create a provider instance:

```ts
import { difyProvider } from 'dify-ai-provider';
```

## Example

### Use dify.ai

```ts
import { generateText } from 'ai';
import { difyProvider } from 'dify-ai-provider';

const dify = difyProvider('dify-application-id', {
  responseMode: 'blocking',
  apiKey: 'dify-api-key',
});

const { text, providerMetadata } = await generateText({
  model: dify,
  messages: [{ role: 'user', content: 'Hello, how are you today?' }],
  headers: { 'user-id': 'test-user' },
});

const { conversationId, messageId } = providerMetadata.difyWorkflowData;
console.log(text);
console.log('conversationId', conversationId);
console.log('messageId', messageId);
```

### Use self-hosted Dify

```typescript
import { createDifyProvider } from 'dify-ai-provider';

const difyProvider = createDifyProvider({
  baseURL: 'your-base-url',
});

const dify = difyProvider('dify-application-id', {
  responseMode: 'blocking',
  apiKey: 'dify-api-key',
});
```

## Documentation

Please refer to the **[Dify provider documentation](https://github.com/warmwind/dify-ai-provider)** for more detailed information.


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
