
# MCP Elicitation

Elicitation is a mechanism where MCP servers can request additional information from the client during tool execution. This example demonstrates how to handle elicitation requests, such as collecting user registration information.

## Example: User Registration

This example shows how to set up an MCP client to handle elicitation requests from a server that needs to collect user input.

```ts
import { createMCPClient, ElicitationRequestSchema } from '@ai-sdk/mcp';
import { generateText } from 'ai';

// Create the MCP client with elicitation capability enabled
const mcpClient = await createMCPClient({
  transport: {
    type: 'sse',
    url: 'http://localhost:8083/sse',
  },
  capabilities: {
    elicitation: {},
  },
});

// Register a handler for elicitation requests
mcpClient.onElicitationRequest(ElicitationRequestSchema, async request => {
  console.log('Server is requesting:', request.params.message);
  console.log('Expected schema:', request.params.requestedSchema);

  // Collect user input according to the schema
  // This is where you would implement your own logic to prompt the user
  const userData = await promptUserForInput(request.params.requestedSchema);

  // Return the result with one of three actions:
  // - 'accept': User provided the requested information
  // - 'decline': User chose not to provide the information
  // - 'cancel': User cancelled the operation entirely
  return {
    action: 'accept',
    content: userData,
  };
});

try {
  const tools = await mcpClient.tools();

  const { text } = await generateText({
    model: 'openai/gpt-4o-mini',
    tools,
    prompt: 'Register a new user account',
  });

  console.log('Response:', text);
} finally {
  await mcpClient.close();
}

// Example implementation of promptUserForInput
async function promptUserForInput(
  schema: unknown,
): Promise<Record<string, unknown>> {
  // Implement your own logic to collect input based on the schema
  // This could be:
  // - A CLI prompt using readline
  // - A web form
  // - A GUI dialog
  // - Any other input mechanism

  // For this example, we'll return mock data
  return {
    username: 'johndoe',
    email: 'john@example.com',
    password: 'securepassword123',
    newsletter: true,
  };
}
```

## Elicitation Response Actions

Your handler must return an object with an `action` field:

- **`'accept'`**: User provided the requested information. Must include `content` with the data.
- **`'decline'`**: User chose not to provide the information.
- **`'cancel'`**: User cancelled the operation entirely.

## Important Notes

<Note type="warning">
  It is up to the client application to handle elicitation requests properly.
  The MCP client simply surfaces these requests from the server to your
  application code.
</Note>

The elicitation handler should:

1. Parse the `request.params.requestedSchema` to understand what data the server needs
2. Implement appropriate user input collection (CLI, web form, etc.)
3. Validate the input matches the requested schema
4. Return the appropriate action and content


## Navigation

- [Generate Text](/cookbook/node/generate-text)
- [Retrieval Augmented Generation](/cookbook/node/retrieval-augmented-generation)
- [Knowledge Base Agent](/cookbook/node/knowledge-base-agent)
- [Generate Text with Chat Prompt](/cookbook/node/generate-text-with-chat-prompt)
- [Generate Text with Image Prompt](/cookbook/node/generate-text-with-image-prompt)
- [Stream Text](/cookbook/node/stream-text)
- [Stream Text with Chat Prompt](/cookbook/node/stream-text-with-chat-prompt)
- [Stream Text with Image Prompt](/cookbook/node/stream-text-with-image-prompt)
- [Stream Text with File Prompt](/cookbook/node/stream-text-with-file-prompt)
- [Generate Object with a Reasoning Model](/cookbook/node/generate-object-reasoning)
- [Generate Object](/cookbook/node/generate-object)
- [Stream Object](/cookbook/node/stream-object)
- [Stream Object with Image Prompt](/cookbook/node/stream-object-with-image-prompt)
- [Record Token Usage After Streaming Object](/cookbook/node/stream-object-record-token-usage)
- [Record Final Object after Streaming Object](/cookbook/node/stream-object-record-final-object)
- [Call Tools](/cookbook/node/call-tools)
- [Call Tools in Parallel](/cookbook/node/call-tools-in-parallel)
- [Call Tools with Image Prompt](/cookbook/node/call-tools-with-image-prompt)
- [Call Tools in Multiple Steps](/cookbook/node/call-tools-multiple-steps)
- [Model Context Protocol (MCP) Tools](/cookbook/node/mcp-tools)
- [Manual Agent Loop](/cookbook/node/manual-agent-loop)
- [Web Search Agent](/cookbook/node/web-search-agent)
- [Model Context Protocol (MCP) Elicitation](/cookbook/node/mcp-elicitation)
- [Embed Text](/cookbook/node/embed-text)
- [Embed Text in Batch](/cookbook/node/embed-text-batch)
- [Intercepting Fetch Requests](/cookbook/node/intercept-fetch-requests)
- [Local Caching Middleware](/cookbook/node/local-caching-middleware)
- [Repair Malformed JSON with jsonrepair](/cookbook/node/repair-json-with-jsonrepair)
- [Dynamic Prompt Caching](/cookbook/node/dynamic-prompt-caching)


[Full Sitemap](/sitemap.md)
