
# OpenCode Provider

The [ai-sdk-provider-opencode-sdk](https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk) community provider enables using multiple AI providers (Anthropic, OpenAI, Google) through the [OpenCode SDK](https://www.npmjs.com/package/@opencode-ai/sdk). OpenCode is a terminal-based AI coding assistant that provides a unified interface to various AI models.

## Version Compatibility

| Provider Version | AI SDK Version | NPM Tag     | Status      |
| ---------------- | -------------- | ----------- | ----------- |
| 1.x              | v6             | `latest`    | Stable      |
| 0.x              | v5             | `ai-sdk-v5` | Maintenance |

```bash
# AI SDK v6 (default)
npm install ai-sdk-provider-opencode-sdk ai

# AI SDK v5
npm install ai-sdk-provider-opencode-sdk@ai-sdk-v5 ai@^5.0.0
```

## Setup

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add ai-sdk-provider-opencode-sdk" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install ai-sdk-provider-opencode-sdk" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add ai-sdk-provider-opencode-sdk" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add ai-sdk-provider-opencode-sdk" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `opencode` from `ai-sdk-provider-opencode-sdk`:

```ts
import { opencode } from 'ai-sdk-provider-opencode-sdk';
```

If you need a customized setup, you can import `createOpencode` and create a provider instance with your settings:

```ts
import { createOpencode } from 'ai-sdk-provider-opencode-sdk';

const opencode = createOpencode({
  autoStartServer: true,
  serverTimeout: 10000,
  defaultSettings: {
    agent: 'build',
  },
});
```

Provider settings:

- **hostname** _string_ - Server hostname (default: `127.0.0.1`).
- **port** _number_ - Server port (default: `4096`).
- **autoStartServer** _boolean_ - Auto-start the OpenCode server (default: `true`).
- **serverTimeout** _number_ - Server startup timeout in milliseconds (default: `10000`).
- **defaultSettings** _object_ - Default settings applied to all model calls.

## Language Models

Models are specified using the `providerID/modelID` format:

```ts
const model = opencode('anthropic/claude-sonnet-4-5-20250929');
```

**Model Shortcuts** (exported as `OpencodeModels`):

```ts
import { OpencodeModels } from 'ai-sdk-provider-opencode-sdk';

// Anthropic Claude
opencode(OpencodeModels['claude-opus-4-5']); // anthropic/claude-opus-4-5-20251101
opencode(OpencodeModels['claude-sonnet-4-5']); // anthropic/claude-sonnet-4-5-20250929
opencode(OpencodeModels['claude-haiku-4-5']); // anthropic/claude-haiku-4-5-20251001

// OpenAI GPT
opencode(OpencodeModels['gpt-4o']); // openai/gpt-4o
opencode(OpencodeModels['gpt-4o-mini']); // openai/gpt-4o-mini

// Google Gemini
opencode(OpencodeModels['gemini-3-pro']); // google/gemini-3-pro-preview
opencode(OpencodeModels['gemini-2.5-pro']); // google/gemini-2.5-pro
opencode(OpencodeModels['gemini-2.5-flash']); // google/gemini-2.5-flash
opencode(OpencodeModels['gemini-2.0-flash']); // google/gemini-2.0-flash
```

You can also use full model identifiers:

```ts
opencode('openai/gpt-5.1-codex');
opencode('openai/gpt-5.1-codex-max');
opencode('google/gemini-3-pro-preview');
```

### Example

```ts
import { opencode } from 'ai-sdk-provider-opencode-sdk';
import { generateText } from 'ai';

const { text } = await generateText({
  model: opencode('anthropic/claude-sonnet-4-5-20250929'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Model Settings

```ts
const model = opencode('anthropic/claude-opus-4-5-20251101', {
  agent: 'build', // 'build' | 'plan' | 'general' | 'explore'
  sessionTitle: 'My Task',
  systemPrompt: 'You are a helpful assistant.',
});
```

### Model Capabilities

| Provider  | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| --------- | ------------------- | ------------------- | ------------------- | ------------------- |
| Anthropic | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |
| OpenAI    | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |
| Google    | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |

<Note>
  Tool Usage and Tool Streaming show ❌ because this provider does not support
  AI SDK custom tools (Zod schemas passed to `generateText`/`streamText`).
  Custom tool definitions are explicitly ignored. OpenCode executes tools
  server-side, which can be observed via streaming events. Image input supports
  data URLs and base64 only. Object generation uses prompt-based JSON mode.
</Note>

## Server Management

OpenCode runs as a managed server. Make sure to dispose of the provider when done:

```ts
import { opencode } from 'ai-sdk-provider-opencode-sdk';

// After you're done
await opencode.dispose();

// Or if you need direct access to the client manager:
// await opencode.getClientManager().dispose();
```

The client manager automatically cleans up on process exit (SIGINT, SIGTERM).

## Requirements

- Node.js 18 or higher
- OpenCode CLI installed (`npm install -g opencode`)
- Provider credentials configured in OpenCode (Anthropic, OpenAI, or Google API keys)

For more details, see the [provider documentation](https://github.com/ben-vargas/ai-sdk-provider-opencode-sdk).


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
