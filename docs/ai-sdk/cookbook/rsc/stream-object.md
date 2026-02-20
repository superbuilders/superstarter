
# Stream Object

<Note>
  This example uses React Server Components (RSC). If you want to client side
  rendering and hooks instead, check out the ["streaming object generation"
  example with
  useObject](/examples/next-pages/basics/streaming-object-generation).
</Note>

Object generation can sometimes take a long time to complete, especially when you're generating a large schema. In such cases, it is useful to stream the object generation process to the client in real-time. This allows the client to display the generated object as it is being generated, rather than have users wait for it to complete before displaying the result.

<Browser>
  <ObjectGeneration
    stream
    object={{
      notifications: [
        {
          name: 'Jamie Roberts',
          message: "Hey! How's the study grind going? Need a coffee boost?",
          minutesAgo: 15,
        },
        {
          name: 'Prof. Morgan',
          message:
            'Reminder: Your term paper is due promptly at 8 AM tomorrow. Please ensure it meets the submission guidelines outlined.',
          minutesAgo: 46,
        },
        {
          name: 'Alex Chen',
          message:
            "Dude, urgent! Borrow your notes for tomorrow's exam? I swear mine got eaten by my dog!",
          minutesAgo: 30,
        },
      ],
    }}
  />
</Browser>

## Client

Let's create a simple React component that will call the `getNotifications` function when a button is clicked. The function will generate a list of notifications as described in the schema.

```tsx filename='app/page.tsx'
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
          const { object } = await generate('Messages during finals week.');

          for await (const partialObject of readStreamableValue(object)) {
            if (partialObject) {
              setGeneration(
                JSON.stringify(partialObject.notifications, null, 2),
              );
            }
          }
        }}
      >
        Ask
      </button>

      <pre>{generation}</pre>
    </div>
  );
}
```

## Server

Now let's implement the `getNotifications` function. We'll use the `generateObject` function to generate the list of fictional notifications based on the schema we defined earlier.

```typescript filename='app/actions.ts'
'use server';

import { streamObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createStreamableValue } from '@ai-sdk/rsc';
import { z } from 'zod';

export async function generate(input: string) {
  'use server';

  const stream = createStreamableValue();

  (async () => {
    const { partialObjectStream } = streamObject({
      model: openai('gpt-4.1'),
      system: 'You generate three notifications for a messages app.',
      prompt: input,
      schema: z.object({
        notifications: z.array(
          z.object({
            name: z.string().describe('Name of a fictional person.'),
            message: z.string().describe('Do not use emojis or links.'),
            minutesAgo: z.number(),
          }),
        ),
      }),
    });

    for await (const partialObject of partialObjectStream) {
      stream.update(partialObject);
    }

    stream.done();
  })();

  return { object: stream.value };
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
