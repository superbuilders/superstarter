
# Stream Updates to Visual Interfaces

In our previous example we've been streaming react components from the server to the client. By streaming the components, we open up the possibility to update these components based on state changes that occur in the server.

## Client

```tsx filename='app/page.tsx'
'use client';

import { useState } from 'react';
import { ClientMessage } from './actions';
import { useActions, useUIState } from '@ai-sdk/rsc';
import { generateId } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export default function Home() {
  const [input, setInput] = useState<string>('');
  const [conversation, setConversation] = useUIState();
  const { continueConversation } = useActions();

  return (
    <div>
      <div>
        {conversation.map((message: ClientMessage) => (
          <div key={message.id}>
            {message.role}: {message.display}
          </div>
        ))}
      </div>

      <div>
        <input
          type="text"
          value={input}
          onChange={event => {
            setInput(event.target.value);
          }}
        />
        <button
          onClick={async () => {
            setConversation((currentConversation: ClientMessage[]) => [
              ...currentConversation,
              { id: generateId(), role: 'user', display: input },
            ]);

            const message = await continueConversation(input);

            setConversation((currentConversation: ClientMessage[]) => [
              ...currentConversation,
              message,
            ]);
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  );
}
```

## Server

```tsx filename='app/actions.tsx'
'use server';

import { getMutableAIState, streamUI } from '@ai-sdk/rsc';
import { openai } from '@ai-sdk/openai';
import { ReactNode } from 'react';
import { z } from 'zod';
import { generateId } from 'ai';

export interface ServerMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClientMessage {
  id: string;
  role: 'user' | 'assistant';
  display: ReactNode;
}

export async function continueConversation(
  input: string,
): Promise<ClientMessage> {
  'use server';

  const history = getMutableAIState();

  const result = await streamUI({
    model: openai('gpt-3.5-turbo'),
    messages: [...history.get(), { role: 'user', content: input }],
    text: ({ content, done }) => {
      if (done) {
        history.done((messages: ServerMessage[]) => [
          ...messages,
          { role: 'assistant', content },
        ]);
      }

      return <div>{content}</div>;
    },
    tools: {
      deploy: {
        description: 'Deploy repository to vercel',
        inputSchema: z.object({
          repositoryName: z
            .string()
            .describe('The name of the repository, example: vercel/ai-chatbot'),
        }),
        generate: async function* ({ repositoryName }) {
          yield <div>Cloning repository {repositoryName}...</div>; // [!code highlight:5]
          await new Promise(resolve => setTimeout(resolve, 3000));
          yield <div>Building repository {repositoryName}...</div>;
          await new Promise(resolve => setTimeout(resolve, 2000));
          return <div>{repositoryName} deployed!</div>;
        },
      },
    },
  });

  return {
    id: generateId(),
    role: 'assistant',
    display: result.value,
  };
}
```

```typescript filename='app/ai.ts'
import { createAI } from '@ai-sdk/rsc';
import { ServerMessage, ClientMessage, continueConversation } from './actions';

export const AI = createAI<ServerMessage[], ClientMessage[]>({
  actions: {
    continueConversation,
  },
  initialAIState: [],
  initialUIState: [],
});
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
