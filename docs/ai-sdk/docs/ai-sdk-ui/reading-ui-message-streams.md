
# Reading UI Message Streams

`UIMessage` streams are useful outside of traditional chat use cases. You can consume them for terminal UIs, custom stream processing on the client, or React Server Components (RSC).

The `readUIMessageStream` helper transforms a stream of `UIMessageChunk` objects into an `AsyncIterableStream` of `UIMessage` objects, allowing you to process messages as they're being constructed.

## Basic Usage

```tsx
import { readUIMessageStream, streamText } from 'ai';
__PROVIDER_IMPORT__;

async function main() {
  const result = streamText({
    model: __MODEL__,
    prompt: 'Write a short story about a robot.',
  });

  for await (const uiMessage of readUIMessageStream({
    stream: result.toUIMessageStream(),
  })) {
    console.log('Current message state:', uiMessage);
  }
}
```

## Tool Calls Integration

Handle streaming responses that include tool calls:

```tsx
import { readUIMessageStream, streamText, tool } from 'ai';
__PROVIDER_IMPORT__;
import { z } from 'zod';

async function handleToolCalls() {
  const result = streamText({
    model: __MODEL__,
    tools: {
      weather: tool({
        description: 'Get the weather in a location',
        inputSchema: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: ({ location }) => ({
          location,
          temperature: 72 + Math.floor(Math.random() * 21) - 10,
        }),
      }),
    },
    prompt: 'What is the weather in Tokyo?',
  });

  for await (const uiMessage of readUIMessageStream({
    stream: result.toUIMessageStream(),
  })) {
    // Handle different part types
    uiMessage.parts.forEach(part => {
      switch (part.type) {
        case 'text':
          console.log('Text:', part.text);
          break;
        case 'tool-call':
          console.log('Tool called:', part.toolName, 'with args:', part.args);
          break;
        case 'tool-result':
          console.log('Tool result:', part.result);
          break;
      }
    });
  }
}
```

## Resuming Conversations

Resume streaming from a previous message state:

```tsx
import { readUIMessageStream, streamText } from 'ai';
__PROVIDER_IMPORT__;

async function resumeConversation(lastMessage: UIMessage) {
  const result = streamText({
    model: __MODEL__,
    messages: [
      { role: 'user', content: 'Continue our previous conversation.' },
    ],
  });

  // Resume from the last message
  for await (const uiMessage of readUIMessageStream({
    stream: result.toUIMessageStream(),
    message: lastMessage, // Resume from this message
  })) {
    console.log('Resumed message:', uiMessage);
  }
}
```


## Navigation

- [Overview](/docs/ai-sdk-ui/overview)
- [Chatbot](/docs/ai-sdk-ui/chatbot)
- [Chatbot Message Persistence](/docs/ai-sdk-ui/chatbot-message-persistence)
- [Chatbot Resume Streams](/docs/ai-sdk-ui/chatbot-resume-streams)
- [Chatbot Tool Usage](/docs/ai-sdk-ui/chatbot-tool-usage)
- [Generative User Interfaces](/docs/ai-sdk-ui/generative-user-interfaces)
- [Completion](/docs/ai-sdk-ui/completion)
- [Object Generation](/docs/ai-sdk-ui/object-generation)
- [Streaming Custom Data](/docs/ai-sdk-ui/streaming-data)
- [Error Handling](/docs/ai-sdk-ui/error-handling)
- [Transport](/docs/ai-sdk-ui/transport)
- [Reading UIMessage Streams](/docs/ai-sdk-ui/reading-ui-message-streams)
- [Message Metadata](/docs/ai-sdk-ui/message-metadata)
- [Stream Protocols](/docs/ai-sdk-ui/stream-protocol)


[Full Sitemap](/sitemap.md)
