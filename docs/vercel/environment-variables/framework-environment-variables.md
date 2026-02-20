---
title: Framework environment variables
product: vercel
url: /docs/environment-variables/framework-environment-variables
type: reference
prerequisites:
  - /docs/environment-variables
related:
  - /docs/deployments/configure-a-build
  - /docs/environment-variables
summary: "Framework environment variables are automatically populated by the Vercel, based on your project's framework."
---

# Framework environment variables

Frameworks typically use a prefix in order to expose environment variables to the browser.

The following prefixed environment variables will be available during the **build step**, based on the project's selected [framework preset](/docs/deployments/configure-a-build#framework-preset).

## Using prefixed framework environment variables locally

Many frontend frameworks require prefixes on environment variable names to make them available to the client, such as `NEXT_PUBLIC_` for Next.js or `PUBLIC_` for SvelteKit. Vercel adds these prefixes automatically for your production and preview deployments, **but not for your local development environment**.

**Framework environment variables are not prefixed when pulled into your local development environment with `vercel env pull`**. For example, `VERCEL_ENV` will not be prefixed to `NEXT_PUBLIC_VERCEL_ENV`.

To use framework-prefixed environment variables locally:

1. [Define them in your project settings](/docs/environment-variables#creating-environment-variables) with the appropriate prefix
2. Scope them to `Development`
3. Pull them into your local environment with Vercel CLI using the `vercel env pull` command

## Framework environment variables

#### Next.js

### `NEXT_PUBLIC_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
NEXT_PUBLIC_VERCEL_ENV=production
```

### `NEXT_PUBLIC_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
NEXT_PUBLIC_VERCEL_TARGET_ENV=production
```

### `NEXT_PUBLIC_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_URL=my-site.vercel.app
```

### `NEXT_PUBLIC_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `NEXT_PUBLIC_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_PROVIDER=github
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG=my-site
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER=acme
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_ID=117716146
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Nuxt

### `NUXT_ENV_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
NUXT_ENV_VERCEL_ENV=production
```

### `NUXT_ENV_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
NUXT_ENV_VERCEL_TARGET_ENV=production
```

### `NUXT_ENV_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
NUXT_ENV_VERCEL_URL=my-site.vercel.app
```

### `NUXT_ENV_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
NUXT_ENV_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `NUXT_ENV_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
NUXT_ENV_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `NUXT_ENV_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
NUXT_ENV_VERCEL_GIT_PROVIDER=github
```

### `NUXT_ENV_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
NUXT_ENV_VERCEL_GIT_REPO_SLUG=my-site
```

### `NUXT_ENV_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
NUXT_ENV_VERCEL_GIT_REPO_OWNER=acme
```

### `NUXT_ENV_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
NUXT_ENV_VERCEL_GIT_REPO_ID=117716146
```

### `NUXT_ENV_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
NUXT_ENV_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `NUXT_ENV_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
NUXT_ENV_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `NUXT_ENV_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
NUXT_ENV_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `NUXT_ENV_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
NUXT_ENV_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `NUXT_ENV_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
NUXT_ENV_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `NUXT_ENV_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
NUXT_ENV_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Create React App

### `REACT_APP_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
REACT_APP_VERCEL_ENV=production
```

### `REACT_APP_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
REACT_APP_VERCEL_TARGET_ENV=production
```

### `REACT_APP_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
REACT_APP_VERCEL_URL=my-site.vercel.app
```

### `REACT_APP_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
REACT_APP_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `REACT_APP_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
REACT_APP_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `REACT_APP_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
REACT_APP_VERCEL_GIT_PROVIDER=github
```

### `REACT_APP_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
REACT_APP_VERCEL_GIT_REPO_SLUG=my-site
```

### `REACT_APP_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
REACT_APP_VERCEL_GIT_REPO_OWNER=acme
```

### `REACT_APP_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
REACT_APP_VERCEL_GIT_REPO_ID=117716146
```

### `REACT_APP_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
REACT_APP_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `REACT_APP_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
REACT_APP_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `REACT_APP_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
REACT_APP_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `REACT_APP_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
REACT_APP_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `REACT_APP_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
REACT_APP_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `REACT_APP_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
REACT_APP_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Gatsby.js

### `GATSBY_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
GATSBY_VERCEL_ENV=production
```

### `GATSBY_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
GATSBY_VERCEL_TARGET_ENV=production
```

### `GATSBY_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
GATSBY_VERCEL_URL=my-site.vercel.app
```

### `GATSBY_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
GATSBY_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `GATSBY_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
GATSBY_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `GATSBY_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
GATSBY_VERCEL_GIT_PROVIDER=github
```

### `GATSBY_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
GATSBY_VERCEL_GIT_REPO_SLUG=my-site
```

### `GATSBY_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
GATSBY_VERCEL_GIT_REPO_OWNER=acme
```

### `GATSBY_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
GATSBY_VERCEL_GIT_REPO_ID=117716146
```

### `GATSBY_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
GATSBY_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `GATSBY_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
GATSBY_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `GATSBY_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
GATSBY_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `GATSBY_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
GATSBY_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `GATSBY_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
GATSBY_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `GATSBY_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
GATSBY_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### SolidStart (v0)

### `VITE_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VITE_VERCEL_ENV=production
```

### `VITE_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VITE_VERCEL_TARGET_ENV=production
```

### `VITE_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_URL=my-site.vercel.app
```

### `VITE_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VITE_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VITE_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VITE_VERCEL_GIT_PROVIDER=github
```

### `VITE_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_SLUG=my-site
```

### `VITE_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_OWNER=acme
```

### `VITE_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_ID=117716146
```

### `VITE_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VITE_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VITE_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VITE_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VITE_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VITE_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### SvelteKit (v0)

### `VITE_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VITE_VERCEL_ENV=production
```

### `VITE_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VITE_VERCEL_TARGET_ENV=production
```

### `VITE_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_URL=my-site.vercel.app
```

### `VITE_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VITE_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VITE_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VITE_VERCEL_GIT_PROVIDER=github
```

### `VITE_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_SLUG=my-site
```

### `VITE_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_OWNER=acme
```

### `VITE_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_ID=117716146
```

### `VITE_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VITE_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VITE_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VITE_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VITE_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VITE_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Blitz.js (Legacy)

### `NEXT_PUBLIC_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
NEXT_PUBLIC_VERCEL_ENV=production
```

### `NEXT_PUBLIC_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
NEXT_PUBLIC_VERCEL_TARGET_ENV=production
```

### `NEXT_PUBLIC_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_URL=my-site.vercel.app
```

### `NEXT_PUBLIC_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `NEXT_PUBLIC_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_PROVIDER=github
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG=my-site
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER=acme
```

### `NEXT_PUBLIC_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
NEXT_PUBLIC_VERCEL_GIT_REPO_ID=117716146
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Astro

### `PUBLIC_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
PUBLIC_VERCEL_ENV=production
```

### `PUBLIC_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
PUBLIC_VERCEL_TARGET_ENV=production
```

### `PUBLIC_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_URL=my-site.vercel.app
```

### `PUBLIC_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `PUBLIC_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_PROVIDER=github
```

### `PUBLIC_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_SLUG=my-site
```

### `PUBLIC_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_OWNER=acme
```

### `PUBLIC_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_ID=117716146
```

### `PUBLIC_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `PUBLIC_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `PUBLIC_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
PUBLIC_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `PUBLIC_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
PUBLIC_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### SolidStart (v1)

### `VITE_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VITE_VERCEL_ENV=production
```

### `VITE_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VITE_VERCEL_TARGET_ENV=production
```

### `VITE_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_URL=my-site.vercel.app
```

### `VITE_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VITE_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VITE_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VITE_VERCEL_GIT_PROVIDER=github
```

### `VITE_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_SLUG=my-site
```

### `VITE_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_OWNER=acme
```

### `VITE_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_ID=117716146
```

### `VITE_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VITE_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VITE_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VITE_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VITE_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VITE_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Vue.js

### `VUE_APP_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VUE_APP_VERCEL_ENV=production
```

### `VUE_APP_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VUE_APP_VERCEL_TARGET_ENV=production
```

### `VUE_APP_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VUE_APP_VERCEL_URL=my-site.vercel.app
```

### `VUE_APP_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VUE_APP_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VUE_APP_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VUE_APP_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VUE_APP_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VUE_APP_VERCEL_GIT_PROVIDER=github
```

### `VUE_APP_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VUE_APP_VERCEL_GIT_REPO_SLUG=my-site
```

### `VUE_APP_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VUE_APP_VERCEL_GIT_REPO_OWNER=acme
```

### `VUE_APP_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VUE_APP_VERCEL_GIT_REPO_ID=117716146
```

### `VUE_APP_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VUE_APP_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VUE_APP_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VUE_APP_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VUE_APP_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VUE_APP_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VUE_APP_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VUE_APP_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VUE_APP_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VUE_APP_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VUE_APP_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VUE_APP_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### RedwoodJS

### `REDWOOD_ENV_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
REDWOOD_ENV_VERCEL_ENV=production
```

### `REDWOOD_ENV_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
REDWOOD_ENV_VERCEL_TARGET_ENV=production
```

### `REDWOOD_ENV_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
REDWOOD_ENV_VERCEL_URL=my-site.vercel.app
```

### `REDWOOD_ENV_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
REDWOOD_ENV_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `REDWOOD_ENV_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
REDWOOD_ENV_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `REDWOOD_ENV_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
REDWOOD_ENV_VERCEL_GIT_PROVIDER=github
```

### `REDWOOD_ENV_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
REDWOOD_ENV_VERCEL_GIT_REPO_SLUG=my-site
```

### `REDWOOD_ENV_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
REDWOOD_ENV_VERCEL_GIT_REPO_OWNER=acme
```

### `REDWOOD_ENV_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
REDWOOD_ENV_VERCEL_GIT_REPO_ID=117716146
```

### `REDWOOD_ENV_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
REDWOOD_ENV_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `REDWOOD_ENV_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
REDWOOD_ENV_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `REDWOOD_ENV_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
REDWOOD_ENV_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `REDWOOD_ENV_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
REDWOOD_ENV_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `REDWOOD_ENV_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
REDWOOD_ENV_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `REDWOOD_ENV_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
REDWOOD_ENV_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Hydrogen (v1)

### `PUBLIC_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
PUBLIC_VERCEL_ENV=production
```

### `PUBLIC_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
PUBLIC_VERCEL_TARGET_ENV=production
```

### `PUBLIC_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_URL=my-site.vercel.app
```

### `PUBLIC_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `PUBLIC_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
PUBLIC_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `PUBLIC_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_PROVIDER=github
```

### `PUBLIC_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_SLUG=my-site
```

### `PUBLIC_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_OWNER=acme
```

### `PUBLIC_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
PUBLIC_VERCEL_GIT_REPO_ID=117716146
```

### `PUBLIC_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `PUBLIC_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `PUBLIC_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
PUBLIC_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `PUBLIC_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
PUBLIC_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Vite

### `VITE_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
VITE_VERCEL_ENV=production
```

### `VITE_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
VITE_VERCEL_TARGET_ENV=production
```

### `VITE_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_URL=my-site.vercel.app
```

### `VITE_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `VITE_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
VITE_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `VITE_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
VITE_VERCEL_GIT_PROVIDER=github
```

### `VITE_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_SLUG=my-site
```

### `VITE_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_OWNER=acme
```

### `VITE_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
VITE_VERCEL_GIT_REPO_ID=117716146
```

### `VITE_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `VITE_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
VITE_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `VITE_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
VITE_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
VITE_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `VITE_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
VITE_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Sanity (v3)

### `SANITY_STUDIO_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
SANITY_STUDIO_VERCEL_ENV=production
```

### `SANITY_STUDIO_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
SANITY_STUDIO_VERCEL_TARGET_ENV=production
```

### `SANITY_STUDIO_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_URL=my-site.vercel.app
```

### `SANITY_STUDIO_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `SANITY_STUDIO_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `SANITY_STUDIO_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_PROVIDER=github
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_SLUG=my-site
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_OWNER=acme
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_ID=117716146
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID=23
```

#### Sanity

### `SANITY_STUDIO_VERCEL_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The environment that the app is deployed and running on. The value can be either production, preview, or development.

```bash
SANITY_STUDIO_VERCEL_ENV=production
```

### `SANITY_STUDIO_VERCEL_TARGET_ENV`

**Available at:&#x20;**&#x42;oth build and runtime

The system or custom environment that the app is deployed and running on. The value can be either production, preview, development, or the name of a custom environment.

```bash
SANITY_STUDIO_VERCEL_TARGET_ENV=production
```

### `SANITY_STUDIO_VERCEL_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated deployment URL. Example: \*.vercel.app. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_URL=my-site.vercel.app
```

### `SANITY_STUDIO_VERCEL_BRANCH_URL`

**Available at:&#x20;**&#x42;oth build and runtime

The domain name of the generated Git branch URL. Example: \*-git-\*.vercel.app. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_BRANCH_URL=my-site-git-improve-about-page.vercel.app
```

### `SANITY_STUDIO_VERCEL_PROJECT_PRODUCTION_URL`

**Available at:&#x20;**&#x42;oth build and runtime

A production domain name of the project. We select the shortest production custom domain, or vercel.app domain if no custom domain is available. Note, that this is always set, even in preview deployments. This is useful to reliably generate links that point to production such as OG-image URLs. The value does not include the protocol scheme https://.

```bash
SANITY_STUDIO_VERCEL_PROJECT_PRODUCTION_URL=my-site.com
```

### `SANITY_STUDIO_VERCEL_GIT_PROVIDER`

**Available at:&#x20;**&#x42;oth build and runtime

The Git Provider the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_PROVIDER=github
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_SLUG`

**Available at:&#x20;**&#x42;oth build and runtime

The origin repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_SLUG=my-site
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_OWNER`

**Available at:&#x20;**&#x42;oth build and runtime

The account that owns the repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_OWNER=acme
```

### `SANITY_STUDIO_VERCEL_GIT_REPO_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The ID of the repository the deployment is triggered from.

```bash
SANITY_STUDIO_VERCEL_GIT_REPO_ID=117716146
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_REF`

**Available at:&#x20;**&#x42;oth build and runtime

The git branch of the commit the deployment was triggered by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_REF=improve-about-page
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_SHA`

**Available at:&#x20;**&#x42;oth build and runtime

The git SHA of the commit the deployment was triggered by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_SHA=fa1eade47b73733d6312d5abfad33ce9e4068081
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_MESSAGE`

**Available at:&#x20;**&#x42;oth build and runtime

The message attached to the commit the deployment was triggered by. The message is truncated if it exceeds 2048 bytes.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_MESSAGE=Update about page
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_LOGIN`

**Available at:&#x20;**&#x42;oth build and runtime

The username attached to the author of the commit that the project was deployed by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_LOGIN=johndoe
```

### `SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_NAME`

**Available at:&#x20;**&#x42;oth build and runtime

The name attached to the author of the commit that the project was deployed by.

```bash
SANITY_STUDIO_VERCEL_GIT_COMMIT_AUTHOR_NAME=John Doe
```

### `SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID`

**Available at:&#x20;**&#x42;oth build and runtime

The pull request id the deployment was triggered by. If a deployment is created on a branch before a pull request is made, this value will be an empty string.

```bash
SANITY_STUDIO_VERCEL_GIT_PULL_REQUEST_ID=23
```


---

[View full sitemap](/docs/sitemap)
