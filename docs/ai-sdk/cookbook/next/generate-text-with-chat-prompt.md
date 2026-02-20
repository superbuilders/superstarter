
# Generate Text with Chat Prompt

Previously, you were able to generate text and objects using either a single message prompt, a system prompt, or a combination of both of them. However, there may be times when you want to generate text based on a series of messages.

A chat completion allows you to generate text based on a series of messages. This series of messages can be any series of interactions between any number of systems, but the most popular and relatable use case has been a series of messages that represent a conversation between a user and a model.

<Browser>
  <ChatGeneration
    history={[
      { role: 'User', content: 'How is it going?' },
      { role: 'Assistant', content: 'All good, how may I help you?' },
    ]}
    inputMessage={{ role: 'User', content: 'Why is the sky blue?' }}
    outputMessage={{
      role: 'Assistant',
      content: 'The sky is blue because of rayleigh scattering.',
    }}
  />
</Browser>

## Client

Let's start by creating a simple chat interface with an input field that sends the user's message and displays the conversation history. You will call the `/api/chat` endpoint to generate the assistant's response.

```tsx filename='app/page.tsx'
'use client';

import type { ModelMessage } from 'ai';
import { useState } from 'react';

export default function Page() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ModelMessage[]>([]);

  return (
    <div>
      <input
        value={input}
        onChange={event => {
          setInput(event.target.value);
        }}
        onKeyDown={async event => {
          if (event.key === 'Enter') {
            setMessages(currentMessages => [
              ...currentMessages,
              { role: 'user', content: input },
            ]);

            const response = await fetch('/api/chat', {
              method: 'POST',
              body: JSON.stringify({
                messages: [...messages, { role: 'user', content: input }],
              }),
            });

            const { messages: newMessages } = await response.json();

            setMessages(currentMessages => [
              ...currentMessages,
              ...newMessages,
            ]);
          }
        }}
      />

      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`}>
          {typeof message.content === 'string'
            ? message.content
            : message.content
                .filter(part => part.type === 'text')
                .map((part, partIndex) => (
                  <div key={partIndex}>{part.text}</div>
                ))}
        </div>
      ))}
    </div>
  );
}
```

## Server

Next, let's create the `/api/chat` endpoint that generates the assistant's response based on the conversation history.

```typescript filename='app/api/chat/route.ts'
import { generateText, type ModelMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: ModelMessage[] } = await req.json();

  const { response } = await generateText({
    model: 'openai/gpt-4o',
    system: 'You are a helpful assistant.',
    messages,
  });

  return Response.json({ messages: response.messages });
}
```

---

<GithubLink link="https://github.com/vercel/ai/blob/main/examples/next-openai-pages/pages/chat/generate-chat/index.tsx" />


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
