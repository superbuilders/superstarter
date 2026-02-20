
# Hugging Face Provider

The [Hugging Face](https://huggingface.co/) provider offers access to thousands of language models through [Hugging Face Inference Providers](https://huggingface.co/docs/inference-providers/index), including models from Meta, DeepSeek, Qwen, and more.

API keys can be obtained from [Hugging Face Settings](https://huggingface.co/settings/tokens).

## Setup

The Hugging Face provider is available via the `@ai-sdk/huggingface` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-sdk/huggingface" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-sdk/huggingface" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-sdk/huggingface" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add @ai-sdk/huggingface" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `huggingface` from `@ai-sdk/huggingface`:

```ts
import { huggingface } from '@ai-sdk/huggingface';
```

For custom configuration, you can import `createHuggingFace` and create a provider instance with your settings:

```ts
import { createHuggingFace } from '@ai-sdk/huggingface';

const huggingface = createHuggingFace({
  apiKey: process.env.HUGGINGFACE_API_KEY ?? '',
});
```

You can use the following optional settings to customize the Hugging Face provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls, e.g. to use proxy servers.
  The default prefix is `https://router.huggingface.co/v1`.

- **apiKey** _string_

  API key that is being sent using the `Authorization` header. It defaults to
  the `HUGGINGFACE_API_KEY` environment variable. You can get your API key
  from [Hugging Face Settings](https://huggingface.co/settings/tokens).

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.

## Language Models

You can create language models using a provider instance:

```ts
import { huggingface } from '@ai-sdk/huggingface';
import { generateText } from 'ai';

const { text } = await generateText({
  model: huggingface('deepseek-ai/DeepSeek-V3-0324'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

You can also use the `.responses()` or `.languageModel()` factory methods:

```ts
const model = huggingface.responses('deepseek-ai/DeepSeek-V3-0324');
// or
const model = huggingface.languageModel('moonshotai/Kimi-K2-Instruct');
```

Hugging Face language models can be used in the `streamText` function
(see [AI SDK Core](/docs/ai-sdk-core)).

You can explore the latest and trending models with their capabilities, context size, throughput and pricing on the [Hugging Face Inference Models](https://huggingface.co/inference/models) page.

### Provider Options

Hugging Face language models support provider-specific options that you can pass via `providerOptions.huggingface`:

```ts
import { huggingface } from '@ai-sdk/huggingface';
import { generateText } from 'ai';

const { text } = await generateText({
  model: huggingface('deepseek-ai/DeepSeek-R1'),
  prompt: 'Explain the theory of relativity.',
  providerOptions: {
    huggingface: {
      reasoningEffort: 'high',
      instructions: 'Respond in a clear and educational manner.',
    },
  },
});
```

The following provider options are available:

- **metadata** _Record&lt;string, string&gt;_

  Additional metadata to include with the request.

- **instructions** _string_

  Instructions for the model. Can be used to provide additional context or guidance.

- **strictJsonSchema** _boolean_

  Whether to use strict JSON schema validation for structured outputs. Defaults to `false`.

- **reasoningEffort** _string_

  Controls the reasoning effort for reasoning models like DeepSeek-R1. Higher values result in more thorough reasoning.

### Reasoning Output

For reasoning models like `deepseek-ai/DeepSeek-R1`, you can control the reasoning effort and access the model's reasoning process in the response:

```ts
import { huggingface } from '@ai-sdk/huggingface';
import { streamText } from 'ai';

const result = streamText({
  model: huggingface('deepseek-ai/DeepSeek-R1'),
  prompt: 'How many r letters are in the word strawberry?',
  providerOptions: {
    huggingface: {
      reasoningEffort: 'high',
    },
  },
});

for await (const part of result.fullStream) {
  if (part.type === 'reasoning') {
    console.log(`Reasoning: ${part.textDelta}`);
  } else if (part.type === 'text-delta') {
    process.stdout.write(part.textDelta);
  }
}
```

For non-streaming calls with `generateText`, the reasoning content is available in the `reasoning` field of the response:

```ts
import { huggingface } from '@ai-sdk/huggingface';
import { generateText } from 'ai';

const result = await generateText({
  model: huggingface('deepseek-ai/DeepSeek-R1'),
  prompt: 'What is 25 * 37?',
  providerOptions: {
    huggingface: {
      reasoningEffort: 'medium',
    },
  },
});

console.log('Reasoning:', result.reasoning);
console.log('Answer:', result.text);
```

### Image Input

For vision-capable models like `Qwen/Qwen2.5-VL-7B-Instruct`, you can pass images as part of the message content:

```ts
import { huggingface } from '@ai-sdk/huggingface';
import { generateText } from 'ai';
import { readFileSync } from 'fs';

const result = await generateText({
  model: huggingface('Qwen/Qwen2.5-VL-7B-Instruct'),
  messages: [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this image in detail.' },
        {
          type: 'image',
          image: readFileSync('./image.png'),
        },
      ],
    },
  ],
});
```

You can also pass image URLs:

```ts
{
  type: 'image',
  image: 'https://example.com/image.png',
}
```

## Model Capabilities

| Model                                           | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| ----------------------------------------------- | ------------------- | ------------------- | ------------------- | ------------------- |
| `meta-llama/Llama-3.1-8B-Instruct`              | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `meta-llama/Llama-3.1-70B-Instruct`             | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `meta-llama/Llama-3.3-70B-Instruct`             | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `meta-llama/Llama-4-Maverick-17B-128E-Instruct` | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `deepseek-ai/DeepSeek-V3.1`                     | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `deepseek-ai/DeepSeek-V3-0324`                  | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `deepseek-ai/DeepSeek-R1`                       | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `deepseek-ai/DeepSeek-R1-Distill-Llama-70B`     | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `Qwen/Qwen3-32B`                                | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `Qwen/Qwen3-Coder-480B-A35B-Instruct`           | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `Qwen/Qwen2.5-VL-7B-Instruct`                   | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `google/gemma-3-27b-it`                         | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `moonshotai/Kimi-K2-Instruct`                   | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |

<Note>
  The table above lists popular models. You can explore all available models on
  the [Hugging Face Inference Models](https://huggingface.co/inference/models)
  page. The capabilities depend on the specific model you're using. Check the
  model documentation on Hugging Face Hub for detailed information about each
  model's features.
</Note>


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
