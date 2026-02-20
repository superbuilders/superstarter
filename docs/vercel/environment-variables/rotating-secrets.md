---
title: Rotating environment variables
product: vercel
url: /docs/environment-variables/rotating-secrets
type: how-to
prerequisites:
  - /docs/environment-variables
related:
  - /docs/environment-variables
  - /docs/deployments/environments
  - /docs/deployments/managing-deployments
  - /docs/environment-variables/shared-environment-variables
  - /docs/integrations
summary: Safely rotate API keys, tokens, and other secrets in your Vercel environment variables.
---

# Rotating environment variables

> **💡 Note:** Find guides for rotating secrets for our Marketplace providers in [Vercel's Knowledge Base](https://vercel.com/kb/integrations).

When you need to rotate API keys, tokens, or other credentials stored in your [environment variables](/docs/environment-variables), you'll need to update both your third-party service and your Vercel projects. This ensures your applications continue to work without downtime.

Secret rotation is a security best practice that limits the exposure window if a credential is compromised. You might rotate secrets when:

- A team member with access to credentials leaves
- You suspect a credential has been exposed
- Your security policy requires periodic rotation
- A third-party service forces a credential update

## Rotating secrets safely

The key to safe rotation is updating Vercel *before* you invalidate the old credential. This prevents your deployments from breaking when the old key stops working.

### For project-level environment variables

If your secret is configured at the [project level](/docs/environment-variables), only that project uses it. You'll only need to redeploy that one project.

1. Go to your third-party service (like a database provider, API service, or integration) and generate a new credential. Don't delete or invalidate the old one yet.
2. From your Vercel [dashboard](/dashboard), select the project that uses this credential.
3. Go to **Settings** > **Environment Variables**.
4. Find the environment variable that stores the credential. Click the three dots to the right and select **Edit**.
5. Replace the old value with your new credential.
6. Make sure the correct [environments](/docs/deployments/environments) are selected (Production, Preview, and/or Development).
7. Click **Save**.
8. [Redeploy your project](/docs/deployments/managing-deployments#redeploy-a-project) to apply the new credential:
   - Go to the **Deployments** tab.
   - Find your latest production deployment.
   - Click the three dots and select **Redeploy**.
   - Once the new deployment succeeds and you've verified it works, go back to your third-party service and invalidate the old credential.

> **💡 Note:** If you're using the [Preview environment](/docs/deployments/environments#preview-environment-pre-production), redeploy your preview deployments as well to avoid errors when you invalidate the old credential.

### For team-level environment variables

If your secret is configured at the [team level](/docs/environment-variables/shared-environment-variables), multiple projects might use it. You'll need to redeploy all projects that depend on this credential.

1. Go to your third-party service and generate a new credential. Keep the old one active for now.
2. From your Vercel [dashboard](/dashboard), select your team from the scope selector.
3. Go to **Settings** > **Environment Variables**.
4. Find the environment variable that stores the credential. Click the three dots to the right and select **Edit**.
5. Replace the old value with your new credential.
6. Make sure the correct [environments](/docs/deployments/environments) are selected (Production, Preview, and/or Development).
7. Click **Save**.
8. Identify which projects use this credential. You can check the **Link to Projects** field in the environment variable form to see which projects have access.
9. Redeploy each project that uses this credential:
   - Go to each project's **Deployments** tab.
   - Find the latest production deployment.
   - Click the three dots and select **Redeploy**.
10. Once all deployments succeed and you've verified they work, go back to your third-party service and invalidate the old credential.

> **⚠️ Warning:** If you invalidate the old credential before all projects are redeployed, any project still using the old value will fail until you redeploy it.

## Rotating credentials for integrations

> **💡 Note:** Find guides for rotating secrets for our Marketplace providers in [Vercel's Knowledge Base](https://vercel.com/kb/integrations).

When rotating credentials for [integrations](/docs/integrations) (like database providers or third-party services installed from the Vercel Marketplace):

1. Navigate to the integration from the **Integrations** tab and then by selecting the provider you want to rotate credentials for
2. Click "Log into provider" (if there are multiple resources for the integration, you will need to do this for each resource)
3. Manually reset the credentials in the provider's dashboard (this will synchronize the new secrets to your Vercel team and stage them to be applied to linked projects when the projects are redeployed)
4. Redeploy the projects that use this integration or resource.
5. Test your application to confirm the new credential works.
6. Return to your integration's dashboard and revoke or delete the old credential (if the provider supports this).

> **💡 Note:** If the integration allows for provisioning resources, you will have to repeat this process for each resource that you've provisioned. These resources are listed on the integration page.

## Troubleshooting

### Deployment fails after rotating a secret

If your deployment fails after updating a credential:

- Check that you copied the new credential correctly (no extra spaces or line breaks).
- Verify that the new credential is active in your third-party service.
- Make sure you selected the correct environment (Production, Preview, or Development) when updating the variable.
- Check your application logs in the Vercel dashboard for specific error messages.

### Old deployments still use the old credential

Environment variable changes only apply to new deployments. If you visit an old deployment URL, it will still use the old credential. This is expected behavior.

Once you invalidate the old credential, old deployments that relied on it will fail if they make API calls using that credential. Redeploy the old deployment to fix this, as each new deployment picks up the latest version of the environment variables.

### Multiple projects broke after rotation

If you rotated a team-level environment variable and multiple projects broke, you may have missed redeploying some projects:

1. Go to your team's **Environment Variables** settings.
2. Find the variable you rotated and check which projects have access to it.
3. Redeploy any projects you missed.


---

[View full sitemap](/docs/sitemap)
