
# Stream Object with Image Prompt

Some language models that support vision capabilities accept images as part of the prompt. Here are some of the different [formats](/docs/reference/ai-sdk-core/generate-text#content-image) you can use to include images as input.

## URL

```ts file='index.ts'
import { streamObject } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

async function main() {
  const { partialObjectStream } = streamObject({
    model: 'openai/gpt-4.1',
    maxOutputTokens: 512,
    schema: z.object({
      stamps: z.array(
        z.object({
          country: z.string(),
          date: z.string(),
        }),
      ),
    }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'list all the stamps in these passport pages?',
          },
          {
            type: 'image',
            image: new URL(
              'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/WW2_Spanish_official_passport.jpg/1498px-WW2_Spanish_official_passport.jpg',
            ),
          },
        ],
      },
    ],
  });

  for await (const partialObject of partialObjectStream) {
    console.clear();
    console.log(partialObject);
  }
}

main();
```

## File Buffer

```ts file='index.ts'
import { streamObject } from 'ai';
import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'fs';

dotenv.config();

async function main() {
  const { partialObjectStream } = streamObject({
    model: 'openai/gpt-4.1',
    maxOutputTokens: 512,
    schema: z.object({
      stamps: z.array(
        z.object({
          country: z.string(),
          date: z.string(),
        }),
      ),
    }),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'list all the stamps in these passport pages?',
          },
          {
            type: 'image',
            image: fs.readFileSync('./data/passport.png', {
              encoding: 'base64',
            }),
          },
        ],
      },
    ],
  });

  for await (const partialObject of partialObjectStream) {
    console.clear();
    console.log(partialObject);
  }
}

main();
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
