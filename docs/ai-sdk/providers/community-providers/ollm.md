
# OLLM

[OLLM](https://ollm.com/) is the world's first enterprise router aggregating high-security, zero-knowledge LLM providers. It provides a unified API gateway to access AI models with guaranteed military-grade encryption at every layer. The OLLM provider for the AI SDK enables seamless integration with all these models while offering unique advantages:

- **Verifiable Privacy**: All models run with confidential computing for maximum security
- **Universal Model Access**: One API key for models from multiple providers
- **Confidential Computing**: Hardware-level encryption with TEE (Trusted Execution Environment) on all models
- **Military-Grade Security**: End-to-end encryption at every layer of the stack
- **Simple Integration**: OpenAI-compatible API across all models

Learn more about OLLM's capabilities in the [OLLM Website](https://ollm.com).

## Setup

The OLLM provider is available in the `@ofoundation/ollm` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ofoundation/ollm" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ofoundation/ollm" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ofoundation/ollm" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @ofoundation/ollm" dark />
  </Tab>
</Tabs>

## Provider Instance

To create an OLLM provider instance, use the `createOLLM` function:

```typescript
import { createOLLM } from '@ofoundation/ollm';

const ollm = createOLLM({
  apiKey: 'YOUR_OLLM_API_KEY',
});
```

You can obtain your OLLM API key from the [OLLM Dashboard](https://console.ollm.com/dashboard/api-keys).

## Language Models

All OLLM models run with confidential computing by default. Use `ollm.chatModel()` for chat models:

```typescript
// Confidential computing chat models
const confidentialModel = ollm.chatModel('near/GLM-4.7');
```

You can find the full list of available models in the [OLLM Models](https://ollm.com/models).

## Examples

Here are examples of using OLLM with the AI SDK:

### `generateText`

```typescript
import { createOLLM } from '@ofoundation/ollm';
import { generateText } from 'ai';

const ollm = createOLLM({
  apiKey: 'YOUR_OLLM_API_KEY',
});

const { text } = await generateText({
  model: ollm.chatModel('near/GLM-4.6'),
  prompt: 'What is OLLM?',
});

console.log(text);
```

### `streamText`

```typescript
import { createOLLM } from '@ofoundation/ollm';
import { streamText } from 'ai';

const ollm = createOLLM({
  apiKey: 'YOUR_OLLM_API_KEY',
});

const result = streamText({
  model: ollm.chatModel('near/GLM-4.6'),
  prompt: 'Write a short story about secure AI.',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

### Using System Messages

```typescript
import { createOLLM } from '@ofoundation/ollm';
import { generateText } from 'ai';

const ollm = createOLLM({
  apiKey: 'YOUR_OLLM_API_KEY',
});

const { text } = await generateText({
  model: ollm.chatModel('near/GLM-4.6'),
  system: 'You are a helpful assistant that responds concisely.',
  prompt: 'What is TypeScript in one sentence?',
});

console.log(text);
```

## Advanced Features

OLLM offers several advanced features to enhance your AI applications with enterprise-grade security:

1. **Zero Data Retention (ZDR)**: Your prompts and completions are never stored or logged by providers.

2. **Confidential Computing**: Hardware-level encryption using TEE technology ensures your data is protected even during processing.

3. **Verifiable Privacy**: Cryptographic proofs that your data was processed securely.

4. **Model Flexibility**: Switch between hundreds of models without changing your code or managing multiple API keys.

5. **Cost Management**: Track usage and costs per model in real-time through the dashboard.

6. **Enterprise Support**: Available for high-volume users with custom SLAs and dedicated support.

7. **Tool Integrations**: Seamlessly works with popular AI development tools including:
   - Cursor
   - Windsurf
   - VS Code
   - Cline
   - Roo Code
   - Replit

For more information about these features and advanced configuration options, visit the [OLLM Documentation](https://ollm.com/docs).

## Additional Resources

- [OLLM Documentation](https://ollm.com/)
- [OLLM Dashboard](https://console.ollm.com/dashboard)
- [OLLM Models](https://console.ollm.com/explorer/models)


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
