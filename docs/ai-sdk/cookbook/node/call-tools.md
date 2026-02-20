
# Call Tools

Some models allow developers to provide a list of tools that can be called at any time during a generation.
This is useful for extending the capabilities of a language model to either use logic or data to interact with systems external to the model.

```ts
import { generateText, tool } from 'ai';
import { z } from 'zod';

const result = await generateText({
  model: 'openai/gpt-4.1',
  tools: {
    weather: tool({
      description: 'Get the weather in a location',
      inputSchema: z.object({
        location: z.string().describe('The location to get the weather for'),
      }),
      execute: async ({ location }) => ({
        location,
        temperature: 72 + Math.floor(Math.random() * 21) - 10,
      }),
    }),
    cityAttractions: tool({
      inputSchema: z.object({ city: z.string() }),
    }),
  },
  prompt:
    'What is the weather in San Francisco and what attractions should I visit?',
});
```

## Accessing Tool Calls and Tool Results

If the model decides to call a tool, it will generate a tool call. You can access the tool call by checking the `toolCalls` property on the result.

```ts highlight="31-44"
import { generateText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

async function main() {
  const result = await generateText({
    model: 'openai/gpt-4o',
    maxOutputTokens: 512,
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
      cityAttractions: tool({
        inputSchema: z.object({ city: z.string() }),
      }),
    },
    prompt:
      'What is the weather in San Francisco and what attractions should I visit?',
  });

  // typed tool calls:
  for (const toolCall of result.toolCalls) {
    if (toolCall.dynamic) {
      continue;
    }

    switch (toolCall.toolName) {
      case 'cityAttractions': {
        toolCall.input.city; // string
        break;
      }

      case 'weather': {
        toolCall.input.location; // string
        break;
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
```

## Accessing Tool Results

You can access the result of a tool call by checking the `toolResults` property on the result.

```ts highlight="31-41"
import { generateText, tool } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

async function main() {
  const result = await generateText({
    model: 'openai/gpt-4o',
    maxOutputTokens: 512,
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
      cityAttractions: tool({
        inputSchema: z.object({ city: z.string() }),
      }),
    },
    prompt:
      'What is the weather in San Francisco and what attractions should I visit?',
  });

  // typed tool results for tools with execute method:
  for (const toolResult of result.toolResults) {
    if (toolResult.dynamic) {
      continue;
    }

    switch (toolResult.toolName) {
      case 'weather': {
        toolResult.input.location; // string
        toolResult.output.location; // string
        toolResult.output.temperature; // number
        break;
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
```

<Note>
  `toolResults` will only be available if the tool has an `execute` function.
</Note>

## Model Response

When using tools, it's important to note that the model won't respond with the tool call results by default.
This is because the model has technically already generated its response to the prompt: the tool call.
Many use cases will require the model to summarize the results of the tool call within the context of the original prompt automatically.
You can achieve this by [using `stopWhen`](/cookbook/node/call-tools-multiple-steps)
which will automatically send toolResults to the model to trigger another generation.


## Navigation

- [Generate Text](/cookbook/node/generate-text)
- [Retrieval Augmented Generation](/cookbook/node/retrieval-augmented-generation)
- [Knowledge Base Agent](/cookbook/node/knowledge-base-agent)
- [Generate Text with Chat Prompt](/cookbook/node/generate-text-with-chat-prompt)
- [Generate Text with Image Prompt](/cookbook/node/generate-text-with-image-prompt)
- [Stream Text](/cookbook/node/stream-text)
- [Stream Text with Chat Prompt](/cookbook/node/stream-text-with-chat-prompt)
- [Stream Text with Image Prompt](/cookbook/node/stream-text-with-image-prompt)
- [Stream Text with File Prompt](/cookbook/node/stream-text-with-file-prompt)
- [Generate Object with a Reasoning Model](/cookbook/node/generate-object-reasoning)
- [Generate Object](/cookbook/node/generate-object)
- [Stream Object](/cookbook/node/stream-object)
- [Stream Object with Image Prompt](/cookbook/node/stream-object-with-image-prompt)
- [Record Token Usage After Streaming Object](/cookbook/node/stream-object-record-token-usage)
- [Record Final Object after Streaming Object](/cookbook/node/stream-object-record-final-object)
- [Call Tools](/cookbook/node/call-tools)
- [Call Tools in Parallel](/cookbook/node/call-tools-in-parallel)
- [Call Tools with Image Prompt](/cookbook/node/call-tools-with-image-prompt)
- [Call Tools in Multiple Steps](/cookbook/node/call-tools-multiple-steps)
- [Model Context Protocol (MCP) Tools](/cookbook/node/mcp-tools)
- [Manual Agent Loop](/cookbook/node/manual-agent-loop)
- [Web Search Agent](/cookbook/node/web-search-agent)
- [Model Context Protocol (MCP) Elicitation](/cookbook/node/mcp-elicitation)
- [Embed Text](/cookbook/node/embed-text)
- [Embed Text in Batch](/cookbook/node/embed-text-batch)
- [Intercepting Fetch Requests](/cookbook/node/intercept-fetch-requests)
- [Local Caching Middleware](/cookbook/node/local-caching-middleware)
- [Repair Malformed JSON with jsonrepair](/cookbook/node/repair-json-with-jsonrepair)
- [Dynamic Prompt Caching](/cookbook/node/dynamic-prompt-caching)


[Full Sitemap](/sitemap.md)
