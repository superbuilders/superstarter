
# Gemini CLI Provider

The [ai-sdk-provider-gemini-cli](https://github.com/ben-vargas/ai-sdk-provider-gemini-cli) community provider enables using Google's Gemini models through the [@google/gemini-cli-core](https://www.npmjs.com/package/@google/gemini-cli-core) library. It's useful for developers who want to use their existing Gemini Code Assist subscription or API key authentication.

## Version Compatibility

| Provider Version | AI SDK Version | NPM Tag     | Status      |
| ---------------- | -------------- | ----------- | ----------- |
| 2.x              | v6             | `latest`    | Stable      |
| 1.x              | v5             | `ai-sdk-v5` | Maintenance |
| 0.x              | v4             | `ai-sdk-v4` | Legacy      |

```bash
# AI SDK v6 (default)
npm install ai-sdk-provider-gemini-cli ai

# AI SDK v5
npm install ai-sdk-provider-gemini-cli@ai-sdk-v5 ai@^5.0.0

# AI SDK v4
npm install ai-sdk-provider-gemini-cli@ai-sdk-v4 ai@^4.0.0
```

## Setup

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add ai-sdk-provider-gemini-cli" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install ai-sdk-provider-gemini-cli" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add ai-sdk-provider-gemini-cli" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add ai-sdk-provider-gemini-cli" dark />
  </Tab>
</Tabs>

## Provider Instance

Import `createGeminiProvider` and create a provider instance with your authentication settings:

```ts
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';

// OAuth authentication (default if authType omitted)
const gemini = createGeminiProvider({ authType: 'oauth-personal' });

// API key authentication
const gemini = createGeminiProvider({
  authType: 'api-key', // or 'gemini-api-key'
  apiKey: process.env.GEMINI_API_KEY,
});

// Vertex AI authentication
const gemini = createGeminiProvider({
  authType: 'vertex-ai',
  vertexAI: {
    projectId: 'my-project',
    location: 'us-central1',
  },
});

// Google Auth Library
const gemini = createGeminiProvider({
  authType: 'google-auth-library',
  googleAuth: myGoogleAuthInstance,
});
```

Authentication options:

- **authType** _'oauth' | 'oauth-personal' | 'api-key' | 'gemini-api-key' | 'vertex-ai' | 'google-auth-library'_ - Optional. Defaults to `'oauth-personal'`.
- **apiKey** _string_ - Required for `'api-key'` / `'gemini-api-key'`.
- **vertexAI** _\{ projectId, location \}_ - Required for `'vertex-ai'`.
- **googleAuth** _GoogleAuth_ - Required for `'google-auth-library'`.
- **cacheDir** _string_ - Optional directory for OAuth credentials cache.
- **proxy** _string_ - HTTP/HTTPS proxy URL.

## Language Models

Create models that call Gemini through the CLI using the provider instance:

```ts
const model = gemini('gemini-2.5-pro');
```

Supported models:

- **gemini-3-pro-preview**: Latest model with enhanced reasoning (supports `thinkingLevel`)
- **gemini-3-flash-preview**: Fast Gemini 3 model (supports `thinkingLevel`)
- **gemini-2.5-pro**: Production-ready model with 64K output tokens (supports `thinkingBudget`)
- **gemini-2.5-flash**: Fast, efficient model with 64K output tokens (supports `thinkingBudget`)

### Example

```ts
import { createGeminiProvider } from 'ai-sdk-provider-gemini-cli';
import { generateText } from 'ai';

const gemini = createGeminiProvider({
  authType: 'oauth-personal',
});

const { text } = await generateText({
  model: gemini('gemini-2.5-pro'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

### Model Settings

```ts
const model = gemini('gemini-3-pro-preview', {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  thinkingConfig: {
    thinkingLevel: 'medium', // 'low' | 'medium' | 'high' | 'minimal'
  },
  verbose: true, // Enable debug logging
  logger: customLogger, // Custom logger (or false to disable)
});
```

### Model Capabilities

| Model                    | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------------------- |
| `gemini-3-pro-preview`   | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `gemini-3-flash-preview` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `gemini-2.5-pro`         | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `gemini-2.5-flash`       | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |

<Note>
  Images must be provided as base64-encoded data. Image URLs are not supported.
</Note>

## Authentication

### OAuth Authentication (Recommended)

Install and authenticate the Gemini CLI globally:

```bash
npm install -g @google/gemini-cli
gemini  # Follow the interactive authentication setup
```

Then use OAuth authentication in your code with `authType: 'oauth-personal'`.

### API Key Authentication

1. Generate an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Set it as an environment variable: `export GEMINI_API_KEY="YOUR_API_KEY"`
3. Use `authType: 'api-key'` with your key.

## Requirements

- Node.js 20 or higher
- Gemini CLI installed globally for OAuth authentication
- Valid Google account or Gemini API key

For more details, see the [provider documentation](https://github.com/ben-vargas/ai-sdk-provider-gemini-cli).


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
