
# Portkey Provider

[Portkey](https://portkey.ai/?utm_source=vercel&utm_medium=docs&utm_campaign=integration) natively integrates with the AI SDK to make your apps production-ready and reliable. Import Portkey's Vercel package and use it as a provider in your Vercel AI app to enable all of Portkey's features:

- Full-stack **observability** and **tracing** for all requests
- Interoperability across **250+ LLMs**
- Built-in **50+** state-of-the-art guardrails
- Simple & semantic **caching** to save costs & time
- Conditional request routing with fallbacks, load-balancing, automatic retries, and more
- Continuous improvement based on user feedback

Learn more at [Portkey docs for the AI SDK](https://docs.portkey.ai/docs/integrations/libraries/vercel)

## Setup

The Portkey provider is available in the `@portkey-ai/vercel-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @portkey-ai/vercel-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @portkey-ai/vercel-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @portkey-ai/vercel-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @portkey-ai/vercel-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

To create a Portkey provider instance, use the `createPortkey` function:

```typescript
import { createPortkey } from '@portkey-ai/vercel-provider';

const portkeyConfig = {
  provider: 'openai', //enter provider of choice
  api_key: 'OPENAI_API_KEY', //enter the respective provider's api key
  override_params: {
    model: 'gpt-4', //choose from 250+ LLMs
  },
};

const portkey = createPortkey({
  apiKey: 'YOUR_PORTKEY_API_KEY',
  config: portkeyConfig,
});
```

You can find your Portkey API key in the [Portkey Dashboard](https://app.portkey.ai).

## Language Models

Portkey supports both chat and completion models. Use `portkey.chatModel()` for chat models and `portkey.completionModel()` for completion models:

```typescript
const chatModel = portkey.chatModel('');
const completionModel = portkey.completionModel('');
```

Note: You can provide an empty string as the model name if you've defined it in the `portkeyConfig`.

## Examples

You can use Portkey language models with the `generateText` or `streamText` function:

### `generateText`

```javascript
import { createPortkey } from '@portkey-ai/vercel-provider';
import { generateText } from 'ai';

const portkey = createPortkey({
  apiKey: 'YOUR_PORTKEY_API_KEY',
  config: portkeyConfig,
});

const { text } = await generateText({
  model: portkey.chatModel(''),
  prompt: 'What is Portkey?',
});

console.log(text);
```

### `streamText`

```javascript
import { createPortkey } from '@portkey-ai/vercel-provider';
import { streamText } from 'ai';

const portkey = createPortkey({
  apiKey: 'YOUR_PORTKEY_API_KEY',
  config: portkeyConfig,
});

const result = streamText({
  model: portkey.completionModel(''),
  prompt: 'Invent a new holiday and describe its traditions.',
});

for await (const chunk of result) {
  console.log(chunk);
}
```

Note:

- Portkey supports `Tool` use with the AI SDK
- `generatObject` and `streamObject` are currently not supported.

## Advanced Features

Portkey offers several advanced features to enhance your AI applications:

1. **Interoperability**: Easily switch between 250+ AI models by changing the provider and model name in your configuration.

2. **Observability**: Access comprehensive analytics and logs for all your requests.

3. **Reliability**: Implement caching, fallbacks, load balancing, and conditional routing.

4. **Guardrails**: Enforce LLM behavior in real-time with input and output checks.

5. **Security and Compliance**: Set budget limits and implement fine-grained user roles and permissions.

For detailed information on these features and advanced configuration options, please refer to the [Portkey documentation](https://docs.portkey.ai/docs/integrations/libraries/vercel).

## Additional Resources

- [Portkey Documentation](https://docs.portkey.ai/docs/integrations/libraries/vercel)
- [Twitter](https://twitter.com/portkeyai)
- [Discord Community](https://discord.gg/JHPt4C7r)
- [Portkey Dashboard](https://app.portkey.ai)


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
