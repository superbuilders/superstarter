---
title: Deploying Bitbucket Projects with Vercel
product: vercel
url: /docs/git/vercel-for-bitbucket
type: conceptual
prerequisites:
  - /docs/git
related:
  - /docs/deployments/environments
  - /docs/domains/add-a-domain
  - /docs/git
  - /docs/projects/overview
  - /docs/projects/custom-domains
summary: ​Vercel for Bitbucket automatically deploys your Bitbucket projects with Vercel, providing Preview Deployment URLs, and automatic Custom Domain...
---

# Deploying Bitbucket Projects with Vercel

Vercel for Bitbucket automatically deploys your Bitbucket projects with [Vercel](/), providing [Preview Deployment URLs](/docs/deployments/environments#preview-environment-pre-production#preview-urls), and automatic [Custom Domain](/docs/domains/add-a-domain) updates.

## Supported Bitbucket Products

- [Bitbucket Free](https://www.atlassian.com/software/bitbucket/pricing)
- [Bitbucket Standard](https://www.atlassian.com/software/bitbucket/pricing)
- [Bitbucket Premium](https://www.atlassian.com/software/bitbucket/pricing)
- [Bitbucket Data Center (Self-Hosted)](#using-bitbucket-pipelines)

## Deploying a Bitbucket Repository

The [Deploying a Git repository](/docs/git#deploying-a-git-repository) guide outlines how to create a new Vercel Project from a Bitbucket repository, and enable automatic deployments on every branch push.

## Changing the Bitbucket Repository of a Project

If you'd like to connect your Vercel Project to a different Bitbucket repository or disconnect it, you can do so from the [Git section](/docs/projects/overview#git) in the Project Settings.

### A Deployment for Each Push

Vercel for Bitbucket will **deploy each push by default**. This
includes pushes and pull requests made to branches. This allows those working
within the project to preview the changes made before they are pushed to
production.

With each new push, if Vercel is already building a previous commit on the same branch, the current build will complete and any commit pushed during this time will be queued. Once the first build completes, the most recent commit will begin deployment and the other queued builds will be cancelled. This ensures that you always have the latest changes deployed as quickly as possible.

### Updating the Production Domain

If [Custom Domains](/docs/projects/custom-domains) are set from a project domains dashboard, pushes and merges to the [Production Branch](/docs/git#production-branch) (commonly "main") will be made live to those domains with the latest deployment made with a push.

If you decide to revert a commit that has already been deployed to production, the previous [Production Deployment](/docs/deployments/environments#production-environment) from a commit will automatically be made available at the [Custom Domain](/docs/projects/custom-domains) instantly; providing you with instant rollbacks.

### Preview URLs for Each Pull Request

The latest push to any [pull request](https://www.atlassian.com/git/tutorials/making-a-pull-request) will automatically be made available at a unique preview URL based on the project name, branch, and team or username. These URLs will be given through a comment on each pull request.

*A preview URL created from a pull request.*

### System environment variables

You may want to use different workflows and APIs based on Git information. To support this, the following [System Environment Variables](/docs/environment-variables/system-environment-variables) are exposed to your Deployments:

### `VERCEL`

**Available at:&#x20;**&#x42;oth build and runtime

An indicator to show that system environment variables have been exposed to your project's Deployments.

```bash
VERCEL=1
```

### `CI`

**Available at:&#x20;**&#x42;uild time

An indicator that the code is running in a Continuous Integration environment.

```bash
CI=1
```

### `VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VERCEL_ENV=production
```

### `VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VERCEL_TARGET_ENV=production
```

### `VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VERCEL_URL=my-site.vercel.app
```

### `VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VERCEL_REGION`

**Available at:&#x20;**&#x52;untime

The ID of the Region where the app is running.

```bash
VERCEL_REGION=cdg1
```

### `VERCEL_DEPLOYMENT_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The unique identifier for the deployment, which can be used to implement Skew Protection.

```bash
VERCEL_DEPLOYMENT_ID=dpl_7Gw5ZMBpQA8h9GF832KGp7nwbuh3
```

### `VERCEL_PROJECT_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The unique identifier for the project.

```bash
VERCEL_PROJECT_ID=prj_Rej9WaMNRbffVm34MfDqa4daCEvZzzE
```

### `VERCEL_SKEW_PROTECTION_ENABLED`

**Available at:&#x20;**&#x42;oth build and runtime

When Skew Protection is enabled in Project Settings, this value is set to 1.

```bash
VERCEL_SKEW_PROTECTION_ENABLED=1
```

### `VERCEL_AUTOMATION_BYPASS_SECRET`

**Available at:&#x20;**&#x42;oth build and runtime

The Protection Bypass for Automation value, if the secret has been generated in the project's Deployment Protection settings.

```bash
VERCEL_AUTOMATION_BYPASS_SECRET=secret
```

### `VERCEL_OIDC_TOKEN`

**Available at:&#x20;**&#x42;uild time

When Secure Backend Access with OpenID Connect (OIDC) Federation is enabled in Project Settings, this value is set to a Vercel-issued OIDC token. At runtime, the token is set to thex-vercel-oidc-tokenheader on your functions' Request object. In local development, you can download the token using the CLI commandvercel env pull.

```bash
VERCEL_OIDC_TOKEN=secret
```

### `VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VERCEL_GIT_PROVIDER=github
```

### `VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VERCEL_GIT_REPO_SLUG=my-site
```

### `VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VERCEL_GIT_REPO_OWNER=acme
```

### `VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VERCEL_GIT_REPO_ID=117716146
```

### `VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VERCEL_GIT_PREVIOUS_SHA`

**Available at:&#x20;**&#x42;uild time

The git SHA of the last successful deployment for the project and branch.

```bash
VERCEL_GIT_PREVIOUS_SHA=fa1eade47b73733d6312d5abfad33ce9e4068080
```

### `VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VERCEL_GIT_PULL_REQUEST_ID=23
```

We require some permissions through our Vercel for Bitbucket integration. Below are listed the permissions required and a description for what they are used for.

### Repository Permissions

Repository permissions allow us to interact with repositories belonging to or associated with (if permitted) the connected account.

| Permission      | Read | Write | Description                                                                                                                  |
| --------------- | ---- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Web Hooks`     | Y    | N     | Allows us to react to various Bitbucket events.                                                                              |
| `Issues`        | Y    | Y     | Allows us to interact with Pull Requests as with the `Pull Requests` permissions due to Bitbucket requiring both for access. |
| `Repository`    | N    | N     | Allows us to access admin features of a Bitbucket repository.                                                                |
| `Pull requests` | Y    | Y     | Allows us create deployments for each Pull Request (PR) and comment on those PR's with status updates.                       |

#### Organization Permissions

Organization permissions allow us to offer an enhanced experience through information about the connected organization.

| Permission | Read | Write | Description                                             |
| ---------- | ---- | ----- | ------------------------------------------------------- |
| `Team`     | Y    | N     | Allows us to offer a better team onboarding experience. |

#### User Permissions

User permissions allow us to offer an enhanced experience through information about the connected user.

| Permission | Read | Write | Description                                               |
| ---------- | ---- | ----- | --------------------------------------------------------- |
| `Account`  | Y    | N     | Allows us to associate an email with a Bitbucket account. |

> **💡 Note:** We use the permissions above in order to provide you with the best possible
> deployment experience. If you have any questions or concerns about any of the
> permission scopes, please [contact Vercel Support](/help#issues).

To sign up on Vercel with a different Bitbucket account, sign out of your current Bitbucket account. Then, restart the Vercel [signup process](/signup).

## Missing Git repository

When importing or connecting a Bitbucket repository, we require that you have  access to the corresponding repository, so that we can configure a webhook and automatically deploy pushed commits.

If a repository is missing when you try to import or connect it, make sure that you have [Admin access configured for the repository](https://support.atlassian.com/bitbucket-cloud/docs/grant-repository-access-to-users-and-groups/).

## Silence comments

By default, comments from the Vercel bot will appear on your pull requests and commits. You can silence these comments in your project's settings:

1. From the Vercel [dashboard](/dashboard), select your project
2. From the **Settings** tab, select **Git**
3. Under **Connected Git Repository**, toggle the switches to your preference

> **💡 Note:** It is currently not possible to prevent comments for specific branches.

## Using Bitbucket Pipelines

You can use Bitbucket Pipelines to build and deploy your Vercel Application.

`vercel build` allows you to build your project inside Bitbucket Pipelines, without exposing your source code to Vercel. Then, `vercel deploy --prebuilt` skips the build step on Vercel and uploads the previously generated `.vercel/output` folder to Vercel from the Bitbucket Pipeline.

[Learn more about how to configure Bitbucket Pipelines and Vercel](/kb/guide/how-can-i-use-bitbucket-pipelines-with-vercel) for custom CI/CD workflows.


---

[View full sitemap](/docs/sitemap)
