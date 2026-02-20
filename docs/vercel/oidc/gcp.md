---
title: Connect to Google Cloud Platform (GCP)
product: vercel
url: /docs/oidc/gcp
type: how-to
prerequisites:
  - /docs/oidc
related:
  - /docs/environment-variables
  - /docs/functions/quickstart
summary: "Learn how to configure your GCP project to trust Vercel's OpenID Connect (OIDC) Identity Provider (IdP)."
---

# Connect to Google Cloud Platform (GCP)

> **🔒 Permissions Required**: Secure backend access with OIDC federation

To understand how GCP supports OIDC through Workload Identity Federation, consult the [GCP documentation](https://cloud.google.com/iam/docs/workload-identity-federation).

## Configure your GCP project

- ### Configure a Workload Identity Federation
  1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/)
  2. Navigate to **IAM & Admin** then **Workload Identity Federation**
  3. Click on **Create Pool**

- ### Create an identity pool
  1. Enter a name for the pool, e.g. `Vercel`
  2. Enter an ID for the pool, e.g. `vercel` and click **Continue**
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-id-pool.png`)

- ### Add a provider to the identity pool
  1. Select `OpenID Connect (OIDC)` from the provider types
  2. Enter a name for the provider, e.g. `Vercel`
  3. Enter an ID for the provider, e.g. `vercel`
  4. Enter the **Issuer URL**, the URL will depend on the issuer mode setting:
     - **Team**: `https://oidc.vercel.com/[TEAM_SLUG]`, replacing `[TEAM_SLUG]` with the path from your Vercel team URL
     - **Global**: `https://oidc.vercel.com`
  5. Leave JWK file (JSON) empty
  6. Select `Allowed audiences` from "Audience"
  7. Enter `https://vercel.com/[TEAM_SLUG]` in the "Audience 1" field and click "Continue"
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-id-pool-2.png`)

- ### Configure the provider attributes
  1. Assign the `google.subject` mapping to `assertion.sub`
  2. Click **Save**
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-id-pool-3.png`)

- ### Create a service account
  1. Copy the **IAM Principal** from the pool details page from the previous step. It should look like `principal://iam.googleapis.com/projects/012345678901/locations/global/workloadIdentityPools/vercel/subject/SUBJECT_ATTRIBUTE_VALUE`
  2. Navigate to **IAM & Admin** then **Service Accounts**
  3. Click on **Create Service Account**
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-copy-pool-id.png`)

- ### Enter the service account details
  1. Enter a name for the service account, e.g. `Vercel`.
  2. Enter an ID for the service account, e.g. `vercel` and click **Create and continue**.
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-service-account-1.png`)

- ### Grant the service account access to the project
  1. Select a role or roles for the service account, e.g. `Storage Object Admin`.
  2. Click **Continue**.
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-service-account-2.png`)

- ### Grant users access to the service account
  1. Paste in the **IAM Principal** copied from the pool details page in the **Service account users role** field.
     - Replace `SUBJECT_ATTRIBUTE_VALUE` with `owner:[VERCEL_TEAM]:project:[PROJECT_NAME]:environment:[ENVIRONMENT]`. e.g. `principal://iam.googleapis.com/projects/012345678901/locations/global/workloadIdentityPools/vercel/subject/owner:acme:project:my-project:environment:production`.
     - You can add multiple principals to this field, add a principal for each project and environment you want to grant access to.
  2. Click **Done**.
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/gcp-create-service-account-3.png`)

- ### Define GCP account values as environment variables
  Once you have configured your GCP project with OIDC access, gather the following values from the Google Cloud Console:
  | Value | Location | Environment Variable | Example |
  | ---------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------- |
  | Project ID | IAM & Admin -> Settings | `GCP_PROJECT_ID` | `my-project-123456` |
  | Project Number | IAM & Admin -> Settings | `GCP_PROJECT_NUMBER` | `1234567890` |
  | Service Account Email | IAM & Admin -> Service Accounts | `GCP_SERVICE_ACCOUNT_EMAIL` | `vercel@my-project-123456.iam.gserviceaccount.com` |
  | Workload Identity Pool ID | IAM & Admin -> Workload Identity Federation -> Pools | `GCP_WORKLOAD_IDENTITY_POOL_ID` | `vercel` |
  | Workload Identity Pool Provider ID | IAM & Admin -> Workload Identity Federation -> Pools -> Providers | `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | `vercel` |

  Then, [declare them as environment variables](/docs/environment-variables#creating-environment-variables) in your Vercel project.

  You are now ready to connect to your GCP resource from your project's code. Review the example below.

## Example

In the following example, you create a [Vercel function](/docs/functions/quickstart#create-a-vercel-function) in the Vercel project where you have defined the GCP account environment variables. The function will connect to GCP using OIDC and use a specific resource provided by Google Cloud services.

### Return GCP Vertex AI generated text

Install the following packages:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i google-auth-library @ai-sdk/google-vertex ai @vercel/functions
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i google-auth-library @ai-sdk/google-vertex ai @vercel/functions
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i google-auth-library @ai-sdk/google-vertex ai @vercel/functions
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i google-auth-library @ai-sdk/google-vertex ai @vercel/functions
    ```
  </Code>
</CodeBlock>

In the API route for this function, use the following code to perform the following tasks:

- Use `google-auth-library` to create an External Account Client
- Use it to authenticate with Google Cloud Services
- Use Vertex AI with [Google Vertex Provider](https://sdk.vercel.ai/providers/ai-sdk-providers/google-vertex) to generate text from a prompt

```ts filename="/api/gcp-vertex-ai/route.ts"
import { getVercelOidcToken } from '@vercel/oidc';
import { ExternalAccountClient } from 'google-auth-library';
import { createVertex } from '@ai-sdk/google-vertex';
import { generateText } from 'ai';

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER;
const GCP_SERVICE_ACCOUNT_EMAIL = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const GCP_WORKLOAD_IDENTITY_POOL_ID = process.env.GCP_WORKLOAD_IDENTITY_POOL_ID;
const GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID =
  process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID;

// Initialize the External Account Client
const authClient = ExternalAccountClient.fromJSON({
  type: 'external_account',
  audience: `//iam.googleapis.com/projects/${GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`,
  subject_token_type: 'urn:ietf:params:oauth:token-type:jwt',
  token_url: 'https://sts.googleapis.com/v1/token',
  service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
  subject_token_supplier: {
    // Use the Vercel OIDC token as the subject token
    getSubjectToken: getVercelOidcToken,
  },
});

const vertex = createVertex({
  project: GCP_PROJECT_ID,
  location: 'us-central1',
  googleAuthOptions: {
    authClient,
    projectId: GCP_PROJECT_ID,
  },
});

// Export the route handler
export const GET = async (req: Request) => {
  const result = generateText({
    model: vertex('gemini-1.5-flash'),
    prompt: 'Write a vegetarian lasagna recipe for 4 people.',
  });
  return Response.json(result);
};
```


---

[View full sitemap](/docs/sitemap)
