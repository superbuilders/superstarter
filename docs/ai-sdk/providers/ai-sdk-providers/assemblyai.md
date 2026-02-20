
# AssemblyAI Provider

The [AssemblyAI](https://assemblyai.com/) provider contains language model support for the AssemblyAI transcription API.

## Setup

The AssemblyAI provider is available in the `@ai-sdk/assemblyai` module. You can install it with

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-sdk/assemblyai" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-sdk/assemblyai" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-sdk/assemblyai" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @ai-sdk/assemblyai" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `assemblyai` from `@ai-sdk/assemblyai`:

```ts
import { assemblyai } from '@ai-sdk/assemblyai';
```

If you need a customized setup, you can import `createAssemblyAI` from `@ai-sdk/assemblyai` and create a provider instance with your settings:

```ts
import { createAssemblyAI } from '@ai-sdk/assemblyai';

const assemblyai = createAssemblyAI({
  // custom settings, e.g.
  fetch: customFetch,
});
```

You can use the following optional settings to customize the AssemblyAI provider instance:

- **apiKey** _string_

  API key that is being sent using the `Authorization` header.
  It defaults to the `ASSEMBLYAI_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  Defaults to the global `fetch` function.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

## Transcription Models

You can create models that call the [AssemblyAI transcription API](https://www.assemblyai.com/docs/getting-started/transcribe-an-audio-file/typescript)
using the `.transcription()` factory method.

The first argument is the model id e.g. `best`.

```ts
const model = assemblyai.transcription('best');
```

You can also pass additional provider-specific options using the `providerOptions` argument. For example, supplying the `contentSafety` option will enable content safety filtering.

```ts highlight="6"
import { experimental_transcribe as transcribe } from 'ai';
import { assemblyai } from '@ai-sdk/assemblyai';
import { readFile } from 'fs/promises';

const result = await transcribe({
  model: assemblyai.transcription('best'),
  audio: await readFile('audio.mp3'),
  providerOptions: { assemblyai: { contentSafety: true } },
});
```

The following provider options are available:

- **audioEndAt** _number_

  End time of the audio in milliseconds.
  Optional.

- **audioStartFrom** _number_

  Start time of the audio in milliseconds.
  Optional.

- **autoChapters** _boolean_

  Whether to automatically generate chapters for the transcription.
  Optional.

- **autoHighlights** _boolean_

  Whether to automatically generate highlights for the transcription.
  Optional.

- **boostParam** _enum_

  Boost parameter for the transcription.
  Allowed values: `'low'`, `'default'`, `'high'`.
  Optional.

- **contentSafety** _boolean_

  Whether to enable content safety filtering.
  Optional.

- **contentSafetyConfidence** _number_

  Confidence threshold for content safety filtering (25-100).
  Optional.

- **customSpelling** _array of objects_

  Custom spelling rules for the transcription.
  Each object has `from` (array of strings) and `to` (string) properties.
  Optional.

- **disfluencies** _boolean_

  Whether to include disfluencies (um, uh, etc.) in the transcription.
  Optional.

- **entityDetection** _boolean_

  Whether to detect entities in the transcription.
  Optional.

- **filterProfanity** _boolean_

  Whether to filter profanity in the transcription.
  Optional.

- **formatText** _boolean_

  Whether to format the text in the transcription.
  Optional.

- **iabCategories** _boolean_

  Whether to include IAB categories in the transcription.
  Optional.

- **languageCode** _string_

  Language code for the audio.
  Supports numerous ISO-639-1 and ISO-639-3 language codes.
  Optional.

- **languageConfidenceThreshold** _number_

  Confidence threshold for language detection.
  Optional.

- **languageDetection** _boolean_

  Whether to enable language detection.
  Optional.

- **multichannel** _boolean_

  Whether to process multiple audio channels separately.
  Optional.

- **punctuate** _boolean_

  Whether to add punctuation to the transcription.
  Optional.

- **redactPii** _boolean_

  Whether to redact personally identifiable information.
  Optional.

- **redactPiiAudio** _boolean_

  Whether to redact PII in the audio file.
  Optional.

- **redactPiiAudioQuality** _enum_

  Quality of the redacted audio file.
  Allowed values: `'mp3'`, `'wav'`.
  Optional.

- **redactPiiPolicies** _array of enums_

  Policies for PII redaction, specifying which types of information to redact.
  Supports numerous types like `'person_name'`, `'phone_number'`, etc.
  Optional.

- **redactPiiSub** _enum_

  Substitution method for redacted PII.
  Allowed values: `'entity_name'`, `'hash'`.
  Optional.

- **sentimentAnalysis** _boolean_

  Whether to perform sentiment analysis on the transcription.
  Optional.

- **speakerLabels** _boolean_

  Whether to label different speakers in the transcription.
  Optional.

- **speakersExpected** _number_

  Expected number of speakers in the audio.
  Optional.

- **speechThreshold** _number_

  Threshold for speech detection (0-1).
  Optional.

- **summarization** _boolean_

  Whether to generate a summary of the transcription.
  Optional.

- **summaryModel** _enum_

  Model to use for summarization.
  Allowed values: `'informative'`, `'conversational'`, `'catchy'`.
  Optional.

- **summaryType** _enum_

  Type of summary to generate.
  Allowed values: `'bullets'`, `'bullets_verbose'`, `'gist'`, `'headline'`, `'paragraph'`.
  Optional.

- **webhookAuthHeaderName** _string_

  Name of the authentication header for webhook requests.
  Optional.

- **webhookAuthHeaderValue** _string_

  Value of the authentication header for webhook requests.
  Optional.

- **webhookUrl** _string_

  URL to send webhook notifications to.
  Optional.

- **wordBoost** _array of strings_

  List of words to boost in the transcription.
  Optional.

### Model Capabilities

| Model  | Transcription       | Duration            | Segments            | Language            |
| ------ | ------------------- | ------------------- | ------------------- | ------------------- |
| `best` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `nano` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |


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
