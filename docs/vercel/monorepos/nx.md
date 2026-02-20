---
title: Deploying Nx to Vercel
product: vercel
url: /docs/monorepos/nx
type: tutorial
prerequisites:
  - /docs/monorepos
related:
  - /docs/projects/overview
  - /docs/getting-started-with-vercel/import
  - /docs/deployments/configure-a-build
  - /docs/project-configuration/project-settings
  - /docs/environment-variables
summary: Nx is an extensible build system with support for monorepos, integrations, and Remote Caching on Vercel. Learn how to deploy Nx to Vercel with this...
---

# Deploying Nx to Vercel

Nx is an extensible build system with support for monorepos, integrations, and Remote Caching on Vercel.

Read the [Intro to Nx](https://nx.dev/getting-started/intro) docs to learn about the benefits of using Nx to manage your monorepos.

## Deploy Nx to Vercel

- ### Ensure your Nx project is configured correctly
  If you haven't already connected your monorepo to Nx, you can follow the [Getting Started](https://nx.dev/recipe/adding-to-monorepo) on the Nx docs to do so.

  To ensure the best experience using Nx with Vercel, the following versions and settings are recommended:
  - Use `nx` version `14.6.2` or later
  - Use `nx-cloud` version `14.6.0` or later
  There are also additional settings if you are [using Remote Caching](/docs/monorepos/nx#setup-remote-caching-for-nx-on-vercel)

  > **💡 Note:** All Nx starters and examples are preconfigured with these settings.

- ### Import your project
  [Create a new Project](/docs/projects/overview#creating-a-project) on the Vercel dashboard and [import](/docs/getting-started-with-vercel/import) your monorepo project.

  Vercel handles all aspects of configuring your monorepo, including setting [build commands](/docs/deployments/configure-a-build#build-command), the [Root Directory](/docs/deployments/configure-a-build#root-directory), the correct directory for npm workspaces, and the [ignored build step](/docs/project-configuration/project-settings#ignored-build-step).

- ### Next steps
  Your Nx monorepo is now configured and ready to be used with Vercel!

  You can now [setup Remote Caching for Nx on Vercel](#setup-remote-caching-for-nx-on-vercel) or configure additional deployment options, such as [environment variables](/docs/environment-variables).

## Using `nx-ignore`

`nx-ignore` provides a way for you to tell Vercel if a build should continue or not. For more details and information on how to use `nx-ignore`, see the [documentation](https://github.com/nrwl/nx-labs/tree/main/packages/nx-ignore).

## Setup Remote Caching for Nx on Vercel

Before using remote caching with Nx, do one of the following:

- Ensure the `NX_CACHE_DIRECTORY=/tmp/nx-cache` is set

**or**

- Set the `cacheDirectory` option to `/tmp/nx-cache` at `tasksRunnerOptions.{runner}.options` in your `nx.json`. For example:

```json filename="nx.json"
"tasksRunnerOptions": {
  "default": {
    "runner": "nx/tasks-runners/default",
    "options": {
      "cacheDirectory": "/tmp/nx-cache"
    }
  }
}
```

To configure Remote Caching for your Nx project on Vercel, use the [`@vercel/remote-nx`](https://github.com/vercel/remote-cache/tree/main/packages/remote-nx) plugin.

- ### Install the `@vercel/remote-nx` plugin
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i @vercel/remote-nx
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i @vercel/remote-nx
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i @vercel/remote-nx
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i @vercel/remote-nx
      ```
    </Code>
  </CodeBlock>

- ### Configure the `@vercel/remote-nx` runner
  In your `nx.json` file you will find a `tasksRunnerOptions` field. Update this field so that it's using the installed `@vercel/remote-nx`:
  ```json filename="nx.json"
  {
    "tasksRunnerOptions": {
      "default": {
        "runner": "@vercel/remote-nx",
        "options": {
          "cacheableOperations": ["build", "test", "lint", "e2e"],
          "token": "<token>",
          "teamId": "<teamId>"
        }
      }
    }
  }
  ```
  You can specify your `token` and `teamId` in your nx.json or set them as environment variables.

  | Parameter                                                     | Description                                           | Environment Variable / .env    | `nx.json` |
  | ------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------ | --------- |
  | Vercel Access Token                                           | Vercel access token with access to the provided team  | `NX_VERCEL_REMOTE_CACHE_TOKEN` | `token`   |
  | Vercel [Team ID](/docs/accounts#find-your-team-id) (optional) | The Vercel Team ID that should share the Remote Cache | `NX_VERCEL_REMOTE_CACHE_TEAM`  | `teamId`  |
  > **💡 Note:** When deploying on Vercel, these variables will be automatically set for you.

- ### Clear cache and run
  Clear your local cache and rebuild your project.
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>


---

[View full sitemap](/docs/sitemap)
