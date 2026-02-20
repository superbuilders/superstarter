
# Call Tools in Multiple Steps

Some language models are great at calling tools in multiple steps to achieve a more complex task. This is particularly useful when the tools are dependent on each other and need to be executed in sequence during the same generation step.

## Client

Let's create a React component that imports the `useChat` hook from the `@ai-sdk/react` module. The `useChat` hook will call the `/api/chat` endpoint when the user sends a message. The endpoint will generate the assistant's response based on the conversation history and stream it to the client. If the assistant responds with a tool call, the hook will automatically display them as well.

```tsx filename='app/page.tsx'
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import type { ChatMessage } from './api/chat/route';

export default function Page() {
  const [input, setInput] = useState('');

  const { messages, sendMessage } = useChat<ChatMessage>({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  return (
    <div>
      <input
        className="border"
        value={input}
        onChange={event => {
          setInput(event.target.value);
        }}
        onKeyDown={async event => {
          if (event.key === 'Enter') {
            sendMessage({
              text: input,
            });
            setInput('');
          }
        }}
      />

      {messages.map((message, index) => (
        <div key={index}>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <div key={`${message.id}-text`}>{part.text}</div>;
              case 'tool-getLocation':
              case 'tool-getWeather':
                return (
                  <div key={`${message.id}-weather-${i}`}>
                    {JSON.stringify(part, null, 2)}
                  </div>
                );
            }
          })}
        </div>
      ))}
    </div>
  );
}
```

## Server

You will create a new route at `/api/chat` that will use the `streamText` function from the `ai` module to generate the assistant's response based on the conversation history.

You will use the [`tools`](/docs/reference/ai-sdk-core/generate-text#tools) parameter to specify two tools called `getLocation` and `getWeather` that will first get the user's location and then use it to get the weather.

You will add the two functions mentioned earlier and use zod to specify the schema for its parameters.

To call tools in multiple steps, you can use the `stopWhen` option to specify the stopping conditions for when the model generates a tool call. In this example, you will set it to `stepCountIs(5)` to allow for multiple consecutive tool calls (steps).

```ts filename='app/api/chat/route.ts'
import {
  type InferUITools,
  type ToolSet,
  type UIDataTypes,
  type UIMessage,
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

const tools = {
  getLocation: tool({
    description: 'Get the location of the user',
    inputSchema: z.object({}),
    execute: async () => {
      const location = { lat: 37.7749, lon: -122.4194 };
      return `Your location is at latitude ${location.lat} and longitude ${location.lon}`;
    },
  }),
  getWeather: tool({
    description: 'Get the weather for a location',
    inputSchema: z.object({
      city: z.string().describe('The city to get the weather for'),
      unit: z
        .enum(['C', 'F'])
        .describe('The unit to display the temperature in'),
    }),
    execute: async ({ city, unit }) => {
      const weather = {
        value: 24,
        description: 'Sunny',
      };

      return `It is currently ${weather.value}°${unit} and ${weather.description} in ${city}!`;
    },
  }),
} satisfies ToolSet;

export type ChatTools = InferUITools<typeof tools>;

export type ChatMessage = UIMessage<never, UIDataTypes, ChatTools>;

export async function POST(req: Request) {
  const { messages }: { messages: ChatMessage[] } = await req.json();

  const result = streamText({
    model: 'openai/gpt-4o',
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(5),
    tools,
  });

  return result.toUIMessageStreamResponse();
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
