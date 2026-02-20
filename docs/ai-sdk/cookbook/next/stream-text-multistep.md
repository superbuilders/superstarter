
# streamText Multi-Step Agent

You may want to have different steps in your stream where each step has different settings,
e.g. models, tools, or system prompts.

With `createUIMessageStream` and `sendFinish` / `sendStart` options when merging
into the `UIMessageStream`, you can control when the finish and start events are sent to the client,
allowing you to have different steps in a single assistant UI message.

## Server

```typescript filename='app/api/chat/route.ts'
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      // step 1 example: forced tool call
      const result1 = streamText({
        model: 'openai/gpt-4o-mini',
        system: 'Extract the user goal from the conversation.',
        messages,
        toolChoice: 'required', // force the model to call a tool
        tools: {
          extractGoal: tool({
            inputSchema: z.object({ goal: z.string() }),
            execute: async ({ goal }) => goal, // no-op extract tool
          }),
        },
      });

      // forward the initial result to the client without the finish event:
      writer.merge(result1.toUIMessageStream({ sendFinish: false }));

      // note: you can use any programming construct here, e.g. if-else, loops, etc.
      // workflow programming is normal programming with this approach.

      // example: continue stream with forced tool call from previous step
      const result2 = streamText({
        // different system prompt, different model, no tools:
        model: 'openai/gpt-4o',
        system:
          'You are a helpful assistant with a different system prompt. Repeat the extract user goal in your answer.',
        // continue the workflow stream with the messages from the previous step:
        messages: [
          ...convertToModelMessages(messages),
          ...(await result1.response).messages,
        ],
      });

      // forward the 2nd result to the client (incl. the finish event):
      writer.merge(result2.toUIMessageStream({ sendStart: false }));
    },
  });

  return createUIMessageStreamResponse({ stream });
}
```

## Client

```tsx filename="app/page.tsx"
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();

  return (
    <div>
      {messages?.map(message => (
        <div key={message.id}>
          <strong>{`${message.role}: `}</strong>
          {message.parts.map((part, index) => {
            switch (part.type) {
              case 'text':
                return <span key={index}>{part.text}</span>;
              case 'tool-extractGoal': {
                return <pre key={index}>{JSON.stringify(part, null, 2)}</pre>;
              }
            }
          })}
        </div>
      ))}
      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input value={input} onChange={e => setInput(e.currentTarget.value)} />
      </form>
    </div>
  );
}
```


## Navigation

- [Generate Text](/cookbook/next/generate-text)
- [Generate Text with Chat Prompt](/cookbook/next/generate-text-with-chat-prompt)
- [Generate Image with Chat Prompt](/cookbook/next/generate-image-with-chat-prompt)
- [Caching Middleware](/cookbook/next/caching-middleware)
- [Stream Text](/cookbook/next/stream-text)
- [Stream Text with Chat Prompt](/cookbook/next/stream-text-with-chat-prompt)
- [Stream Text with Image Prompt](/cookbook/next/stream-text-with-image-prompt)
- [Chat with PDFs](/cookbook/next/chat-with-pdf)
- [streamText Multi-Step Cookbook](/cookbook/next/stream-text-multistep)
- [Markdown Chatbot with Memoization](/cookbook/next/markdown-chatbot-with-memoization)
- [Generate Object](/cookbook/next/generate-object)
- [Generate Object with File Prompt through Form Submission](/cookbook/next/generate-object-with-file-prompt)
- [Stream Object](/cookbook/next/stream-object)
- [Call Tools](/cookbook/next/call-tools)
- [Call Tools in Multiple Steps](/cookbook/next/call-tools-multiple-steps)
- [Model Context Protocol (MCP) Tools](/cookbook/next/mcp-tools)
- [Share useChat State Across Components](/cookbook/next/use-shared-chat-context)
- [Human-in-the-Loop Agent with Next.js](/cookbook/next/human-in-the-loop)
- [Track Agent Token Usage](/cookbook/next/track-agent-token-usage)
- [Send Custom Body from useChat](/cookbook/next/send-custom-body-from-use-chat)
- [Streaming with Custom Format](/cookbook/next/custom-stream-format)
- [Render Visual Interface in Chat](/cookbook/next/render-visual-interface-in-chat)


[Full Sitemap](/sitemap.md)
