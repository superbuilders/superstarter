---
title: OpenResponses API
product: vercel
url: /docs/ai-gateway/sdks-and-apis/openresponses
type: integration
prerequisites:
  - /docs/ai-gateway/sdks-and-apis
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/authentication-and-byok/authentication
  - /docs/ai-gateway/sdks-and-apis/openresponses/text-generation
  - /docs/ai-gateway/sdks-and-apis/openresponses/streaming
  - /docs/ai-gateway/sdks-and-apis/openresponses/image-input
  - /docs/ai-gateway/sdks-and-apis/openresponses/tool-calling
summary: Use the OpenResponses API specification with AI Gateway for a unified, provider-agnostic interface.
---

# OpenResponses API

AI Gateway supports the [OpenResponses API](https://openresponses.org) specification, an open standard for AI model interactions. OpenResponses provides a unified interface across providers with built-in support for streaming, tool calling, reasoning, and multi-modal inputs.

## Base URL

The OpenResponses-compatible API is available at:

```
https://ai-gateway.vercel.sh/v1
```

## Authentication

The OpenResponses API supports the same [authentication methods](/docs/ai-gateway/authentication-and-byok/authentication) as the main AI Gateway:

- **API key**: Use your AI Gateway API key with the `Authorization: Bearer <token>` header
- **OIDC token**: Use your Vercel OIDC token with the `Authorization: Bearer <token>` header

You only need to use one of these forms of authentication. If an API key is specified it will take precedence over any OIDC token, even if the API key is invalid.

## Supported features

The OpenResponses API supports the following features:

- [Text generation](/docs/ai-gateway/sdks-and-apis/openresponses/text-generation) - Generate text responses from prompts
- [Streaming](/docs/ai-gateway/sdks-and-apis/openresponses/streaming) - Stream tokens as they're generated
- [Image input](/docs/ai-gateway/sdks-and-apis/openresponses/image-input) - Send images for analysis
- [Tool calling](/docs/ai-gateway/sdks-and-apis/openresponses/tool-calling) - Define tools the model can call
- [Provider options](/docs/ai-gateway/sdks-and-apis/openresponses/provider-options) - Configure model fallbacks and provider-specific settings

## Getting started

Here's a simple example to generate a text response:

```typescript filename="quickstart.ts"
const apiKey = process.env.AI_GATEWAY_API_KEY;

const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5',
    input: [
      {
        type: 'message',
        role: 'user',
        content: 'What is the capital of France?',
      },
    ],
  }),
});

const result = await response.json();
console.log(result.output[0].content[0].text);
```

## Parameters

### Required parameters

- `model` (string): The model ID in `provider/model` format (e.g., `openai/gpt-5.2`, `anthropic/claude-sonnet-4.5`)
- `input` (array): Array of message objects containing `type`, `role`, and `content` fields

### Optional parameters

- `stream` (boolean): Stream the response. Defaults to `false`
- `temperature` (number): Controls randomness. Range: 0-2
- `top_p` (number): Nucleus sampling. Range: 0-1
- `max_output_tokens` (integer): Maximum tokens to generate
- `tools` (array): Tool definitions for function calling
- `tool_choice` (string): Tool selection mode: `auto`, `required`, or `none`
- `reasoning` (object): Reasoning configuration with `effort` level
- `providerOptions` (object): Provider-specific options for gateway configuration

### Example with parameters

This example shows how to combine multiple parameters to control the model's behavior, set up fallbacks, and enable reasoning.

```typescript filename="parameters-example.ts"
const response = await fetch('https://ai-gateway.vercel.sh/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4.5', // provider/model format
    input: [
      {
        type: 'message',
        role: 'user',
        content: 'Explain neural networks.',
      },
    ],
    stream: true, // stream tokens as generated
    max_output_tokens: 500, // limit response length
    reasoning: {
      effort: 'medium', // reasoning depth
    },
    providerOptions: {
      gateway: {
        models: ['anthropic/claude-sonnet-4.5', 'openai/gpt-5.2'], // fallbacks
      },
    },
  }),
});
```

## Error handling

The API returns standard HTTP status codes and error responses.

### Common error codes

- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Invalid or missing authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Model or endpoint not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error response format

When an error occurs, the API returns a JSON object with details about what went wrong.

```json
{
  "error": {
    "message": "Invalid request: missing required parameter 'model'",
    "type": "invalid_request_error",
    "param": "model",
    "code": "missing_parameter"
  }
}
```


---

[View full sitemap](/docs/sitemap)
