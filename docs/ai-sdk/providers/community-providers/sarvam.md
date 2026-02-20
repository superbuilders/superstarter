
# Sarvam Provider

The Sarvam AI Provider is a library developed to integrate with the AI SDK. This library brings Speech to Text (STT) capabilities to your applications, allowing for seamless interaction with audio and text data.

## Setup

The Sarvam provider is available in the `sarvam-ai-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add sarvam-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install sarvam-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add sarvam-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add sarvam-ai-provider" dark />
  </Tab>
</Tabs>

## Provider Instance

First, get your **Sarvam API Key** from the [Sarvam Dashboard](https://dashboard.sarvam.ai/auth/signin).

Then initialize `Sarvam` in your application:

```ts
import { createSarvam } from 'sarvam-ai-provider';

const sarvam = createSarvam({
  headers: {
    'api-subscription-key': 'YOUR_API_KEY',
  },
});
```

<Note>
  The `api-subscription-key` needs to be passed in headers. Consider using
  `YOUR_API_KEY` as environment variables for security.
</Note>

- Transcribe speech to text

```ts
import { experimental_transcribe as transcribe } from 'ai';
import { readFile } from 'fs/promises';

await transcribe({
  model: sarvam.transcription('saarika:v2'),
  audio: await readFile('./src/transcript-test.mp3'),
  providerOptions: {
    sarvam: {
      language_code: 'en-IN',
    },
  },
});
```

## Features

### Changing parameters

- Change language_code

```ts
providerOptions: {
    sarvam: {
      language_code: 'en-IN',
    },
  },
```

<Note>
  `language_code` specifies the language of the input audio and is required for
  accurate transcription. • It is mandatory for the `saarika:v1` model (this
  model does not support `unknown`). • It is optional for the `saarika:v2`
  model. • Use `unknown` when the language is not known; in that case, the API
  will auto‑detect it. Available options: `unknown`, `hi-IN`, `bn-IN`, `kn-IN`,
  `ml-IN`, `mr-IN`, `od-IN`, `pa-IN`, `ta-IN`, `te-IN`, `en-IN`, `gu-IN`.
</Note>

- with_timestamps?

```ts
providerOptions: {
  sarvam: {
    with_timestamps: true,
  },
},
```

<Note>
  `with_timestamps` specifies whether to include start/end timestamps for each
  word/token. • Type: boolean • When true, each word/token will include
  start/end timestamps. • Default: false
</Note>

- with_diarization?

```ts
providerOptions: {
  sarvam: {
    with_diarization: true,
  },
},
```

<Note>
  `with_diarization` enables speaker diarization (Beta). • Type: boolean • When
  true, enables speaker diarization. • Default: false
</Note>

- num_speakers?

```ts
providerOptions: {
  sarvam: {
    with_diarization: true,
    num_speakers: 2,
  },
},
```

<Note>
  `num_speakers` sets the number of distinct speakers to detect (only when
  `with_diarization` is true). • Type: number | null • Number of distinct
  speakers to detect. • Default: null
</Note>

## References

- [Sarvam API Docs](https://docs.sarvam.ai/api-reference-docs/endpoints/speech-to-text)


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
