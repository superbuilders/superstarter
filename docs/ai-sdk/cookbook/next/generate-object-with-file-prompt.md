
# Generate Object with File Prompt through Form Submission

<Note>
  This feature is limited to models/providers that support PDF inputs
  ([Anthropic](/providers/ai-sdk-providers/anthropic#pdf-support),
  [OpenAI](/providers/ai-sdk-providers/openai#pdf-support), [Google
  Gemini](/providers/ai-sdk-providers/google-generative-ai#file-inputs), and
  [Google Vertex](/providers/ai-sdk-providers/google-vertex#file-inputs)).
</Note>

With select models, you can send PDFs (files) as part of your prompt. Let's create a simple Next.js application that allows a user to upload a PDF send it to an LLM for summarization.

## Client

On the frontend, create a form that allows the user to upload a PDF. When the form is submitted, send the PDF to the `/api/analyze` route.

```tsx file="app/page.tsx"
'use client';

import { useState } from 'react';

export default function Page() {
  const [description, setDescription] = useState<string>();
  const [loading, setLoading] = useState(false);

  return (
    <div>
      <form
        action={async formData => {
          try {
            setLoading(true);
            const response = await fetch('/api/analyze', {
              method: 'POST',
              body: formData,
            });
            setLoading(false);

            if (response.ok) {
              setDescription(await response.text());
            }
          } catch (error) {
            console.error('Analysis failed:', error);
          }
        }}
      >
        <div>
          <label>Upload Image</label>
          <input name="pdf" type="file" accept="application/pdf" />
        </div>
        <button type="submit" disabled={loading}>
          Submit{loading && 'ing...'}
        </button>
      </form>
      {description && (
        <pre>{JSON.stringify(JSON.parse(description), null, 2)}</pre>
      )}
    </div>
  );
}
```

## Server

On the server, create an API route that receives the PDF, sends it to the LLM, and returns the result. This example uses the [ `generateObject` ](/docs/reference/ai-sdk-core/generate-object) function to generate the summary as part of a structured output.

```typescript file="app/api/analyze/route.ts"
import { generateObject } from 'ai';
import { z } from 'zod';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('pdf') as File;

  // Convert the file's arrayBuffer to a Base64 data URL
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // Convert Uint8Array to an array of characters
  const charArray = Array.from(uint8Array, byte => String.fromCharCode(byte));
  const binaryString = charArray.join('');
  const base64Data = btoa(binaryString);
  const fileDataUrl = `data:application/pdf;base64,${base64Data}`;

  const result = await generateObject({
    model: 'openai/gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze the following PDF and generate a summary.',
          },
          {
            type: 'file',
            data: fileDataUrl,
            mediaType: 'application/pdf',
          },
        ],
      },
    ],
    schema: z.object({
      people: z
        .object({
          name: z.string().describe('The name of the person.'),
          age: z.number().min(0).describe('The age of the person.'),
        })
        .array()
        .describe('An array of people.'),
    }),
  });

  return Response.json(result.object);
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
