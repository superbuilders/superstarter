---
title: Bring Your Own Key (BYOK)
product: vercel
url: /docs/ai-gateway/authentication-and-byok/byok
type: integration
prerequisites:
  - /docs/ai-gateway/authentication-and-byok
  - /docs/ai-gateway
related:
  - /docs/ai-gateway/pricing
  - /docs/ai-gateway/openai-compat
summary: Learn how to configure your own provider keys with the AI Gateway.
---

# Bring Your Own Key (BYOK)

Using your own credentials with an external AI provider allows AI Gateway to authenticate requests on your behalf with [no added markup](/docs/ai-gateway/pricing#using-a-custom-api-key).
This approach is useful for using credits provided by the AI provider or executing AI queries that access private cloud data.
If a query using your credentials fails, AI Gateway will retry the query with its system credentials to improve service availability.

Integrating credentials like this with AI Gateway is sometimes referred to as **Bring-Your-Own-Key**, or **BYOK**. In the Vercel dashboard this feature is found in the **AI Gateway tab** under the **Bring Your Own Key (BYOK)** section in the sidebar.

Provider credentials are scoped to be available throughout your Vercel team, so you can use the same credentials across multiple projects.

## Getting started

- ### Retrieve credentials from your AI provider
  First, retrieve credentials from your AI provider. AI Gateway uses these credentials first to authenticate requests to that provider. If a query made with your credentials fails, AI Gateway will re-attempt with system credentials, aiming to provide improved availability.

- ### Add the credentials to your Vercel team
  1. Go to the [AI Gateway Bring Your Own Key (BYOK) page](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fbyok\&title=AI+Gateway+BYOK) in your Vercel dashboard.
  2. Find your provider from the list and click **Add**.
  3. In the dialog that appears, enter the credentials you retrieved from the provider.
  4. Ensure that the **Enabled** toggle is turned on so that the credentials are active.
  5. Click **Test Key** to validate and add your credentials.

- ### Use the credentials in your AI Gateway requests
  Once you add credentials, AI Gateway automatically includes them in your requests. You can now use these credentials to authenticate your requests.

## Request-scoped BYOK

In addition to configuring credentials in the dashboard, you can pass provider credentials on a per-request basis using the `byok` option in `providerOptions.gateway`. This is useful when you need to use different credentials for specific requests without changing your team-wide configuration.

When request-scoped BYOK credentials are provided, AI Gateway doesn't consider any cached BYOK credentials configured in the dashboard for that request. Requests may still fall back to system credentials if the provided credentials fail.

### AI SDK usage

```typescript
import type { GatewayProviderOptions } from '@ai-sdk/gateway';
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  prompt: 'Hello, world!',
  providerOptions: {
    gateway: {
      byok: {
        anthropic: [{ apiKey: process.env.ANTHROPIC_API_KEY }],
      },
    } satisfies GatewayProviderOptions,
  },
});
```

### Credential structure by provider

Each provider has its own credential structure:

- **Anthropic**: `{ apiKey: string }`
- **OpenAI**: `{ apiKey: string }`
- **Google Vertex AI**: `{ project: string, location: string, googleCredentials: { privateKey: string, clientEmail: string } }`
- **Amazon Bedrock**: `{ accessKeyId: string, secretAccessKey: string, region?: string }`

For detailed credential parameters for each provider, see the [AI SDK providers documentation](https://ai-sdk.dev/providers/ai-sdk-providers).

### Multiple credentials

You can specify multiple credentials per provider (tried in order) and credentials for multiple providers:

```typescript
providerOptions: {
  gateway: {
    byok: {
      // Multiple credentials for the same provider (tried in order)
      vertex: [
        { project: 'proj-1', location: 'us-east5', googleCredentials: { privateKey: '...', clientEmail: '...' } },
        { project: 'proj-2', location: 'us-east5', googleCredentials: { privateKey: '...', clientEmail: '...' } },
      ],
      // Multiple providers
      anthropic: [{ apiKey: 'sk-ant-...' }],
      bedrock: [{ accessKeyId: '...', secretAccessKey: '...', region: 'us-east-1' }],
    },
  } satisfies GatewayProviderOptions,
},
```

> **💡 Note:** For OpenAI-compatible API usage with request-scoped BYOK, see the
> [OpenAI-Compatible API
> documentation](/docs/ai-gateway/openai-compat#request-scoped-byok-bring-your-own-key).

## Testing your credentials

After successfully adding your credentials for a provider, you can verify that they're working directly from the **Bring Your Own Key (BYOK)** tab. To test your credentials:

1. In the [AI Gateway](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2F\&title=) tab, navigate to the **Bring Your Own Key (BYOK)** section.
2. Click the menu for your configured provider.
3. Select **Test Key** from the dropdown.

This will execute a small test query using a cheap and fast model from the selected provider to verify the health of your credentials. The test is designed to be minimal and cost-effective while ensuring your authentication is working properly.

Once the test completes, you can click on the test result badge to open a detailed test result modal. This modal includes:

- The code used to make the test request
- The raw JSON response returned by the AI Gateway


---

[View full sitemap](/docs/sitemap)
