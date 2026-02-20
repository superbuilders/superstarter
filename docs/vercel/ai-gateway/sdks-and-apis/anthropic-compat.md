---
title: Anthropic-Compatible API
product: vercel
url: /docs/ai-gateway/sdks-and-apis/anthropic-compat
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis
  - /docs/ai-gateway
related:
  - /docs/agent-resources/coding-agents/claude-code
  - /docs/ai-gateway/anthropic-compat/messages
  - /docs/ai-gateway/anthropic-compat/tool-calls
  - /docs/ai-gateway/anthropic-compat/advanced
  - /docs/ai-gateway/anthropic-compat/file-attachments
summary: Use Anthropic-compatible API endpoints with the AI Gateway for seamless integration with Anthropic SDK tools.
---

# Anthropic-Compatible API

AI Gateway provides Anthropic-compatible API endpoints, so you can use the Anthropic SDK and tools like [Claude Code](https://www.claude.com/product/claude-code) through a unified gateway with only a URL change.

The Anthropic-compatible API implements the same specification as the [Anthropic Messages API](https://docs.anthropic.com/en/api/messages).

For more on using AI Gateway with Claude Code, see the [Claude Code instructions](/docs/agent-resources/coding-agents/claude-code).

## Base URL

The Anthropic-compatible API is available at the following base URL:

```
https://ai-gateway.vercel.sh
```

## Authentication

The Anthropic-compatible API supports the same authentication methods as the main AI Gateway:

- **API key**: Use your AI Gateway API key with the `x-api-key` header or `Authorization: Bearer <token>` header
- **OIDC token**: Use your Vercel OIDC token with the `Authorization: Bearer <token>` header

You only need to use one of these forms of authentication. If an API key is specified it will take precedence over any OIDC token, even if the API key is invalid.

## Supported endpoints

The AI Gateway supports the following Anthropic-compatible endpoint:

- [`POST /v1/messages`](/docs/ai-gateway/anthropic-compat/messages) - Create messages with support for streaming, [tool calls](/docs/ai-gateway/anthropic-compat/tool-calls), [extended thinking](/docs/ai-gateway/anthropic-compat/advanced), and [file attachments](/docs/ai-gateway/anthropic-compat/file-attachments)

For advanced features, see:

- [Advanced features](/docs/ai-gateway/anthropic-compat/advanced) - Extended thinking and web search

## Configuring Claude Code

[Claude Code](https://code.claude.com/docs) is Anthropic's agentic coding tool. You can configure it to use Vercel AI Gateway, enabling you to:

- Route requests through multiple AI providers
- Monitor traffic and spend in your AI Gateway Overview
- View detailed traces in Vercel Observability under AI
- Use any model available through the gateway

- ### Configure environment variables
  Configure Claude Code to use the AI Gateway by setting these [environment variables](https://code.claude.com/docs/en/settings#environment-variables):

  | Variable               | Value                          |
  | ---------------------- | ------------------------------ |
  | `ANTHROPIC_BASE_URL`   | `https://ai-gateway.vercel.sh` |
  | `ANTHROPIC_AUTH_TOKEN` | Your AI Gateway API key        |
  | `ANTHROPIC_API_KEY`    | `""` (empty string)            |
  > **💡 Note:** Setting `ANTHROPIC_API_KEY` to an empty string is important. Claude Code
  > checks this variable first, and if it's set to a non-empty value, it will use
  > that instead of `ANTHROPIC_AUTH_TOKEN`.
  #### Option 1: Shell alias (simplest)
  Add this alias to your `~/.zshrc` (or `~/.bashrc`):
  ```bash
  alias claude-vercel='ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh" ANTHROPIC_AUTH_TOKEN="your-api-key-here" ANTHROPIC_API_KEY="" claude'
  ```
  Then reload your shell:
  ```bash
  source ~/.zshrc
  ```
  #### Option 2: Wrapper script
  For more flexibility (e.g., adding additional logic), create a wrapper script at `~/bin/claude-vercel`:
  ```bash filename="claude-vercel"
  #!/usr/bin/env bash
  # Routes Claude Code through Vercel AI Gateway

  ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh" \
  ANTHROPIC_AUTH_TOKEN="your-api-key-here" \
  ANTHROPIC_API_KEY="" \
  claude "$@"
  ```
  Make it executable and ensure `~/bin` is in your PATH:
  ```bash
  mkdir -p ~/bin
  chmod +x ~/bin/claude-vercel
  echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
  source ~/.zshrc
  ```

- ### Run Claude Code
  Run `claude-vercel` to start Claude Code with AI Gateway:
  ```bash
  claude-vercel
  ```
  Your requests will now be routed through Vercel AI Gateway.

## Integration with Anthropic SDK

You can use the AI Gateway's Anthropic-compatible API with the official [Anthropic SDK](https://docs.anthropic.com/en/api/client-sdks). Point your client to the AI Gateway's base URL and use your AI Gateway [API key](/docs/ai-gateway/authentication#api-key) or [OIDC token](/docs/ai-gateway/authentication#oidc-token) for authentication.

> **💡 Note:** The examples and content in this section are not comprehensive. For complete
> documentation on available parameters, response formats, and advanced
> features, refer to the [Anthropic Messages
> API](https://docs.anthropic.com/en/api/messages) documentation.

#### TypeScript

```typescript filename="client.ts"
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_GATEWAY_API_KEY,
  baseURL: 'https://ai-gateway.vercel.sh',
});

const message = await anthropic.messages.create({
  model: 'anthropic/claude-sonnet-4.5',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello, world!' }],
});
```

#### Python

```python filename="client.py"
import os
import anthropic

client = anthropic.Anthropic(
    api_key=os.getenv('AI_GATEWAY_API_KEY'),
    base_url='https://ai-gateway.vercel.sh'
)

message = client.messages.create(
    model='anthropic/claude-sonnet-4.5',
    max_tokens=1024,
    messages=[
        {'role': 'user', 'content': 'Hello, world!'}
    ]
)
```

## Parameters

The messages endpoint supports the following parameters:

### Required parameters

- `model` (string): The model to use (e.g., `anthropic/claude-sonnet-4.5`)
- `max_tokens` (integer): Maximum number of tokens to generate
- `messages` (array): Array of message objects with `role` and `content` fields

### Optional parameters

- `stream` (boolean): Whether to stream the response. Defaults to `false`
- `temperature` (number): Controls randomness in the output. Range: 0-1
- `top_p` (number): Nucleus sampling parameter. Range: 0-1
- `top_k` (integer): Top-k sampling parameter
- `stop_sequences` (array): Stop sequences for the generation
- `tools` (array): Array of tool definitions for function calling
- `tool_choice` (object): Controls which tools are called
- `thinking` (object): Extended thinking configuration
- `system` (string or array): System prompt

## Error handling

The API returns standard HTTP status codes and error responses:

### Common error codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Invalid or missing authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Model or endpoint not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error response format

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid request: missing required parameter 'max_tokens'"
  }
}
```


---

[View full sitemap](/docs/sitemap)
