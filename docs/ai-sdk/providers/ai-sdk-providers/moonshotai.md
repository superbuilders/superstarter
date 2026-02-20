
# Moonshot AI Provider

The [Moonshot AI](https://www.moonshot.ai) provider offers access to powerful language models through the Moonshot API, including the Kimi series of models with reasoning capabilities.

API keys can be obtained from the [Moonshot Platform](https://platform.moonshot.ai).

## Setup

The Moonshot AI provider is available via the `@ai-sdk/moonshotai` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @ai-sdk/moonshotai" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @ai-sdk/moonshotai" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @ai-sdk/moonshotai" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @ai-sdk/moonshotai" dark />
  </Tab>
</Tabs>

## Provider Instance

You can import the default provider instance `moonshotai` from `@ai-sdk/moonshotai`:

```ts
import { moonshotai } from '@ai-sdk/moonshotai';
```

For custom configuration, you can import `createMoonshotAI` and create a provider instance with your settings:

```ts
import { createMoonshotAI } from '@ai-sdk/moonshotai';

const moonshotai = createMoonshotAI({
  apiKey: process.env.MOONSHOT_API_KEY ?? '',
});
```

You can use the following optional settings to customize the Moonshot AI provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls.
  The default prefix is `https://api.moonshot.ai/v1`

- **apiKey** _string_

  API key that is being sent using the `Authorization` header. It defaults to
  the `MOONSHOT_API_KEY` environment variable

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation

## Language Models

You can create language models using a provider instance:

```ts
import { moonshotai } from '@ai-sdk/moonshotai';
import { generateText } from 'ai';

const { text } = await generateText({
  model: moonshotai('kimi-k2.5'),
  prompt: 'Write a vegetarian lasagna recipe for 4 people.',
});
```

You can also use the `.chatModel()` or `.languageModel()` factory methods:

```ts
const model = moonshotai.chatModel('kimi-k2.5');
// or
const model = moonshotai.languageModel('kimi-k2.5');
```

Moonshot AI language models can be used in the `streamText` function
(see [AI SDK Core](/docs/ai-sdk-core)).

### Reasoning Models

Moonshot AI offers thinking models like `kimi-k2-thinking` that generate intermediate reasoning tokens before their final response. The reasoning output is streamed through the standard AI SDK reasoning parts.

```ts
import { moonshotai, type MoonshotAIProviderOptions } from '@ai-sdk/moonshotai';
import { generateText } from 'ai';

const { text, reasoningText } = await generateText({
  model: moonshotai('kimi-k2-thinking'),
  providerOptions: {
    moonshotai: {
      thinking: { type: 'enabled', budgetTokens: 2048 },
      reasoningHistory: 'interleaved',
    } satisfies MoonshotAIProviderOptions,
  },
  prompt: 'How many "r"s are in the word "strawberry"?',
});

console.log(reasoningText);
console.log(text);
```

See [AI SDK UI: Chatbot](/docs/ai-sdk-ui/chatbot#reasoning) for more details on how to integrate reasoning into your chatbot.

### Provider Options

The following optional provider options are available for Moonshot AI language models:

- **thinking** _object_

  Configuration for thinking/reasoning models like Kimi K2 Thinking.

  - **type** _'enabled' | 'disabled'_

    Whether to enable thinking mode

  - **budgetTokens** _number_

    Maximum number of tokens for thinking (minimum 1024)

- **reasoningHistory** _'disabled' | 'interleaved' | 'preserved'_

  Controls how reasoning history is handled in multi-turn conversations:

  - `'disabled'`: Remove reasoning from history
  - `'interleaved'`: Include reasoning between tool calls within a single turn
  - `'preserved'`: Keep all reasoning in history

## Model Capabilities

| Model                    | Image Input         | Object Generation   | Tool Usage          | Tool Streaming      |
| ------------------------ | ------------------- | ------------------- | ------------------- | ------------------- |
| `moonshot-v1-8k`         | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `moonshot-v1-32k`        | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `moonshot-v1-128k`       | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `kimi-k2`                | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `kimi-k2.5`              | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `kimi-k2-thinking`       | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `kimi-k2-thinking-turbo` | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |
| `kimi-k2-turbo`          | <Cross size={18} /> | <Check size={18} /> | <Check size={18} /> | <Check size={18} /> |

<Note>
  Please see the [Moonshot AI docs](https://platform.moonshot.ai/docs/intro) for
  a full list of available models. You can also pass any available provider
  model ID as a string if needed.
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
