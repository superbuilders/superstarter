
# SambaNova Provider

[sambanova-ai-provider](https://github.com/sambanova/sambanova-ai-provider) contains language model support for the SambaNova API.

API keys can be obtained from the [SambaNova Cloud Platform](https://cloud.sambanova.ai/apis).

## Setup

The SambaNova provider is available via the `sambanova-ai-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add sambanova-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="npm install sambanova-ai-provider" dark />
  </Tab>
  <Tab>
    <Snippet text="yarn add sambanova-ai-provider" dark />
  </Tab>

  <Tab>
    <Snippet text="bun add sambanova-ai-provider" dark />
  </Tab>
</Tabs>

### Environment variables

Create a `.env` file with a `SAMBANOVA_API_KEY` variable.

## Provider Instance

You can import the default provider instance `sambanova` from `sambanova-ai-provider`:

```ts
import { sambanova } from 'sambanova-ai-provider';
```

If you need a customized setup, you can import `createSambaNova` from `sambanova-ai-provider` and create a provider instance with your settings:

```ts
import { createSambaNova } from 'sambanova-ai-provider';

const sambanova = createSambaNova({
  // Optional settings
});
```

You can use the following optional settings to customize the SambaNova provider instance:

- **baseURL** _string_

  Use a different URL prefix for API calls, e.g. to use proxy servers.
  The default prefix is `https://api.sambanova.ai/v1`.

- **apiKey** _string_

  API key that is being sent using the `Authorization` header.
  It defaults to the `SAMBANOVA_API_KEY` environment variable.

- **headers** _Record&lt;string,string&gt;_

  Custom headers to include in the requests.

- **fetch** _(input: RequestInfo, init?: RequestInit) => Promise&lt;Response&gt;_

  Custom [fetch](https://developer.mozilla.org/en-US/docs/Web/API/fetch) implementation.
  Defaults to the global `fetch` function.
  You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.

## Models

You can use [SambaNova models](https://docs.sambanova.ai/cloud/docs/get-started/supported-models) on a provider instance.
The first argument is the model id, e.g. `Meta-Llama-3.1-70B-Instruct`.

```ts
const model = sambanova('Meta-Llama-3.1-70B-Instruct');
```

## Tested models and capabilities

This provider is capable of generating and streaming text, and interpreting image inputs.

At least it has been tested with the following features (which use the `/chat/completion` endpoint):

| Chat completion     | Image input         |
| ------------------- | ------------------- |
| <Check size={18} /> | <Check size={18} /> |

### Image input

You need to use any of the following models for visual understanding:

- Llama3.2-11B-Vision-Instruct
- Llama3.2-90B-Vision-Instruct

SambaNova does not support URLs, but the ai-sdk is able to download the file and send it to the model.

## Example Usage

Basic demonstration of text generation using the SambaNova provider.

```ts
import { createSambaNova } from 'sambanova-ai-provider';
import { generateText } from 'ai';

const sambanova = createSambaNova({
  apiKey: 'YOUR_API_KEY',
});

const model = sambanova('Meta-Llama-3.1-70B-Instruct');

const { text } = await generateText({
  model,
  prompt: 'Hello, nice to meet you.',
});

console.log(text);
```

You will get an output text similar to this one:

```
Hello. Nice to meet you too. Is there something I can help you with or would you like to chat?
```

## Intercepting Fetch Requests

This provider supports [Intercepting Fetch Requests](/examples/providers/intercepting-fetch-requests).

### Example

```ts
import { createSambaNova } from 'sambanova-ai-provider';
import { generateText } from 'ai';

const sambanovaProvider = createSambaNova({
  apiKey: 'YOUR_API_KEY',
  fetch: async (url, options) => {
    console.log('URL', url);
    console.log('Headers', JSON.stringify(options.headers, null, 2));
    console.log(`Body ${JSON.stringify(JSON.parse(options.body), null, 2)}`);
    return await fetch(url, options);
  },
});

const model = sambanovaProvider('Meta-Llama-3.1-70B-Instruct');

const { text } = await generateText({
  model,
  prompt: 'Hello, nice to meet you.',
});
```

And you will get an output like this:

```bash
URL https://api.sambanova.ai/v1/chat/completions
Headers {
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_API_KEY"
}
Body {
  "model": "Meta-Llama-3.1-70B-Instruct",
  "temperature": 0,
  "messages": [
    {
      "role": "user",
      "content": "Hello, nice to meet you."
    }
  ]
}
```


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
