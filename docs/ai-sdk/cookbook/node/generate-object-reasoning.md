
# Generate Object with a Reasoning Model

Reasoning models, like [DeepSeek's](/providers/ai-sdk-providers/deepseek) R1, are gaining popularity due to their ability to understand and generate better responses to complex queries than non-reasoning models.
You may want to use these models to generate structured data. However, most (like R1 and [OpenAI's](/providers/ai-sdk-providers/openai) o1) do not support tool-calling or structured outputs.

One solution is to pass the output from a reasoning model through a smaller model that can output structured data (like gpt-4o-mini). These lightweight models can efficiently extract the structured data while adding very little overhead in terms of speed and cost.

```ts
import { generateObject, generateText } from 'ai';
import 'dotenv/config';
import { z } from 'zod';

async function main() {
  const { text: rawOutput } = await generateText({
    model: 'deepseek/deepseek-r1',
    prompt:
      'Predict the top 3 largest city by 2050. For each, return the name, the country, the reason why it will on the list, and the estimated population in millions.',
  });

  const { object } = await generateObject({
    model: 'openai/gpt-4o-mini',
    prompt: 'Extract the desired information from this text: \n' + rawOutput,
    schema: z.object({
      name: z.string().describe('the name of the city'),
      country: z.string().describe('the name of the country'),
      reason: z
        .string()
        .describe(
          'the reason why the city will be one of the largest cities by 2050',
        ),
      estimatedPopulation: z.number(),
    }),
    output: 'array',
  });

  console.log(object);
}

main().catch(console.error);
```


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
