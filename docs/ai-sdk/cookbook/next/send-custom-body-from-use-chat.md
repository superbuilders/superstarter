
# Send Custom Body from useChat

<Note>
  If you are looking to send custom values alongside each message, check out the
  [chatbot request configuration
  documentation](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot#request-configuration).
</Note>

By default, `useChat` sends all messages as well as information from the request to the server.
However, it is often desirable to control the entire body content that is sent to the server, e.g. to:

- only send the last message
- send additional data along with the message
- change the structure of the request body

The `prepareSendMessagesRequest` option allows you to customize the entire body content that is sent to the server.
The function receives the message list, the request data, and the request body from the append call.
It should return the body content that will be sent to the server.

## Example

This example shows how to only send the text of the last message to the server.
This can be useful if you want to reduce the amount of data sent to the server.

### Client

```typescript filename='app/page.tsx' highlight="3,7-14"
'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat({
    transport: new DefaultChatTransport({
      prepareSendMessagesRequest: ({ id, messages }) => {
        return {
          body: {
            id,
            message: messages[messages.length - 1],
          },
        };
      },
    }),
  });

  return (
    <div>
    {messages.map((message, index) => (
      <div key={index}>
        {message.role === 'user' ? 'User: ' : 'AI: '}
        {message.parts.map((part) => {
          switch (part.type) {
            case "text":
              return <div key={`${message.id}-text`}>{part.text}</div>;
          }
        })}
      </div>
    ))}

      <form onSubmit={(e) => {
        e.preventDefault();
        sendMessage({text: input});
        setInput('');
      }}>
        <input value={input} onChange={(e) => setInput(e.currentTarget.value)} />
      </form>
    </div>
  );
}
```

### Server

We need to adjust the server to receive the custom request format with the chat ID and last message.
The rest of the message history can be loaded from storage.

```tsx filename='app/api/chat/route.ts' highlight="8,11,12,16"
import { convertToModelMessages, streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { id, message } = await req.json();

  // Load existing messages and add the new one
  const messages = await loadMessages(id);
  messages.push(message);

  // Call the language model
  const result = streamText({
    model: 'openai/gpt-4.1',
    messages: await convertToModelMessages(messages),
  });

  // Respond with the stream
  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: ({ messages: newMessages }) => {
      saveMessages(id, newMessages);
    },
  });
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
