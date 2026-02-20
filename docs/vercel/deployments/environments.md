---
title: Environments
product: vercel
url: /docs/deployments/environments
type: conceptual
prerequisites:
  - /docs/deployments
related:
  - /docs/frameworks
  - /docs/cli
  - /docs/git
  - /docs/deployments/generated-urls
  - /docs/deployments/promoting-a-deployment
summary: Environments are for developing locally, testing changes in a pre-production environment, and serving end-users in production.
---

# Environments

Vercel provides three default environments—**Local**, **Preview**, and **Production**:

1. **Local Development**: developing and testing code changes on your local machine
2. **Preview**: deploying for further testing, QA, or collaboration without impacting your live site
3. **Production**: deploying the final changes to your user-facing site with the production domain

Pro and Enterprise teams can create **Custom Environments** for more specialized workflows (e.g., `staging`, `QA`). Every environment can define its own unique environment variables, like database connection information or API keys.

## Local Development Environment

This environment is where you develop new features and fix bugs on your local machine. When building with [frameworks](/docs/frameworks), use the [Vercel CLI](/docs/cli) to pull the environment variables for your project.

1. **Install the Vercel CLI**:

```bash filename="Terminal" package-manager="npm"
npm i -g vercel
```

```bash filename="Terminal" package-manager="bun"
bun i -g vercel
```

```bash filename="Terminal" package-manager="yarn"
yarn global add vercel
```

```bash filename="Terminal" package-manager="pnpm"
pnpm i -g vercel
```

2. **Link your Vercel project** with your local directory:

   ```bash
   vercel link
   ```

3. **Pull environment variables locally** for use with application development:

   ```bash
   vercel env pull
   ```

This will populate the `.env.local` file in your application directory.

## Preview Environment (Pre-production)

**Preview** environments allow you to deploy and test changes in a live setting, without affecting your production site. By default, Vercel creates a preview deployment when you:

- Push a commit to a branch that is **not** your production branch (commonly `main`)
- Create a pull request (PR) on [GitHub, GitLab, or Bitbucket](/docs/git)
- Deploy using the CLI without the `-prod` flag, for example just `vercel`

Each deployment gets an automatically generated URL, and you'll typically see links appear in your Git provider’s PR comments or in the Vercel Dashboard.

There are two types of preview URLs:

- **Branch-specific URL** – Always points to the latest changes on that branch
- **Commit-specific URL** – Points to the exact deployment of that commit

Learn more about [generated URLs](/docs/deployments/generated-urls).

## Production Environment

The **Production** environment is the live, user-facing version of your site or application.

By default, pushing or merging changes into your production branch (commonly `main`) triggers a production deployment. You can also explicitly deploy to production via the CLI:

```bash
vercel --prod
```

When a production deployment succeeds, Vercel updates your production domains to point to the new deployment, ensuring your users see the latest changes immediately. For advanced workflows, you can disable the auto-promotion of deployments and [manually control promotion](/docs/deployments/promoting-a-deployment).

## Custom Environments

> **🔒 Permissions Required**: Custom environments

Custom environments are useful for longer-running pre-production environments like `staging`, `QA`, or any other specialized workflow you require.

Team owners and project admins can create, update, or remove custom environments.

### Creating a custom environment

#### \['Dashboard'

1. Go to your **Project Settings** in the Vercel Dashboard
2. Under **Environments**, click **Create Environment**
3. Provide a name (e.g., `staging`), and optionally:
   - **Branch Tracking** to automatically deploy whenever a matching branch is pushed
   - **Attach a Domain** to give a persistent URL to your environment
   - **Import variables** from another environment to seed this environment with existing environment variables

#### 'cURL'

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request POST \
  --url https://api.vercel.com/v9/projects/<project-id-or-name>/custom-environments \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "slug": "<environment_name_slug>",
    "description": "<environment_description>",
  }'
```

#### 'SDK']

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```ts filename="createCustomEnvironment"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.environment.createCustomEnvironment({
    idOrName: '<project-id-or-name>',
    requestBody: {
      slug: '<environment_name_slug>',
      description: '<environment_description>',
    },
  });
  // Handle the result
  console.log(result);
}

run();
```

### Using custom environments via the CLI

You can deploy, pull, and manage environment variables to your custom environment with the CLI:

```bash
# Deploy to a custom environment named "staging":
vercel deploy --target=staging

# Pull environment variables from "staging":
vercel pull --environment=staging

# Add environment variables to "staging":
vercel env add MY_KEY staging
```

### Pricing and limits

Custom environments are available at no additional cost on the Pro and Enterprise plans. The number of custom environments you can create is based on your plan:

- **Pro**: 1 custom environment per project
- **Enterprise**: 12 custom environments per project

## More resources

- [Learn about the different environments on Vercel](https://www.youtube.com/watch?v=nZrAgov_-D8)


---

[View full sitemap](/docs/sitemap)
