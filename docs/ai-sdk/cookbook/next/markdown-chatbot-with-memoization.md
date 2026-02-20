
# Markdown Chatbot with Memoization

When building a chatbot with Next.js and the AI SDK, you'll likely want to render the model's responses in Markdown format using a library like `react-markdown`. However, this can have negative performance implications as the Markdown is re-rendered on each new token received from the streaming response.

As conversations get longer and more complex, this performance impact becomes exponentially worse since the entire conversation history is re-rendered with each new token.

This recipe uses memoization - a performance optimization technique where the results of expensive function calls are cached and reused to avoid unnecessary re-computation. In this case, parsed Markdown blocks are memoized to prevent them from being re-parsed and re-rendered on each token update, which means that once a block is fully parsed, it's cached and reused rather than being regenerated. This approach significantly improves rendering performance for long conversations by eliminating redundant parsing and rendering operations.

## Installation

First, install the required dependencies for Markdown rendering and parsing:

```bash
npm install react-markdown marked
```

## Server

On the server, you use a simple route handler that streams the response from the language model.

```tsx filename='app/api/chat/route.ts'
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    system:
      'You are a helpful assistant. Respond to the user in Markdown format.',
    model: 'openai/gpt-4o',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

## Memoized Markdown Component

Next, create a memoized markdown component that will take in raw Markdown text into blocks and only updates when the content actually changes. This component splits Markdown content into blocks using the `marked` library to identify discrete Markdown elements, then uses React's memoization features to optimize re-rendering by only updating blocks that have actually changed.

```tsx filename='components/memoized-markdown.tsx'
import { marked } from 'marked';
import { memo, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';

function parseMarkdownIntoBlocks(markdown: string): string[] {
  const tokens = marked.lexer(markdown);
  return tokens.map(token => token.raw);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return <ReactMarkdown>{content}</ReactMarkdown>;
  },
  (prevProps, nextProps) => {
    if (prevProps.content !== nextProps.content) return false;
    return true;
  },
);

MemoizedMarkdownBlock.displayName = 'MemoizedMarkdownBlock';

export const MemoizedMarkdown = memo(
  ({ content, id }: { content: string; id: string }) => {
    const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

    return blocks.map((block, index) => (
      <MemoizedMarkdownBlock content={block} key={`${id}-block_${index}`} />
    ));
  },
);

MemoizedMarkdown.displayName = 'MemoizedMarkdown';
```

## Client

Finally, on the client, use the `useChat` hook to manage the chat state and render the chat interface. You can use the `MemoizedMarkdown` component to render the message contents in Markdown format without compromising on performance. Additionally, you can render the form in its own component so as to not trigger unnecessary re-renders of the chat messages. You can also use the `experimental_throttle` option that will throttle data updates to a specified interval, helping to manage rendering performance.

```typescript filename='app/page.tsx'
"use client";

import { Chat, useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState } from "react";
import { MemoizedMarkdown } from "@/components/memoized-markdown";

const chat = new Chat({
  transport: new DefaultChatTransport({
    api: "/api/chat",
  }),
});

export default function Page() {
  const { messages } = useChat({ chat, experimental_throttle: 50 });

  return (
    <div className="flex flex-col w-full max-w-xl py-24 mx-auto stretch">
      <div className="space-y-8 mb-4">
        {messages.map((message) => (
          <div key={message.id}>
            <div className="font-bold mb-2">
              {message.role === "user" ? "You" : "Assistant"}
            </div>
            <div className="prose space-y-2">
              {message.parts.map((part) => {
                if (part.type === "text") {
                  return (
                    <MemoizedMarkdown
                      key={`${message.id}-text`}
                      id={message.id}
                      content={part.text}
                    />
                  );
                }
              })}
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
}

const MessageInput = () => {
  const [input, setInput] = useState("");
  const { sendMessage } = useChat({ chat });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        sendMessage({
          text: input,
        });
        setInput("");
      }}
    >
      <input
        className="fixed bottom-0 w-full max-w-xl p-2 mb-8 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
        placeholder="Say something..."
        value={input}
        onChange={(event) => {
          setInput(event.target.value);
        }}
      />
    </form>
  );
};
```

<Note>
  The chat state is shared between both components by using the same `Chat`
  instance. This allows you to split the form and chat messages into separate
  components while maintaining synchronized state.
</Note>


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
