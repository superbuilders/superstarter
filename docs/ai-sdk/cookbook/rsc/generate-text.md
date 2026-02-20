
# Generate Text

<Note>
  This example uses React Server Components (RSC). If you want to client side
  rendering and hooks instead, check out the ["generate text" example with
  useState](/examples/next-pages/basics/generating-text).
</Note>

A situation may arise when you need to generate text based on a prompt. For example, you may want to generate a response to a question or summarize a body of text. The `generateText` function can be used to generate text based on the input prompt.

<Browser>
  <TextGeneration />
</Browser>

## Client

Let's create a simple React component that will call the `getAnswer` function when a button is clicked. The `getAnswer` function will call the `generateText` function from the `ai` module, which will then generate text based on the input prompt.

```tsx filename="app/page.tsx"
'use client';

import { useState } from 'react';
import { getAnswer } from './actions';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Home() {
  const [generation, setGeneration] = useState<string>('');

  return (
    <div>
      <button
        onClick={async () => {
          const { text } = await getAnswer('Why is the sky blue?');
          setGeneration(text);
        }}
      >
        Answer
      </button>
      <div>{generation}</div>
    </div>
  );
}
```

## Server

On the server side, we need to implement the `getAnswer` function, which will call the `generateText` function from the `ai` module. The `generateText` function will generate text based on the input prompt.

```typescript filename='app/actions.ts'
'use server';

import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

export async function getAnswer(question: string) {
  const { text, finishReason, usage } = await generateText({
    model: openai('gpt-3.5-turbo'),
    prompt: question,
  });

  return { text, finishReason, usage };
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
