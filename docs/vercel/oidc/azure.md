---
title: Connect to Microsoft Azure
product: vercel
url: /docs/oidc/azure
type: how-to
prerequisites:
  - /docs/oidc
related:
  - /docs/functions/quickstart
  - /docs/environment-variables
summary: "Learn how to configure your Microsoft Azure account to trust Vercel's OpenID Connect (OIDC) Identity Provider (IdP)."
---

# Connect to Microsoft Azure

> **🔒 Permissions Required**: Secure backend access with OIDC federation

To understand how Azure supports OIDC through Workload Identity Federation, consult the [Azure documentation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation).

## Configure your Azure account

- ### Create a Managed Identity
  - Navigate to **All services**
  - Select **Identity**
  - Select **Manage Identities** and select **Create**
  - Choose your Azure Subscription, Resource Group, Region and Name

- ### Create a Federated Credential
  - Go to **Federated credentials** and select **Add Credential**
  - In the **Federated credential scenario** field select **Other**
  - Enter the **Issuer URL**, the URL will depend on the issuer mode setting:
    - **Team**: `https://oidc.vercel.com/[TEAM_SLUG]`, replacing `[TEAM_SLUG]` with the path from your Vercel team URL
    - **Global**: `https://oidc.vercel.com`
  - In the **Subject identifier** field use: `owner:[TEAM_SLUG]:project[PROJECT_NAME]:environment:[preview | production | development]`
    - Replace `[TEAM_SLUG]` with your team identifier from the Vercel's team URL
    - Replace `[PROJECT_NAME]` with your [project's name](https://vercel.com/docs/projects/overview#project-name) in your
      [project's settings](https://vercel.com/docs/projects/overview#project-settings)
  - In the **Name** field, use a name for your own reference such as: `[Project name] - [Environment]`
  - In the **Audience** field use: `https://vercel.com/[TEAM_SLUG]`
    - Replace `[TEAM_SLUG]` with your team identifier from the Vercel's team URL
  > **💡 Note:** Azure does not allow for partial claim conditions so you must specify the
  > `Subject` and `Audience` fields exactly. However, it is possible to create
  > mutliple federated credentials on the same managed identity to allow for the
  > various `sub` claims.

- ### Grant access to the Azure service
  In order to connect to the Azure service that you would like to use, you need to allow your Managed Identity to access it.

  For example, to use Azure CosmosDB, associate a role definition to the Managed Identity using the Azure CLI, as explained in the [Azure CosmosDB documentation](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/tutorial-vm-managed-identities-cosmos?tabs=azure-cli#grant-access).

  You are now ready to connect to your Azure service from your project's code. Review the example below.

## Example

In the following example, you create a [Vercel function](/docs/functions/quickstart#create-a-vercel-function) in a Vercel project where you have [defined Azure account environment variables](/docs/environment-variables#creating-environment-variables). The function will connect to Azure using OIDC and use a specific resource that you have allowed the Managed Identity to access.

### Query an Azure CosmosDB instance

Install the following packages:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @azure/identity @azure/cosmos @vercel/functions
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @azure/identity @azure/cosmos @vercel/functions
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @azure/identity @azure/cosmos @vercel/functions
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @azure/identity @azure/cosmos @vercel/functions
    ```
  </Code>
</CodeBlock>

In the API route for this function, use the following code to perform a database `SELECT` query from an Azure CosmosDB instance:

```ts filename="/api/azure-cosmosdb/route.ts"
import {
  ClientAssertionCredential,
  AuthenticationRequiredError,
} from '@azure/identity';
import * as cosmos from '@azure/cosmos';
import { getVercelOidcToken } from '@vercel/oidc';

/**
 * The Azure Active Directory tenant (directory) ID.
 * Added to environment variables
 */
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID!;

/**
 * The client (application) ID of an App Registration in the tenant.
 * Added to environment variables
 */
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID!;
const COSMOS_DB_ENDPOINT = process.env.COSMOS_DB_ENDPOINT!;
const COSMOS_DB_ID = process.env.COSMOS_DB_ID!;
const COSMOS_DB_CONTAINER_ID = process.env.COSMOS_DB_CONTAINER_ID!;

const tokenCredentials = new ClientAssertionCredential(
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  getVercelOidcToken,
);

const cosmosClient = new cosmos.CosmosClient({
  endpoint: COSMOS_DB_ENDPOINT,
  aadCredentials: tokenCredentials,
});

const container = cosmosClient
  .database(COSMOS_DB_ID)
  .container(COSMOS_DB_CONTAINER_ID);

export async function GET() {
  const { resources } = await container.items
    .query('SELECT * FROM my_table')
    .fetchAll();

  return Response.json(resources);
}
```


---

[View full sitemap](/docs/sitemap)
