
# Browser AI model providers

[jakobhoeg/browser-ai](https://github.com/jakobhoeg/browser-ai) is a community provider that serves as the base AI SDK provider for client side in-browser AI models.
It currently provides a model provider for Chrome & Edge's native browser AI models via the JavaScript [Prompt API](https://github.com/webmachinelearning/prompt-api), as well as a model provider for using open-source in-browser models with both [🤗 Transformers.js](https://github.com/huggingface/transformers.js) and [WebLLM](https://github.com/mlc-ai/web-llm).

<Note>We support both v5 and v6 of the AI SDK.</Note>

### Installation

The `@browser-ai/core` (formerly `@built-in-ai`) package is the AI SDK provider for Chrome and Edge browser's built-in AI models. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @browser-ai/core" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @browser-ai/core" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @browser-ai/core" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @browser-ai/core" dark />
  </Tab>
</Tabs>

The `@browser-ai/web-llm` package is the AI SDK provider for popular open-source models using the WebLLM inference engine. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @browser-ai/web-llm" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @browser-ai/web-llm" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @browser-ai/web-llm" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @browser-ai/web-llm" dark />
  </Tab>
</Tabs>

The `@browser-ai/transformers-js` package is the AI SDK provider for popular open-source models using Transformers.js. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add @browser-ai/transformers-js" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install @browser-ai/transformers-js" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add @browser-ai/transformers-js" dark />
  </Tab>
  <Tab>
    <Snippet text="bun add @browser-ai/transformers-js" dark />
  </Tab>
</Tabs>

## Provider Instances

### `@browser-ai/core`

You can import the default provider instance `builtInAI` from `@browser-ai/core`:

```ts
import { builtInAI } from '@browser-ai/core';

const model = builtInAI();
```

You can use the following optional settings to customize the model:

- **temperature** _number_

  Controls randomness in the model's responses. For most models, `0` means almost deterministic results, and higher values mean more randomness.

- **topK** _number_

  Control the diversity and coherence of generated text by limiting the selection of the next token.

### `@browser-ai/web-llm`

You can import the default provider instance `webLLM` from `@browser-ai/web-llm`:

```ts
import { webLLM } from '@browser-ai/web-llm';

const model = webLLM();
```

### `@browser-ai/transformers-js`

You can import the default provider instance `transformersJS` from `@browser-ai/transformers-js`:

```ts
import { transformersJS } from '@browser-ai/transformers-js';

const model = transformersJS();
```

## Language Models

### `@browser-ai/core`

The provider will automatically work in all browsers that support the Prompt API since the browser handles model orchestration.
For instance, if your client uses Edge, it will use [Phi4-mini](https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api#the-phi-4-mini-model), and for Chrome it will use [Gemini Nano](https://developer.chrome.com/docs/ai/prompt-api#model_download).

### `@browser-ai/web-llm`

The provider allows using a ton of popular open-source models such as Llama3 and Qwen3. To see a complete list, please refer to the official [WebLLM documentation](https://github.com/mlc-ai/web-llm)

### `@browser-ai/transformers-js`

The provider allows using a ton of popular open-source models from Huggingface with the Transformers.js library.

### Example usage

#### `@browser-ai/core`

```ts
import { streamText } from 'ai';
import { builtInAI } from '@browser-ai/core';

const result = streamText({
  model: builtInAI(), // will default to the specific browser model
  prompt: 'Hello, how are you',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

#### `@browser-ai/web-llm`

```ts
import { streamText } from 'ai';
import { webLLM } from '@browser-ai/web-llm';

const result = streamText({
  model: webLLM('Qwen3-0.6B-q0f16-MLC'),
  prompt: 'Hello, how are you',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

#### `@browser-ai/transformers-js`

```ts
import { streamText } from 'ai';
import { transformersJS } from '@browser-ai/transformers-js';

const result = streamText({
  model: transformersJS('HuggingFaceTB/SmolLM2-360M-Instruct'),
  prompt: 'Hello, how are you',
});

for await (const chunk of result.textStream) {
  console.log(chunk);
}
```

For more examples and API reference, check out the [documentation](https://www.browser-ai.dev/).


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
