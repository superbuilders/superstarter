
# LMNT Provider

The [LMNT](https://lmnt.com/) provider contains speech model support for the LMNT speech synthesis API.

## Setup

The LMNT provider is available in the `@ai-sdk/lmnt` module. You can install it with

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-sdk/lmnt" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-sdk/lmnt" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-sdk/lmnt" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @ai-sdk/lmnt" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `lmnt` from `@ai-sdk/lmnt`:

```ts
import { lmnt } from '@ai-sdk/lmnt';
```

If you need a customized setup, you can import `createLMNT` from `@ai-sdk/lmnt` and create a provider instance with your settings:

```ts
import { createLMNT } from '@ai-sdk/lmnt';

const lmnt = createLMNT({
  // custom settings, e.g.
  fetch: customFetch,
});
```

You can use the following optional settings to customize the LMNT provider instance:

- **apiKey** _string_

  API key that is being sent using the `Authorization` header.
  It defaults to the `LMNT_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  Defaults to the global `fetch` function.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

## Speech Models

You can create models that call the [LMNT speech API](https://docs.lmnt.com/api-reference/speech/synthesize-speech-bytes)
using the `.speech()` factory method.

The first argument is the model id e.g. `aurora`.

```ts
const model = lmnt.speech('aurora');
```

The `voice` parameter can be set to a voice ID from LMNT. You can find available voices in the [LMNT documentation](https://docs.lmnt.com/api-reference/voices/list-voices).

```ts highlight="7"
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { lmnt } from '@ai-sdk/lmnt';

const result = await generateSpeech({
  model: lmnt.speech('aurora'),
  text: 'Hello, world!',
  voice: 'ava',
  language: 'en',
});
```

You can also pass additional provider-specific options using the `providerOptions` argument:

```ts highlight="9-13"
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { lmnt } from '@ai-sdk/lmnt';

const result = await generateSpeech({
  model: lmnt.speech('aurora'),
  text: 'Hello, world!',
  voice: 'ava',
  language: 'en',
  providerOptions: {
    lmnt: {
      conversational: true,
      speed: 1.2,
    },
  },
});
```

### Provider Options

The LMNT provider accepts the following options via `providerOptions.lmnt`:

- **format** _'aac' | 'mp3' | 'mulaw' | 'raw' | 'wav'_

  The audio format to return. Defaults to `'mp3'`.

- **sampleRate** _8000 | 16000 | 24000_

  The sample rate of the audio in Hz. Defaults to `24000`.

- **speed** _number_

  The speed of the speech. Must be between 0.25 and 2. Defaults to `1`.

- **seed** _number_

  An optional seed for deterministic generation.

- **conversational** _boolean_

  Whether to use a conversational style. Defaults to `false`. Does not work with the `blizzard` model.

- **length** _number_

  Maximum length of the audio in seconds. Maximum value is 300. Does not work with the `blizzard` model.

- **topP** _number_

  Top-p sampling parameter. Must be between 0 and 1. Defaults to `1`.

- **temperature** _number_

  Temperature parameter for sampling. Must be at least 0. Defaults to `1`.

### Model Capabilities

| Model      | Instructions        |
| ---------- | ------------------- |
| `aurora`   | <Cross size={18} /> |
| `blizzard` | <Cross size={18} /> |


## Navigation

- [AI Gateway](/providers/ai-sdk-providers/ai-gateway)
- [xAI Grok](/providers/ai-sdk-providers/xai)
- [Vercel](/providers/ai-sdk-providers/vercel)
- [OpenAI](/providers/ai-sdk-providers/openai)
- [Azure OpenAI](/providers/ai-sdk-providers/azure)
- [Anthropic](/providers/ai-sdk-providers/anthropic)
- [Open Responses](/providers/ai-sdk-providers/open-responses)
- [Amazon Bedrock](/providers/ai-sdk-providers/amazon-bedrock)
- [Groq](/providers/ai-sdk-providers/groq)
- [Fal](/providers/ai-sdk-providers/fal)
- [AssemblyAI](/providers/ai-sdk-providers/assemblyai)
- [DeepInfra](/providers/ai-sdk-providers/deepinfra)
- [Deepgram](/providers/ai-sdk-providers/deepgram)
- [Black Forest Labs](/providers/ai-sdk-providers/black-forest-labs)
- [Gladia](/providers/ai-sdk-providers/gladia)
- [LMNT](/providers/ai-sdk-providers/lmnt)
- [Google Generative AI](/providers/ai-sdk-providers/google-generative-ai)
- [Hume](/providers/ai-sdk-providers/hume)
- [Google Vertex AI](/providers/ai-sdk-providers/google-vertex)
- [Rev.ai](/providers/ai-sdk-providers/revai)
- [Baseten](/providers/ai-sdk-providers/baseten)
- [Hugging Face](/providers/ai-sdk-providers/huggingface)
- [Mistral AI](/providers/ai-sdk-providers/mistral)
- [Together.ai](/providers/ai-sdk-providers/togetherai)
- [Cohere](/providers/ai-sdk-providers/cohere)
- [Fireworks](/providers/ai-sdk-providers/fireworks)
- [DeepSeek](/providers/ai-sdk-providers/deepseek)
- [Moonshot AI](/providers/ai-sdk-providers/moonshotai)
- [Alibaba](/providers/ai-sdk-providers/alibaba)
- [Cerebras](/providers/ai-sdk-providers/cerebras)
- [Replicate](/providers/ai-sdk-providers/replicate)
- [Prodia](/providers/ai-sdk-providers/prodia)
- [Perplexity](/providers/ai-sdk-providers/perplexity)
- [Luma](/providers/ai-sdk-providers/luma)
- [ElevenLabs](/providers/ai-sdk-providers/elevenlabs)


[Full Sitemap](/sitemap.md)
