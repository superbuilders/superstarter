
# Vercel Provider

The [Vercel](https://vercel.com) provider gives you access to the [v0 API](https://v0.app/docs/api/model), designed for building modern web applications. The v0 models support text and image inputs and provide fast streaming responses.

You can create your Vercel API key at [v0.dev](https://v0.dev/chat/settings/keys).

<Note>
  The v0 API is currently in beta and requires a Premium or Team plan with
  usage-based billing enabled. For details, visit the [pricing
  page](https://v0.dev/pricing). To request a higher limit, contact Vercel at
  support@v0.dev.
</Note>

## Features

- **Framework aware completions**: Evaluated on modern stacks like Next.js and Vercel
- **Auto-fix**: Identifies and corrects common coding issues during generation
- **Quick edit**: Streams inline edits as they're available
- **Multimodal**: Supports both text and image inputs

## Setup

The Vercel provider is available via the `@ai-sdk/vercel` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-sdk/vercel" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-sdk/vercel" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-sdk/vercel" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @ai-sdk/vercel" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `vercel` from `@ai-sdk/vercel`:

```ts
import { vercel } from '@ai-sdk/vercel';
```

If you need a customized setup, you can import `createVercel` from `@ai-sdk/vercel` and create a provider instance with your settings:

```ts
import { createVercel } from '@ai-sdk/vercel';

const vercel = createVercel({
  apiKey: process.env.VERCEL_API_KEY ?? '',
});
```

You can use the following optional settings to customize the Vercel provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls. The default prefix is `https://api.v0.dev/v1`.

- **apiKey** _string_

  API key that is being sent using the `Authorization` header. It defaults to
  the `VERCEL_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  Defaults to the global `fetch` function.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

## Language Models

You can create language models using a provider instance. The first argument is the model ID, for example:

```ts
import { vercel } from '@ai-sdk/vercel';
import { generateText } from 'ai';

const { text } = await generateText({
  model: vercel('v0-1.5-md'),
  prompt: 'Create a Next.js AI chatbot',
});
```

Vercel language models can also be used in the `streamText` function (see [AI SDK Core](/docs/ai-sdk-core)).

## Models

### v0-1.5-md

The `v0-1.5-md` model is for everyday tasks and UI generation.

### v0-1.5-lg

The `v0-1.5-lg` model is for advanced thinking or reasoning.

### v0-1.0-md (legacy)

The `v0-1.0-md` model is the legacy model served by the v0 API.

All v0 models have the following capabilities:

- Supports text and image inputs (multimodal)
- Supports function/tool calls
- Streaming responses with low latency
- Optimized for frontend and full-stack web development

## Model Capabilities

| Model       | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| ----------- | ------------------- | ------------------- | ------------------- | ------------------- |
| `v0-1.5-md` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `v0-1.5-lg` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `v0-1.0-md` | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |


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
