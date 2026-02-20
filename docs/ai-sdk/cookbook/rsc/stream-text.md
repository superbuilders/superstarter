
# Stream Text

<Note>
  This example uses React Server Components (RSC). If you want to client side
  rendering and hooks instead, check out the ["stream text" example with
  useCompletion](/examples/next-pages/basics/streaming-text-generation).
</Note>

Text generation can sometimes take a long time to complete, especially when you're generating a couple of paragraphs. In such cases, it is useful to stream the text generation process to the client in real-time. This allows the client to display the generated text as it is being generated, rather than have users wait for it to complete before displaying the result.

<Browser>
  <TextGeneration stream />
</Browser>

## Client

Let's create a simple React component that will call the `generate` function when a button is clicked. The `generate` function will call the `streamText` function, which will then generate text based on the input prompt. To consume the stream of text in the client, we will use the `readStreamableValue` function from the `@ai-sdk/rsc` module.

```tsx filename="app/page.tsx"
'use client';

import { useState } from 'react';
import { generate } from './actions';
import { readStreamableValue } from '@ai-sdk/rsc';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Home() {
  const [generation, setGeneration] = useState<string>('');

  return (
    <div>
      <button
        onClick={async () => {
          const { output } = await generate('Why is the sky blue?');

          for await (const delta of readStreamableValue(output)) {
            setGeneration(currentGeneration => `${currentGeneration}${delta}`);
          }
        }}
      >
        Ask
      </button>

      <div>{generation}</div>
    </div>
  );
}
```

## Server

On the server side, we need to implement the `generate` function, which will call the `streamText` function. The `streamText` function will generate text based on the input prompt. In order to stream the text generation to the client, we will use `createStreamableValue` that can wrap any changeable value and stream it to the client.

Using DevTools, we can see the text generation being streamed to the client in real-time.

```typescript filename='app/actions.ts'
'use server';

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from '@ai-sdk/rsc';

export async function generate(input: string) {
  const stream = createStreamableValue('');

  (async () => {
    const { textStream } = streamText({
      model: openai('gpt-3.5-turbo'),
      prompt: input,
    });

    for await (const delta of textStream) {
      stream.update(delta);
    }

    stream.done();
  })();

  return { output: stream.value };
}
```


## Navigation

- [Generate Text](/cookbook/rsc/generate-text)
- [Generate Text with Chat Prompt](/cookbook/rsc/generate-text-with-chat-prompt)
- [Stream Text](/cookbook/rsc/stream-text)
- [Stream Text with Chat Prompt](/cookbook/rsc/stream-text-with-chat-prompt)
- [Generate Object](/cookbook/rsc/generate-object)
- [Stream Object](/cookbook/rsc/stream-object)
- [Call Tools](/cookbook/rsc/call-tools)
- [Call Tools in Parallel](/cookbook/rsc/call-tools-in-parallel)
- [Save Messages To Database](/cookbook/rsc/save-messages-to-database)
- [Restore Messages From Database](/cookbook/rsc/restore-messages-from-database)
- [Render Visual Interface in Chat](/cookbook/rsc/render-visual-interface-in-chat)
- [Stream Updates to Visual Interfaces](/cookbook/rsc/stream-updates-to-visual-interfaces)
- [Record Token Usage after Streaming User Interfaces](/cookbook/rsc/stream-ui-record-token-usage)


[Full Sitemap](/sitemap.md)
