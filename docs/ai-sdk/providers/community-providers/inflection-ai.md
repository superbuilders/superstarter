
# Unofficial Community Provider for AI SDK - Inflection AI

<Note type="warning">
  This community provider is not yet compatible with AI SDK 5. Please wait for
  the provider to be updated or consider using an [AI SDK 5 compatible
  provider](/providers/ai-sdk-providers).
</Note>

The **[unofficial Inflection AI provider](https://www.npmjs.com/package/inflection-ai-sdk-provider)** for the [AI SDK](/docs) contains language model support for the [Inflection AI API](https://developers.inflection.ai/).

## Setup

The Inflection AI provider is available in the [`inflection-ai-sdk-provider`](https://www.npmjs.com/package/inflection-ai-sdk-provider) module on npm. You can install it with

```bash
npm i inflection-ai-sdk-provider
```

## Provider Instance

You can import the default provider instance `inflection` from `inflection-ai-sdk-provider`:

```ts
import { inflection } from 'inflection-ai-sdk-provider';
```

## Example

```ts
import { inflection } from 'inflection-ai-sdk-provider';
import { generateText } from 'ai';

const { text } = await generateText({
  model: inflection('inflection_3_with_tools'),
  prompt: 'how can I make quick chicken pho?',
});
```

## Models

The following models are supported:

- `inflection_3_pi` - "the model powering our Pi experience, including a backstory, emotional intelligence, productivity, and safety. It excels in scenarios such as customer support chatbots."
- `inflection_3_productivity`- "the model optimized for following instructions. It is better for tasks requiring JSON output or precise adherence to provided guidelines."
- `inflection_3_with_tools` - This model seems to be in preview and it lacks an official description as of the writing of this README in 1.0.0.

| Model                       | Text Generation | Streaming | Image Input | Object Generation | Tool Usage | Tool Streaming |
| --------------------------- | --------------- | --------- | ----------- | ----------------- | ---------- | -------------- |
| `inflection_3_pi`           | ✓               | ✓         | ✗           | ✗                 | ✗          | ✗              |
| `inflection_3_productivity` | ✓               | ✓         | ✗           | ✗                 | ✗          | ✗              |
| `inflection_3_with_tools`   | ✓               | ✓         | ✗           | ✗                 | ✗          | ✗              |

There is limited API support for features other than text generation and streaming text at this time. Should that change, the table above will be updated and support will be added to this unofficial provider.

## Documentation

Please check out Inflection AI's [API Documentation](https://developers.inflection.ai/docs/api-reference) for more information.

You can find the source code for this provider [here on GitHub](https://github.com/Umbrage-Studios/inflection-ai-sdk-provider).


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
