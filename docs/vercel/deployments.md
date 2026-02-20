---
title: Deploying to Vercel
product: vercel
url: /docs/deployments
type: conceptual
prerequisites:
  []
related:
  - /docs/deployments/environments
  - /docs/git
  - /docs/git/vercel-for-github
  - /docs/git/vercel-for-gitlab
  - /docs/git/vercel-for-bitbucket
summary: Learn how to create and manage deployments on Vercel.
---

# Deploying to Vercel

A **deployment** on Vercel is the result of a successful build of your project. Each time you deploy, Vercel generates a unique URL so you and your team can preview changes in a live [environment](/docs/deployments/environments).

Vercel supports multiple ways to create a deployment:

- [Git](#git)
- [Vercel CLI](#vercel-cli)
- [Deploy Hooks](#deploy-hooks)
- [Vercel REST API](#vercel-rest-api)

## Deployment Methods

### Git

The most common way to create a deployment is by pushing code to a connected [Git repository](/docs/git). When you [import a Git repository to Vercel](/docs/git#deploying-a-git-repository), each commit or pull request (on supported Git providers) automatically triggers a new deployment.

Vercel supports the following providers:

- [GitHub](/docs/git/vercel-for-github)
- [GitLab](/docs/git/vercel-for-gitlab)
- [Bitbucket](/docs/git/vercel-for-bitbucket)
- [Azure DevOps](/docs/git/vercel-for-azure-pipelines)

You can also [create deployments from a Git reference](/docs/git#creating-a-deployment-from-a-git-reference) using the Vercel Dashboard if you need to deploy specific commits or branches manually.

### Vercel CLI

You can deploy your Projects directly from the command line using [Vercel CLI](/docs/cli). This method works whether your project is connected to Git or not.

1. **Install Vercel CLI**:

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

2. **Initial Deployment**:

In your project's root directory, run:

```bash
vercel --prod
```

This links your local directory to your Vercel Project and creates a [Production Deployment](/docs/deployments/environments#production-environment). A `.vercel` directory is added to store Project and Organization IDs.

Vercel CLI can also integrate with custom CI/CD workflows or third-party pipelines. Learn more about the different [environments on Vercel](/docs/deployments/environments).

### Deploy Hooks

[Deploy Hooks](/docs/deploy-hooks) let you trigger deployments with a unique URL. You must have a connected Git repository to use this feature, but the deployment doesn't require a new commit.

1. From your Project settings, create a Deploy Hook
2. Vercel generates a unique URL for each Project
3. Make an HTTP `GET` or `POST` request to this URL to trigger the deployment

Refer to the [Deploy Hooks documentation](/docs/deploy-hooks) for more information.

### Vercel REST API

The [Vercel REST API](/docs/rest-api) lets you create deployments by making an HTTP `POST` request to the deployment endpoint. In this workflow:

1. Generate a SHA for each file you want to deploy
2. Upload those files to Vercel
3. Send a request to create a new deployment with those file references

This method is especially useful for custom workflows, multi-tenant applications, or integrating with third-party services not officially supported by Vercel. For more details, see the [API reference](/docs/rest-api/reference/endpoints/deployments/create-a-new-deployment) and [How do I generate an SHA for uploading a file](/kb/guide/how-do-i-generate-an-sha-for-uploading-a-file-to-the-vercel-api).

## Accessing Deployments

Vercel provides three default environments: **Local**, **Preview**, and **Production**.

1. **Local Development**: developing and testing code changes on your local machine
2. **Preview**: deploying for further testing, QA, or collaboration without impacting your live site
3. **Production**: deploying the final changes to your user-facing site with the production domain

Learn more about [environments](/docs/deployments/environments).

## Using the Dashboard

Vercel’s dashboard provides a centralized way to view, manage, and gain insights into your deployments.

### Resources Tab and Deployment Summary

When you select a deployment from your **Project → Deployments** page, you can select the **Resources** tab to view and search:

- **Middleware**: Any configured [matchers](/docs/routing-middleware/api#match-paths-based-on-custom-matcher-config).
- **Static Assets**: Files (HTML, CSS, JS) and their sizes.
- **Functions**: The type, runtime, size, and regions.

You can use the three dot (…) menu for a given function to jump to that function in **Logs**, **Analytics**, **Speed Insights**, or the **Observability** tab.

![Image](`/docs-assets/static/docs/concepts/deployments/deployment-resources-page-light.png`)

You can also see a summary of these resources by expanding the **Deployment Summary** section on a **Deployment Details** page. To visit the **Deployment Details** page for a deployment, select it from your **Project → Deployments** page.

![Image](`/docs-assets/static/docs/concepts/deployments/deploy-outputs-light.png`)

You’ll also see your build time, detected framework, and any relevant logs or errors.

### Project Overview

On your **Project Overview** page, you can see the latest production deployment, including the generated URL and commit details, and deployment logs for debugging.

### Managing Deployments

From the **Deployments** tab, you can:

- **Redeploy**: Re-run the build for a specific commit or configuration.
- **Inspect**: View logs and build outputs.
- **Assign a Custom Domain**: Point custom domains to any deployment.
- **Promote to Production**: Convert a preview deployment to production (if needed).

For more information on interacting with your deployments, see [Managing Deployments](/docs/deployments/managing-deployments).

## CLI workflows

For step-by-step workflows using the Vercel CLI to manage deployments, see:

- [Rolling back a production deployment](/docs/deployments/rollback-production-deployment)
- [Deploying a project from the CLI](/docs/projects/deploy-from-cli)


---

[View full sitemap](/docs/sitemap)
