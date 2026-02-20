
# Retrieval Augmented Generation

Retrieval Augmented Generation (RAG) is a technique that enhances the capabilities of language models by providing them with relevant information from external sources during the generation process.
This approach allows the model to access and incorporate up-to-date or specific knowledge that may not be present in its original training data.

This example uses [the following essay](https://raw.githubusercontent.com/run-llama/llama_index/main/docs/docs/examples/data/paul_graham/paul_graham_essay.txt) as an input (`essay.txt`). This example uses a simple in-memory vector database to store and retrieve relevant information. Alternatively, you can check out our [Knowledge Base Agent example](/cookbook/node/knowledge-base-agent) which uses Upstash Search to generate embeddings and manage the knowledge base.

For a more in-depth guide, check out the [RAG Chatbot Guide](/docs/guides/rag-chatbot) which will show you how to build a RAG chatbot with [Next.js](https://nextjs.org), [Drizzle ORM](https://orm.drizzle.team/) and [Postgres](https://postgresql.org).

```ts
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { cosineSimilarity, embed, embedMany, generateText } from 'ai';

dotenv.config();

async function main() {
  const db: { embedding: number[]; value: string }[] = [];

  const essay = fs.readFileSync(path.join(__dirname, 'essay.txt'), 'utf8');
  const chunks = essay
    .split('.')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0 && chunk !== '\n');

  const { embeddings } = await embedMany({
    model: 'openai/text-embedding-3-small',
    values: chunks,
  });
  embeddings.forEach((e, i) => {
    db.push({
      embedding: e,
      value: chunks[i],
    });
  });

  const input =
    'What were the two main things the author worked on before college?';

  const { embedding } = await embed({
    model: 'openai/text-embedding-3-small',
    value: input,
  });
  const context = db
    .map(item => ({
      document: item,
      similarity: cosineSimilarity(embedding, item.embedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(r => r.document.value)
    .join('\n');

  const { text } = await generateText({
    model: 'openai/gpt-4o',
    prompt: `Answer the following question based only on the provided context:
             ${context}

             Question: ${input}`,
  });
  console.log(text);
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
