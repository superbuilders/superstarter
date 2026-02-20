
# OpenRouter

[OpenRouter](https://openrouter.ai/) is a unified API gateway that provides access to hundreds of AI models from leading providers like Anthropic, Google, Meta, Mistral, and more. The OpenRouter provider for the AI SDK enables seamless integration with all these models while offering unique advantages:

- **Universal Model Access**: One API key for hundreds of models from multiple providers
- **Cost-Effective**: Pay-as-you-go pricing with no monthly fees or commitments
- **Transparent Pricing**: Clear per-token costs for all models
- **High Availability**: Enterprise-grade infrastructure with automatic failover
- **Simple Integration**: Standardized API across all models
- **Latest Models**: Immediate access to new models as they're released

Learn more about OpenRouter's capabilities in the [OpenRouter Documentation](https://openrouter.ai/docs).

## Setup

The OpenRouter provider is available in the `@openrouter/ai-sdk-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @openrouter/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @openrouter/ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @openrouter/ai-sdk-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @openrouter/ai-sdk-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

To create an OpenRouter provider instance, use the `createOpenRouter` function:

```typescript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

const openrouter = createOpenRouter({
  apiKey: 'YOUR_OPENROUTER_API_KEY',
});
```

You can obtain your OpenRouter API key from the [OpenRouter Dashboard](https://openrouter.ai/keys).

## Language Models

OpenRouter supports both chat and completion models. Use `openrouter.chat()` for chat models and `openrouter.completion()` for completion models:

```typescript
// Chat models (recommended)
const chatModel = openrouter.chat('anthropic/claude-3.5-sonnet');

// Completion models
const completionModel = openrouter.completion(
  'meta-llama/llama-3.1-405b-instruct',
);
```

You can find the full list of available models in the [OpenRouter Models documentation](https://openrouter.ai/docs#models).

## Examples

Here are examples of using OpenRouter with the AI SDK:

### `generateText`

```javascript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: 'YOUR_OPENROUTER_API_KEY',
});

const { text } = await generateText({
  model: openrouter.chat('anthropic/claude-3.5-sonnet'),
  prompt: 'What is OpenRouter?',
});

console.log(text);
```

### `streamText`

```javascript
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: 'YOUR_OPENROUTER_API_KEY',
});

const result = streamText({
  model: openrouter.chat('meta-llama/llama-3.1-405b-instruct'),
  prompt: 'Write a short story about AI.',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

## Advanced Features

OpenRouter offers several advanced features to enhance your AI applications:

1. **Model Flexibility**: Switch between hundreds of models without changing your code or managing multiple API keys.

2. **Cost Management**: Track usage and costs per model in real-time through the dashboard.

3. **Enterprise Support**: Available for high-volume users with custom SLAs and dedicated support.

4. **Cross-Provider Compatibility**: Use the same code structure across different model providers.

5. **Regular Updates**: Automatic access to new models and features as they become available.

For more information about these features and advanced configuration options, visit the [OpenRouter Documentation](https://openrouter.ai/docs).

## Additional Resources

- [OpenRouter Provider Repository](https://github.com/OpenRouterTeam/ai-sdk-provider)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Dashboard](https://openrouter.ai/dashboard)
- [OpenRouter Discord Community](https://discord.gg/openrouter)
- [OpenRouter Status Page](https://status.openrouter.ai)


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
