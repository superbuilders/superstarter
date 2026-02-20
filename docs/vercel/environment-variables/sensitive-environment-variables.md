---
title: Sensitive environment variables
product: vercel
url: /docs/environment-variables/sensitive-environment-variables
type: how-to
prerequisites:
  - /docs/environment-variables
related:
  - /docs/environment-variables
  - /docs/deployments/environments
  - /docs/environment-variables/shared-environment-variables
  - /docs/rest-api/reference/welcome
  - /docs/rbac/access-roles
summary: Environment variables that cannot be decrypted once created.
---

# Sensitive environment variables

Sensitive environment variables are [environment variables](/docs/environment-variables "Environment variables") whose values are non-readable once created. They help protect sensitive information stored in environment variables, such as API keys.

To mark an existing environment variable as sensitive, remove and re-add it with the **Sensitive** option enabled. Once you mark it as sensitive, Vercel stores the variable in an unreadable format. This is only possible for environment variables in the [production](/docs/deployments/environments#production-environment) and [preview](/docs/deployments/environments#preview-environment-pre-production) environments.

Both [project environment variables](/docs/environment-variables) and [shared environment variables](/docs/environment-variables/shared-environment-variables) can be marked as sensitive.

## Creating sensitive environment variables

> **💡 Note:** You can only create sensitive environment variables in the preview and
> production environments.

#### \['Dashboard'

Sensitive environment variables can be created at the project or team level:

1. Go to the Vercel [dashboard](/dashboard) and select your team from the scope selector. Click on the **Settings** tab and then select **Environment Variables** from the left navigation. To create sensitive environment variables at the project-level, select the project from your [dashboard](/dashboard) and then and click the **Settings** tab.
2. At the top of the form, toggle the **Sensitive** switch to **Enabled**. If the **Development** environment is selected, you will be unable to enable the switch.
3. Fill in the details to create a new environment variable.
4. In the environment variable table, sensitive environment variables are marked with a "Sensitive" tag:

   ![Image](`/docs-assets/static/docs/concepts/projects/environment-variables/listed-sev.png`)

#### 'cURL'

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request POST \
  --url https://api.vercel.com/v10/projects/<project-id-or-name>/env \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '[
    {
      "key": "<env-key-1>",
      "value": "<env-value-1>",
      "type": "sensitive",
      "target": ["<target-environment>"],
      "gitBranch": "<git-branch>",
      "comment": "<comment>",
      "customEnvironmentIds": ["<custom-env-id>"]
    }
  ]'
```

#### 'SDK']

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```ts filename="createProjectEnv"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.createProjectEnv({
    idOrName: '<project-id-or-name>',
    requestBody: {
      key: '<env-key-1>',
      value: '<env-value-1>',
      type: 'sensitive',
      target: ['<target-environment>'],
      gitBranch: '<git-branch>',
      comment: '<comment>',
      customEnvironmentIds: ['<custom-env-id>'],
    },
  });

  // Handle the result
  console.log(result);
}

run();
```

## Edit sensitive environment variables

You can edit the value and [environment](/docs/environment-variables#environments) for a sensitive environment variable. You cannot edit the key of a sensitive environment variable.

1. From your dashboard, go to the team or project's **Settings** tab and select **Environment Variables** from the left navigation. Find your environment variable in the list.
2. Click **Edit** from the three-dot menu in the environment variables list
3. Provide a new value for the sensitive environment variable. The current value is hidden.
4. Select the environment(s) for the sensitive environment variable.
5. After making the change, click the **Save** button.

## Environment variables policy

Users with the [owner](/docs/rbac/access-roles#owner-role) role can set a team-wide environment variable policy for creating environment variables. Once enabled, all newly created environment variables in the [Production](/docs/deployments/environments#production-environment) and/or [Preview](/docs/deployments/environments#preview-environment-pre-production) environments will be sensitive environment variables.

1. From the dashboard, ensure your team is selected in the scope selector and select the **Settings** tab.
2. From the left navigation, click **Security & Privacy**.
3. From the **Environment Variable Policies** section, toggle the **Enforce Sensitive Environment Variables** switch to **Enabled**:

   ![Image](`/docs-assets/static/docs/concepts/projects/environment-variables/env-var-policies-2.png`)


---

[View full sitemap](/docs/sitemap)
