
# Azure Custom Provider for AI SDK

The **[Quail-AI/azure-ai-provider](https://github.com/QuailAI/azure-ai-provider)** enables unofficial integration with Azure-hosted language models that use Azure's native APIs instead of the standard OpenAI API format.

## Language Models

This provider works with any model in the Azure AI Foundry that is compatible with the Azure-Rest AI-inference API.

### Models Tested:

- DeepSeek-R1
- LLama 3.3-70B Instruct
- Cohere-command-r-08-2024

## Setup

### Installation

Install the provider via npm:

```bash
npm i @quail-ai/azure-ai-provider
```

## Provider Instance

Create an Azure AI resource and set up your endpoint URL and API key. Add the following to your `.env` file:

```bash
AZURE_API_ENDPOINT=https://<your-resource>.services.ai.azure.com/models
AZURE_API_KEY=<your-api-key>
```

Import `createAzure` from the package to create your provider instance:

```ts
import { createAzure } from '@quail-ai/azure-ai-provider';

const azure = createAzure({
  endpoint: process.env.AZURE_API_ENDPOINT,
  apiKey: process.env.AZURE_API_KEY,
});
```

## Basic Usage

Generate text using the Azure custom provider:

```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: azure('your-deployment-name'),
  prompt: 'Write a story about a robot.',
});
```

## Status

> ✅ Chat Completions: Working with both streaming and non-streaming responses\
> ⚠️ Tool Calling: Functionality highly dependent on model choice\
> ⚠️ Embeddings: Implementation present but untested


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
