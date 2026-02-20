
# MiniMax Provider

[vercel-minimax-ai-provider](https://github.com/MiniMax-AI/vercel-minimax-ai-provider) is a community provider that provides access to the latest [MiniMax-M2 model](https://platform.minimax.io/docs/guides/text-generation) from [MiniMax](https://www.minimax.io/).

API keys can be obtained from the [MiniMax Platform](https://platform.minimax.io/user-center/basic-information/interface-key).

## Setup

The MiniMax provider is available via the `vercel-minimax-ai-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add vercel-minimax-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install vercel-minimax-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add vercel-minimax-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add vercel-minimax-ai-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

The MiniMax provider supports two API compatibility modes:

### Anthropic-Compatible API (Default)

You can import the default provider instance `minimax` from `vercel-minimax-ai-provider`:

```ts
import { minimax } from 'vercel-minimax-ai-provider';
```

Or explicitly use the Anthropic-compatible instance:

```ts
import { minimaxAnthropic } from 'vercel-minimax-ai-provider';
```

Or OpenAI-compatible API format:

```ts
import { minimaxOpenAI } from 'vercel-minimax-ai-provider';
```

## Custom Configuration

For custom configuration, you can use the `createMinimax` (Anthropic-compatible) or `createMinimaxOpenAI` (OpenAI-compatible) functions:

### Anthropic-Compatible Configuration (Default)

```ts
import { createMinimax } from 'vercel-minimax-ai-provider';

const minimax = createMinimax({
  apiKey: process.env.MINIMAX_API_KEY,
});
```

### Configuration Options

You can use the following optional settings to customize the MiniMax provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls.

  - Anthropic-compatible default: `https://api.minimax.io/anthropic/v1`
  - OpenAI-compatible default: `https://api.minimax.io/v1`

- **apiKey** _string_

  API key that is being sent using the `Authorization` header. It defaults to
  the `MINIMAX_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.

## API Compatibility

MiniMax provides two API formats. Both are included in this package.

The main difference is the API request/response format:

- **Anthropic format** (default): Uses Anthropic Messages API format with `anthropic-version` header
- **OpenAI format**: Uses standard OpenAI chat completion format

Both formats access the same MiniMax models with the same capabilities.

## Model Capabilities

| Model               | Text Generation     | Object Generation   | Image Input         | Tool Usage          | Tool Streaming      |
| ------------------- | ------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| `MiniMax-M2`        | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `MiniMax-M2-Stable` | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> |

<Note>
  Please see the [MiniMax
  docs](https://platform.minimax.io/docs/api-reference/text-intro) for a full
  list of available models and their capabilities. The provider accepts any
  model ID as a string for forward compatibility.
</Note>

## Example Usage

### Basic Text Generation

```ts
import { minimax } from 'vercel-minimax-ai-provider';
import { generateText } from 'ai';

const result = await generateText({
  model: minimax('MiniMax-M2'),
  prompt: 'Explain quantum computing in simple terms.',
});

console.log(result.text);
```

### Streaming

```ts
import { minimax } from 'vercel-minimax-ai-provider';
import { streamText } from 'ai';

const result = streamText({
  model: minimax('MiniMax-M2'),
  prompt: 'Write a short story about a robot learning to paint.',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```


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
