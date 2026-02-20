
# Claude Code Provider

The [ai-sdk-provider-claude-code](https://github.com/ben-vargas/ai-sdk-provider-claude-code) community provider allows you to access Claude models through the official [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk). It's particularly useful for developers who want to use their existing Claude Pro/Max subscription without managing API keys.

## Version Compatibility

| Provider Version | AI SDK Version | NPM Tag     | Status      |
| ---------------- | -------------- | ----------- | ----------- |
| 3.x              | v6             | `latest`    | Stable      |
| 2.x              | v5             | `ai-sdk-v5` | Maintenance |
| 0.x              | v4             | `ai-sdk-v4` | Legacy      |

```bash
# AI SDK v6 (default)
npm install ai-sdk-provider-claude-code ai

# AI SDK v5
npm install ai-sdk-provider-claude-code@ai-sdk-v5 ai@^5.0.0

# AI SDK v4
npm install ai-sdk-provider-claude-code@ai-sdk-v4 ai@^4.0.0
```

## Setup

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add ai-sdk-provider-claude-code" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install ai-sdk-provider-claude-code" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add ai-sdk-provider-claude-code" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add ai-sdk-provider-claude-code" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `claudeCode` from `ai-sdk-provider-claude-code`:

```ts
import { claudeCode } from 'ai-sdk-provider-claude-code';
```

If you need a customized setup, you can import `createClaudeCode` and create a provider instance with your settings:

```ts
import { createClaudeCode } from 'ai-sdk-provider-claude-code';

const claudeCode = createClaudeCode({
  allowedTools: ['Read', 'Write', 'Edit'],
  disallowedTools: ['Bash'],
  mcpServers: {
    'my-server': {
      command: 'node',
      args: ['server.js'],
    },
  },
  permissionMode: 'default',
});
```

You can use the following optional settings to customize the provider instance:

- **allowedTools** _string[]_ - List of allowed tools. When specified, only these tools will be available.
- **disallowedTools** _string[]_ - List of disallowed tools (e.g., `['Bash(rm:*)']`).
- **mcpServers** _Record&lt;string, McpServerConfig&gt;_ - MCP server configurations.
- **permissionMode** _'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'_ - Tool permission handling.
- **maxTurns** _number_ - Maximum conversation turns.
- **cwd** _string_ - Working directory for CLI operations.
- **verbose** _boolean_ - Enable debug logging.

## Language Models

You can create models that call Claude through the Claude Agent SDK using the provider instance:

```ts
const model = claudeCode('sonnet');
```

Supported model shortcuts:

- **opus**: Claude Opus (most capable)
- **sonnet**: Claude Sonnet (balanced)
- **haiku**: Claude Haiku (fastest)

You can also use full model identifiers directly:

```ts
const model = claudeCode('claude-opus-4-5');
const model = claudeCode('claude-sonnet-4-5-20250514');
```

### Example

```ts
import { claudeCode } from 'ai-sdk-provider-claude-code';
import { generateText } from 'ai';

const { text } = await generateText({
  model: claudeCode('sonnet'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Model Capabilities

| Model    | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| -------- | ------------------- | ------------------- | ------------------- | ------------------- |
| `opus`   | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |
| `sonnet` | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |
| `haiku`  | <Check size={18} /> | <Check size={18} /> | <Cross size={18} /> | <Cross size={18} /> |

<Note>
  Tool Usage and Tool Streaming show ❌ because this provider does not support
  AI SDK custom tools (Zod schemas passed to `generateText`/`streamText`).
  Instead, it uses Claude's built-in tools (Bash, Edit, Read, Write, etc.) and
  MCP servers which execute autonomously. Object generation uses native
  structured outputs with guaranteed schema compliance. Image input requires
  streaming mode and base64/data URL format only.
</Note>

## Authentication

The provider uses your existing Claude Pro or Max subscription through the Claude Code CLI:

```bash
claude login
```

This opens a browser window for authentication. Once authenticated, the provider will use your subscription automatically.

## Requirements

- Node.js 18 or higher
- Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
- Claude Pro or Max subscription

For more details, see the [provider documentation](https://github.com/ben-vargas/ai-sdk-provider-claude-code).


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
