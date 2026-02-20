
# Helicone

The [Helicone AI Gateway](https://helicone.ai/) provides you with access to hundreds of AI models, as well as tracing and monitoring integrated directly through our observability platform.

- **Unified model access**: Use one API key to access hundreds of models from leading providers like Anthropic, Google, Meta, and more.
- **Smart provider selection**: Always hit the cheapest provider, enabling fallbacks for provider uptimes and rate limits.
- **Simplified tracing**: Monitor your LLM's performance and debug applications with Helicone observability by default, including OpenTelemetry support for logs, metrics, and traces.
- **Improve performance and cost**: Cache responses to reduce costs and latency.
- **Prompt management**: Handle prompt versioning and playground directly from Helicone, so you no longer depeend on engineers to make changes.

Learn more about Helicone's capabilities in the [Helicone Documentation](https://helicone.ai/docs).

## Setup

The Helicone provider is available in the `@helicone/ai-sdk-provider` package. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @helicone/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @helicone/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @helicone/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @helicone/ai-sdk-provider" dark />
  </Tab>
</Tabs>

## Get started

To get started with Helicone, use the `createHelicone` function to create a provider instance. Then query any model you like.

```typescript
import { createHelicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

const result = await generateText({
  model: helicone('claude-4.5-haiku'),
  prompt: 'Write a haiku about artificial intelligence',
});

console.log(result.text);
```

You can obtain your Helicone API key from the [Helicone Dashboard](https://us.helicone.ai/settings/api-keys).

## Examples

Here are examples of using Helicone with the AI SDK.

### `generateText`

```javascript
import { createHelicone } from '@helicone/ai-sdk-provider';
import { generateText } from 'ai';

const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

const { text } = await generateText({
  model: helicone('gemini-2.5-flash-lite'),
  prompt: 'What is Helicone?',
});

console.log(text);
```

### `streamText`

```javascript
const helicone = createHelicone({
  apiKey: process.env.HELICONE_API_KEY,
});

const result = await streamText({
  model: helicone('deepseek-v3.1-terminus'),
  prompt: 'Write a short story about a robot learning to paint',
  maxOutputTokens: 300,
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

console.log('\n\nStream completed!');
```

## Advanced Features

Helicone offers several advanced features to enhance your AI applications:

1. **Model flexibility**: Switch between hundreds of models without changing your code or managing multiple API keys.

2. **Cost management**: Manage costs per model in real-time through Helicone's LLM observability dashboard.

3. **Observability**: Access comprehensive analytics and logs for all your requests through Helicone's LLM observability dashboard.

4. **Prompts management**: Manage prompts and versioning through the Helicone dashboard.

5. **Caching**: Cache responses to reduce costs and latency.

6. **Regular updates**: Automatic access to new models and features as they become available.

For more information about these features and advanced configuration options, visit the [Helicone Documentation](https://docs.helicone.ai).


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
