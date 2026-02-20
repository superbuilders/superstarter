---
title: Authentication
product: vercel
url: /docs/ai-gateway/authentication-and-byok/authentication
type: integration
prerequisites:
  - /docs/ai-gateway/authentication-and-byok
  - /docs/ai-gateway
related:
  - /docs/oidc
summary: Learn how to authenticate with the AI Gateway using API keys and OIDC tokens.
---

# Authentication

To use the AI Gateway, you need to authenticate your requests. There are two authentication methods available:

1. **API Key Authentication**: Create and manage API keys through the Vercel Dashboard
2. **OIDC Token Authentication**: Use Vercel's automatically generated OIDC tokens

## API key

API keys provide a secure way to authenticate your requests to the AI Gateway. You can create and manage multiple API keys through the Vercel Dashboard.

### Creating an API Key

- ### Navigate to API key management
  Go to the [AI Gateway API Keys page](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys\&title=AI+Gateway+API+Keys) in your Vercel dashboard.

- ### Create a new API key
  Click **Create key** and configure your new API key.

- ### Save your API key
  Once you have the API key, save it to `.env.local` at the root of your project (or in your preferred environment file):
  ```bash filename=".env.local"
  AI_GATEWAY_API_KEY=your_api_key_here
  ```

### Using the API key

When you specify a model id as a plain string, the AI SDK will automatically use the Vercel AI Gateway provider to route the request. The AI Gateway provider looks for the API key in the `AI_GATEWAY_API_KEY` environment variable by default.

```typescript filename="app/api/chat/route.ts" {5}
import { generateText } from 'ai';

export async function GET() {
  const result = await generateText({
    model: 'xai/grok-4.1-fast-non-reasoning',
    prompt: 'Why is the sky blue?',
  });
  return Response.json(result);
}
```

## OIDC token

The [Vercel OIDC token](/docs/oidc) is a way to authenticate your requests to the AI Gateway without needing to manage an API key. Vercel automatically generates the OIDC token that it associates with your Vercel project.

> **💡 Note:** Vercel OIDC tokens are only valid for 12 hours, so you will need to refresh
> them periodically during local development. You can do this by running `vercel
>   env pull` again.

### Setting up OIDC authentication

- ### Link to a Vercel project
  Before you can use the OIDC token during local development, ensure that you link your application to a Vercel project:
  ```bash filename="terminal"
  vercel link
  ```

- ### Pull environment variables
  Pull the environment variables from Vercel to get the OIDC token:
  ```bash filename="terminal"
  vercel env pull
  ```

- ### Use OIDC authentication in your code
  With OIDC authentication, you can directly use the gateway provider without needing to obtain an API key or set it in an environment variable:
  ```typescript filename="app/api/chat/route.ts" {5}
  import { generateText } from 'ai';

  export async function GET() {
    const result = await generateText({
      model: 'xai/grok-4.1-fast-non-reasoning',
      prompt: 'Why is the sky blue?',
    });
    return Response.json(result);
  }
  ```


---

[View full sitemap](/docs/sitemap)
