
# Cloudflare Workers AI

[workers-ai-provider](https://github.com/cloudflare/ai/tree/main/packages/workers-ai-provider) is a community provider that allows you to use Cloudflare's [Workers AI](https://ai.cloudflare.com/) models with the AI SDK.

## Setup

The Cloudflare Workers AI provider is available in the `workers-ai-provider` module. You can install it with:

<Tabs items={['pnpm', 'npm', 'yarn', 'bun']}>
  <Tab>
    <Snippet text="pnpm add workers-ai-provider" />
  </Tab>
  <Tab>
    <Snippet text="npm install workers-ai-provider" />
  </Tab>
  <Tab>
    <Snippet text="yarn add workers-ai-provider" />
  </Tab>

  <Tab>
    <Snippet text="bun add workers-ai-provider" dark />
  </Tab>
</Tabs>

Then, setup an AI binding in your Cloudflare Workers project `wrangler.toml` file:

```bash filename="wrangler.toml"
[ai]
binding = "AI"
```

## Provider Instance

To create a `workersai` provider instance, use the `createWorkersAI` function, passing in the AI binding as an option:

```typescript
import { createWorkersAI } from 'workers-ai-provider';

const workersai = createWorkersAI({ binding: env.AI });
```

## Language Models

To create a model instance, call the provider instance and specify the model you would like to use as the first argument. You can also pass additional settings in the second argument:

```typescript highlight="4-7"
import { createWorkersAI } from 'workers-ai-provider';

const workersai = createWorkersAI({ binding: env.AI });
const model = workersai('@cf/meta/llama-3.1-8b-instruct', {
  // additional settings
  safePrompt: true,
});
```

You can use the following optional settings to customize:

- **safePrompt** _boolean_

  Whether to inject a safety prompt before all conversations. Defaults to `false`

### Examples

You can use Cloudflare Workers AI language models to generate text with the **`generateText`** or **`streamText`** function:

#### `generateText`

```typescript
import { createWorkersAI } from 'workers-ai-provider';
import { generateText } from 'ai';

type Env = {
  AI: Ai;
};

export default {
  async fetch(_: Request, env: Env) {
    const workersai = createWorkersAI({ binding: env.AI });
    const result = await generateText({
      model: workersai('@cf/meta/llama-2-7b-chat-int8'),
      prompt: 'Write a 50-word essay about hello world.',
    });

    return new Response(result.text);
  },
};
```

#### `streamText`

```typescript
import { createWorkersAI } from 'workers-ai-provider';
import { streamText } from 'ai';

type Env = {
  AI: Ai;
};

export default {
  async fetch(_: Request, env: Env) {
    const workersai = createWorkersAI({ binding: env.AI });
    const result = streamText({
      model: workersai('@cf/meta/llama-2-7b-chat-int8'),
      prompt: 'Write a 50-word essay about hello world.',
    });

    return result.toTextStreamResponse({
      headers: {
        // add these headers to ensure that the
        // response is chunked and streamed
        'Content-Type': 'text/x-unknown',
        'content-encoding': 'identity',
        'transfer-encoding': 'chunked',
      },
    });
  },
};
```

#### `generateObject`

Some Cloudflare Workers AI language models can also be used with the `generateObject` function:

```typescript
import { createWorkersAI } from 'workers-ai-provider';
import { generateObject } from 'ai';
import { z } from 'zod';

type Env = {
  AI: Ai;
};

export default {
  async fetch(_: Request, env: Env) {
    const workersai = createWorkersAI({ binding: env.AI });
    const result = await generateObject({
      model: workersai('@cf/meta/llama-3.1-8b-instruct'),
      prompt: 'Generate a Lasagna recipe',
      schema: z.object({
        recipe: z.object({
          ingredients: z.array(z.string()),
          description: z.string(),
        }),
      }),
    });

    return Response.json(result.object);
  },
};
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
