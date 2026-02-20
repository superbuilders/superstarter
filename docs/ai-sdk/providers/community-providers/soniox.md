
# Soniox Provider

[Soniox provider](https://github.com/soniox/vercel-ai-sdk-provider) integrates Soniox transcription models with the Vercel AI SDK.
For more information, see the [Soniox Documentation](https://soniox.com/docs).

## Installation

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @soniox/vercel-ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @soniox/vercel-ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @soniox/vercel-ai-sdk-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @soniox/vercel-ai-sdk-provider" dark />
  </Tab>
</Tabs>

## Authentication

Set `SONIOX_API_KEY` in your environment or pass `apiKey` when creating the provider.
Get your API key from the [Soniox Console](https://console.soniox.com).

## Example

```ts
import { soniox } from '@soniox/vercel-ai-sdk-provider';
import { experimental_transcribe as transcribe } from 'ai';

const { text } = await transcribe({
  model: soniox.transcription('stt-async-v3'),
  audio: new URL('https://soniox.com/media/examples/coffee_shop.mp3'),
});
```

## Provider options

Use `createSoniox` to customize the provider instance:

```ts
import { createSoniox } from '@soniox/vercel-ai-sdk-provider';

const soniox = createSoniox({
  apiKey: process.env.SONIOX_API_KEY,
  apiBaseUrl: 'https://api.soniox.com',
});
```

Options:

- `apiKey`: override `SONIOX_API_KEY`.
- `apiBaseUrl`: custom API base URL. See list of regional API endpoints [here](https://soniox.com/docs/stt/data-residency#regional-endpoints).
- `headers`: additional request headers.
- `fetch`: custom fetch implementation.
- `pollingIntervalMs`: transcription polling interval in milliseconds. Default is 1000ms.

## Transcription options

Per-request options are passed via `providerOptions`:

```ts
const { text } = await transcribe({
  model: soniox.transcription('stt-async-v3'),
  audio,
  providerOptions: {
    soniox: {
      languageHints: ['en', 'es'],
      enableLanguageIdentification: true,
      enableSpeakerDiarization: true,
      context: {
        terms: ['Soniox', 'Vercel'],
      },
    },
  },
});
```

Available options:

- `languageHints` - Array of ISO language codes to bias recognition
- `languageHintsStrict` - When true, rely more heavily on language hints (note: not supported by all models)
- `enableLanguageIdentification` - Automatically detect spoken language
- `enableSpeakerDiarization` - Identify and separate different speakers
- `context` - Additional context to improve accuracy
- `clientReferenceId` - Optional client-defined reference ID
- `webhookUrl` - Webhook URL for transcription completion notifications
- `webhookAuthHeaderName` - Webhook authentication header name
- `webhookAuthHeaderValue` - Webhook authentication header value
- `translation` - Translation configuration

Check the [Soniox API reference](https://soniox.com/docs/stt/api-reference/transcriptions/create_transcription) for more details.

## Language hints

Soniox automatically detects and transcribes speech in [**60+ languages**](https://soniox.com/docs/stt/concepts/supported-languages). When you know which languages are likely to appear in your audio, provide `languageHints` to improve accuracy by biasing recognition toward those languages.

Language hints **do not restrict** recognition — they only **bias** the model toward the specified languages, while still allowing other languages to be detected if present.

```ts
const { text } = await transcribe({
  model: soniox.transcription('stt-async-v3'),
  audio,
  providerOptions: {
    soniox: {
      languageHints: ['en', 'es'], // ISO language codes
    },
  },
});
```

For more details, see the [Soniox language hints documentation](https://soniox.com/docs/stt/concepts/language-hints).

## Context

Provide custom context to improve transcription and translation accuracy. Context helps the model understand your domain, recognize important terms, and apply custom vocabulary.

The `context` object supports four optional sections:

```ts
const { text } = await transcribe({
  model: soniox.transcription('stt-async-v3'),
  audio,
  providerOptions: {
    soniox: {
      context: {
        // Structured key-value information (domain, topic, intent, etc.)
        general: [
          { key: 'domain', value: 'Healthcare' },
          { key: 'topic', value: 'Diabetes management consultation' },
          { key: 'doctor', value: 'Dr. Martha Smith' },
        ],
        // Longer free-form background text or related documents
        text: 'The patient has a history of...',
        // Domain-specific or uncommon words
        terms: ['Celebrex', 'Zyrtec', 'Xanax'],
        // Custom translations for ambiguous terms
        translationTerms: [
          { source: 'Mr. Smith', target: 'Sr. Smith' },
          { source: 'MRI', target: 'RM' },
        ],
      },
    },
  },
});
```

For more details, see the [Soniox context documentation](https://soniox.com/docs/stt/concepts/context).


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
