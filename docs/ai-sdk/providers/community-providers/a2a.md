
# A2A

The [dracoblue/a2a-ai-provider](https://github.com/dracoblue/a2a-ai-provider) is a community provider enables the use of [A2A protocol](https://a2aproject.github.io/A2A/specification/) compliant agents with the [AI SDK](https://ai-sdk.dev/). This allows developers to stream, send, and receive text, tool calls, and artifacts using a standardized JSON-RPC interface over HTTP.

<Note type="warning">
  The `a2a-ai-provider` package is under constant development.
</Note>

The provider supports (by using the official a2a-js sdk [@a2a-js/sdk](https://github.com/a2aproject/a2a-js)):

- **Streaming Text Responses** via `sendSubscribe` and SSE
- **File & Artifact Uploads** to the A2A server
- **Multi-modal Messaging** with support for text and file parts
- **Full JSON-RPC 2.0 Compliance** for A2A-compatible LLM agents

Learn more about A2A at the [A2A Project Site](https://a2aproject.github.io/A2A/).

## Setup

Install the `a2a-ai-provider` from npm:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add a2a-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install a2a-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add a2a-ai-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add a2a-ai-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

To create a provider instance for an A2A server:

```ts
import { a2a } from 'a2a-ai-provider';
```

## Examples

You can now use the provider with the AI SDK like this:

### `generateText`

```ts
import { a2a } from 'a2a-ai-provider';
import { generateText } from 'ai';

const result = await generateText({
  model: a2a('https://your-a2a-server.example.com'),
  prompt: 'What is love?',
});

console.log(result.text);
```

### `streamText`

```ts
import { a2a } from 'a2a-ai-provider';
import { streamText } from 'ai';

const chatId = 'unique-chat-id'; // for each conversation to keep history in a2a server

const streamResult = streamText({
  model: a2a('https://your-a2a-server.example.com'),
  prompt: 'What is love?',
  providerOptions: {
    a2a: {
      contextId: chatId,
    },
  },
});

await streamResult.consumeStream();

console.log(await streamResult.content);
```

## Features

- **Text Streaming**: Streams token-by-token output from the A2A server
- **File Uploads**: Send files as part of your prompts
- **Artifact Handling**: Receives file artifacts in streamed or final results

## Additional Resources

- [GitHub Repository](https://github.com/DracoBlue/a2a-ai-provider)
- [A2A Protocol Spec](https://a2aproject.github.io/A2A/specification/)
- License: MIT


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
