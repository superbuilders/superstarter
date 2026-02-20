
# Mixedbread Provider

[patelvivekdev/mixedbread-ai-provider](https://github.com/patelvivekdev/mixedbread-ai-provider) is a community provider that uses [Mixedbread](https://www.mixedbread.ai/) to provide Embedding support for the AI SDK.

## Setup

The Mixedbread provider is available in the `mixedbread-ai-provider` module. You can install it with

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add mixedbread-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install mixedbread-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add mixedbread-ai-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add mixedbread-ai-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `mixedbread` from `mixedbread-ai-provider`:

```ts
import { mixedbread } from 'mixedbread-ai-provider';
```

If you need a customized setup, you can import `createMixedbread` from `mixedbread-ai-provider` and create a provider instance with your settings:

```ts
import { createMixedbread } from 'mixedbread-ai-provider';

const mixedbread = createMixedbread({
  // custom settings
});
```

You can use the following optional settings to customize the Mixedbread provider instance:

- **baseURL** _string_

  The base URL of the Mixedbread API. The default prefix is `https://api.mixedbread.com/v1`.

- **apiKey** _string_

  API key that is being sent using the `Authorization` header. It defaults to the `MIXEDBREAD_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation. Defaults to the global `fetch` function. You can use it as a middleware to intercept requests, or to provide a custom fetch implementation for e.g. testing.

## Text Embedding Models

You can create models that call the [Mixedbread embeddings API](https://www.mixedbread.com/api-reference/endpoints/embeddings)
using the `.embeddingModel()` factory method.

```ts
import { mixedbread } from 'mixedbread-ai-provider';

const embeddingModel = mixedbread.embeddingModel(
  'mixedbread-ai/mxbai-embed-large-v1',
);
```

You can use Mixedbread embedding models to generate embeddings with the `embed` function:

```ts
import { mixedbread } from 'mixedbread-ai-provider';
import { embed } from 'ai';

const { embedding } = await embed({
  model: mixedbread.embeddingModel('mixedbread-ai/mxbai-embed-large-v1'),
  value: 'sunny day at the beach',
});
```

Mixedbread embedding models support additional provider options that can be passed via `providerOptions.mixedbread`:

```ts
import { mixedbread } from 'mixedbread-ai-provider';
import { embed } from 'ai';

const { embedding } = await embed({
  model: mixedbread.embeddingModel('mixedbread-ai/mxbai-embed-large-v1'),
  value: 'sunny day at the beach',
  providerOptions: {
    mixedbread: {
      prompt: 'Generate embeddings for text',
      normalized: true,
      dimensions: 512,
      encodingFormat: 'float16',
    },
  },
});
```

The following provider options are available:

- **prompt** _string_

  An optional prompt to provide context to the model. Refer to the model's documentation for more information. A string between 1 and 256 characters.

- **normalized** _boolean_

  Option to normalize the embeddings.

- **dimensions** _number_

  The desired number of dimensions in the output vectors. Defaults to the model's maximum. A number between 1 and the model's maximum output dimensions. Only applicable for Matryoshka-based models.

- **encodingFormat** _'float' | 'float16' | 'binary' | 'ubinary' | 'int8' | 'uint8' | 'base64'_

### Model Capabilities

| Model                             | Context Length | Dimension | Custom Dimensions   |
| --------------------------------- | -------------- | --------- | ------------------- |
| `mxbai-embed-large-v1`            | 512            | 1024      | <Check size={18} /> |
| `mxbai-embed-2d-large-v1`         | 512            | 1024      | <Check size={18} /> |
| `deepset-mxbai-embed-de-large-v1` | 512            | 1024      | <Check size={18} /> |
| `mxbai-embed-xsmall-v1`           | 4096           | 384       | <Cross size={18} /> |

<Note>
  The table above lists popular models. Please see the [Mixedbread
  docs](https://www.mixedbread.com/docs/models/embedding) for a full list of
  available models.
</Note>


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
