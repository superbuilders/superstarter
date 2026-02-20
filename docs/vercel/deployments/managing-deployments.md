---
title: Managing Deployments
product: vercel
url: /docs/deployments/managing-deployments
type: how-to
prerequisites:
  - /docs/deployments
related:
  - /docs/rest-api
  - /docs/cli/deploying-from-cli
  - /docs/rest-api/reference/endpoints/deployments
  - /docs/rest-api/reference/welcome
  - /docs/security/deployment-retention
summary: Learn how to manage your current and previously deployed projects to Vercel through the dashboard. You can redeploy at any time and even delete a...
---

# Managing Deployments

You can manage all current and previous deployments regardless of environment, status, or branch from the [dashboard](/dashboard). To manage a deployment from the dashboard:

1. Ensure your team is selected from the scope selector
2. Select your project
3. From the top navigation, select the **Deployments** tab
4. You can then filter, redeploy, or manually promote your deployment to production

[Vercel CLI](https://vercel.com/cli) and [Vercel REST API](/docs/rest-api) also provide alternative ways to manage your deployments. You can find a full list of the commands available in the [Vercel CLI Reference](/docs/cli/deploying-from-cli), along with the deployments section of the [Vercel REST API Reference](/docs/rest-api/reference/endpoints/deployments).

## Filter deployment

You can filter your deployments based on branch, status, and deployment environment:

1. Select your project from the [dashboard](/dashboard)
2. From the top navigation, select the **Deployments** tab
3. Use the dropdowns to search by **Branch**, **Date Range**, **All Environments**, or **Status**

   ![Image](`/docs-assets/static/docs/concepts/deployments/filtering-deployments/filter-status-light.png`)

## Delete a deployment

#### \['Dashboard'

If you no longer need a specific deployment of your app, you can delete it from your project with the following steps:

1. From your [dashboard](/dashboard), select the project where the specific deployment is located.
2. Click on the **Deployments** tab.
3. From the list of deployments, click on the deployment that you want to delete
4. Click the ... button.
5. From the context menu, select **Delete**.

#### 'cURL'

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request DELETE \
  --url https://api.vercel.com/v13/deployments/<deployment-id> \
  --header "Authorization: Bearer $VERCEL_TOKEN"
```

#### 'SDK']

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```ts filename="deleteDeployment"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.deployments.deleteDeployment({
    id: 'deployment-id',
  });

  // Handle the result
  console.log(result);
}

run();
```

Deleting a deployment prevents you from using instant rollback on it and might break the links used in integrations, such as the ones in the pull requests of your Git provider.

You can also set a [deployment retention policy](#set-the-deployment-retention-policy) to automatically delete deployments after a certain period.

### Set the deployment retention policy

You can set the retention policy for your deployments to automatically delete them after a certain period. To learn more, see [Deployment Retention](/docs/security/deployment-retention).

## Deployment protection

Vercel provides a way to protect your deployments from being accessed by unauthorized users. You can use [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) to restrict access to your deployments to only Vercel users with [suitable access rights](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication#who-can-access-protected-deployments). You can also configure which [environments](/docs/security/deployment-protection#understanding-deployment-protection-by-environment) are protected.

In addition, Enterprise teams can use [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips) and [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) to further secure their deployments. Password protection is also available as a paid add-on for Pro teams.

To learn more, see [Deployment Protection](/docs/security/deployment-protection).

## Redeploy a project

Vercel automatically redeploys your application when you make any commits. However, there can be situations such as bad cached data where you need to **Redeploy** your application to fix issues manually. To do so:

1. Ensure your team is selected from the scope selector
2. Select your project
3. From the top navigation, select the **Deployments** tab
4. Locate the deployment you wish to deploy. You may need to use the [filter](/docs/deployments/managing-deployments#filter-deployment) options
5. Click the ellipsis icon () and select **Redeploy**
6. In the **Redeploy to Production** window, decide if you want to use the existing [Build Cache](/docs/deployments/troubleshoot-a-build#understanding-build-cache), and then select **Redeploy**

![Image](`/docs-assets/static/docs/concepts/deployments/redeploy-model-light.png`)

### When to Redeploy

Other than your custom needs to redeploy, it's always recommended to redeploy your application to Vercel for the following use cases:

- Enabling the [Analytics](/docs/analytics/quickstart)
- Changing the [Environment Variables](/docs/environment-variables)
- [Outage Resiliency](/docs/regions#outage-resiliency)
- Making changes to **Build & Development Settings**
- **Redirect** or **Rewrites** from a subdomain to a subpath


---

[View full sitemap](/docs/sitemap)
