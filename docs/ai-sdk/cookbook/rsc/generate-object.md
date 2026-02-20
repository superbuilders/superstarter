
# Generate Object

<Note>
  This example uses React Server Components (RSC). If you want to client side
  rendering and hooks instead, check out the ["generate object" example with
  useState](/examples/next-pages/basics/generating-object).
</Note>

Earlier functions like `generateText` and `streamText` gave us the ability to generate unstructured text. However, if you want to generate structured data like JSON, you can provide a schema that describes the structure of your desired object to the `generateObject` function.

The function requires you to provide a schema using [zod](https://zod.dev), a library for defining schemas for JavaScript objects. By using zod, you can also use it to validate the generated object and ensure that it conforms to the specified structure.

<Browser>
  <ObjectGeneration
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
import { getNotifications } from './actions';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Home() {
  const [generation, setGeneration] = useState<string>('');

  return (
    <div>
      <button
        onClick={async () => {
          const { notifications } = await getNotifications(
            'Messages during finals week.',
          );

          setGeneration(JSON.stringify(notifications, null, 2));
        }}
      >
        View Notifications
      </button>

      <pre>{generation}</pre>
    </div>
  );
}
```

## Server

Now let's implement the `getNotifications` function. We'll use the `generateObject` function to generate the list of notifications based on the schema we defined earlier.

```typescript filename='app/actions.ts'
'use server';

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';

export async function getNotifications(input: string) {
  'use server';

  const { object: notifications } = await generateObject({
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

  return { notifications };
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
