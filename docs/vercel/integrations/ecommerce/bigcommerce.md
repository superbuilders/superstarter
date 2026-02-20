---
title: Vercel and BigCommerce Integration
product: vercel
url: /docs/integrations/ecommerce/bigcommerce
type: tutorial
prerequisites:
  - /docs/integrations/ecommerce
  - /docs/integrations
related:
  - /docs/cli
  - /docs/monorepos/remote-caching
  - /docs/analytics
  - /docs/speed-insights
summary: Integrate Vercel with BigCommerce to deploy your headless storefront.
---

# Vercel and BigCommerce Integration

[BigCommerce](https://www.bigcommerce.com/) is an ecommerce platform for building and managing online storefronts. This guide explains how to deploy a highly performant, headless storefront using Next.js on Vercel.

## Overview

This guide uses [Catalyst](/templates/next.js/catalyst-by-bigcommerce) by BigCommerce to connect your BigCommerce store to a Vercel deployment. Catalyst was developed by BigCommerce in collaboration with Vercel.

> **💡 Note:** You can use this guide as a reference for creating a custom headless
> BigCommerce storefront, even if you're not using Catalyst by BigCommerce.

## Getting Started

You can either deploy the template below to **Vercel** or use the following steps to fork and clone it to your machine and deploy it locally.

## Configure BigCommerce

- ### Set up a BigCommerce account and storefront
  You can use an existing BigCommerce account and storefront, or get started with one of the options below:
  - [Start a free trial](https://www.bigcommerce.com/start-your-trial/)
  - [Create a developer sandbox](https://start.bigcommerce.com/developer-sandbox/)

- ### Fork and clone the Catalyst repository
  1. [Fork the Catalyst repository on GitHub](https://github.com/bigcommerce/catalyst/fork). You can name your fork as you prefer. This guide will refer to it as `<YOUR_FORK_NAME>`.
  2. Clone your forked repository to your local machine using the following command:
  ```bash filename="Terminal"
  git clone https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_FORK_NAME>.git
  cd <YOUR_FORK_NAME>
  ```
  > **💡 Note:** Replace `<YOUR_GITHUB_USERNAME>` with your GitHub username and `<YOUR_FORK_NAME>` with the name you chose for your fork.

- ### Add the upstream Catalyst repository
  To automatically sync updates, add the BigCommerce Catalyst repository as a remote named "upstream" using the following command:
  ```bash filename="Terminal"
  git remote add upstream git@github.com:bigcommerce/catalyst.git
  ```
  Verify the local repository is set up with the remote repositories using the following command:
  ```bash filename="Terminal"
  git remote -v
  ```
  The output should look similar to this:
  ```bash filename="Terminal"
  origin    git@github.com:<YOUR_GITHUB_USERNAME><YOUR_FORK_NAME>.git (fetch)
  origin    git@github.com:<YOUR_GITHUB_USERNAME>/<YOUR_FORK_NAME>.git (push)
  upstream  git@github.com:bigcommerce/catalyst.git (fetch)
  upstream  git@github.com:bigcommerce/catalyst.git (push)
  ```
  Learn more about [syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork).

- ### Enable Corepack and install dependencies
  Catalyst requires pnpm as the Node.js package manager. [Corepack](https://github.com/nodejs/corepack#readme) is a tool that helps manage package manager versions. Run the following command to enable Corepack, activate pnpm, and install dependencies:
  ```bash filename="Terminal"
  corepack enable pnpm && pnpm install
  ```

- ### Run the Catalyst CLI command
  The Catalyst CLI (Command Line Interface) is a tool that helps set up and configure your Catalyst project. When run, it will:
  1. Guide you through logging into your BigCommerce store
  2. Help you create a new or select an existing Catalyst storefront Channel
  3. Automatically create an `.env.local` file in your project root
  To start this process, run the following command:
  ```bash filename="Terminal"
  pnpm create @bigcommerce/catalyst@latest init
  ```
  Follow the CLI prompts to complete the setup.

- ### Start the development server
  After setting up your Catalyst project and configuring the environment variables, you can start the development server. From your project root, run the following command:
  ```bash filename="Terminal"
  pnpm dev
  ```
  Your local storefront should now be accessible at `http://localhost:3000`.

## Deploy to Vercel

Now that your Catalyst storefront is configured, let's deploy your project to Vercel.

- ### Create a new Vercel project
  Visit https://vercel.com/new to create a new project. You may be prompted to sign in or create a new account.
  1. Find your forked repository in the list.
  2. Click the **Import** button next to your repository.
  3. In the **Root Directory** section, click the **Edit** button.
  4. Select the `core` directory from file tree. Click **Continue** to confirm your selection.
  5. Verify that the Framework preset is set to Next.js. If it isn't, select it from the dropdown menu.
  6. Open the **Environment Variables** dropdown and paste the contents of your `.env.local` into the form.
  7. Click the **Deploy** button to start the deployment process.

- ### Link your Vercel project
  To ensure seamless management of deployments and project settings you can link your local development environment with your Vercel project.

  If you haven't already, install the Vercel CLI globally with the following command:
  ```bash filename="Terminal"
  pnpm i -g vercel
  ```
  This command will prompt you to log in to your Vercel account and link your local project to your existing Vercel project:
  ```bash filename="Terminal"
  vercel link
  ```
  Learn more about the [Vercel CLI](/docs/cli).

## Enable Vercel Remote Cache

Vercel Remote Cache optimizes your build process by sharing build outputs across your Vercel team, eliminating redundant tasks. Follow these steps to set up Remote Cache:

- ### Authenticate with Turborepo
  Run the following command to authenticate the Turborepo CLI with your Vercel account:
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
  For SSO-enabled Vercel teams, include your team slug:
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

- ### Link your Remote Cache
  To link your project to a team scope and specify who the cache should be shared with, run the following command:
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
  > **⚠️ Warning:** If you run these commands but the owner has [disabled Remote
  > Caching](#enabling-and-disabling-remote-caching-for-your-team) for your team,
  > Turborepo will present you with an error message: "Please contact your account
  > owner to enable Remote Caching on Vercel."

- ### Add Remote Cache Signature Key
  To securely sign artifacts before uploading them to the Remote Cache, use the following command to add the `TURBO_REMOTE_CACHE_SIGNATURE_KEY` environment variable to your Vercel project:
  ```bash filename="Terminal"
  vercel env add TURBO_REMOTE_CACHE_SIGNATURE_KEY
  ```
  When prompted, add the environment variable to Production, Preview, and Development environments. Set the environment variable to a secure random value by running `openssl rand -hex 32` in your Terminal.

  Once finished, pull the new environment variable into your local project with the following command:
  ```bash filename="Terminal"
  vercel env pull
  ```
  Learn more about [Vercel Remote Cache](/docs/monorepos/remote-caching#vercel-remote-cache).

## Enable Web Analytics and Speed Insights

The Catalyst monorepo comes pre-configured with Vercel Web Analytics and Speed Insights, offering you powerful tools to understand and optimize your storefront's performance. To learn more about how they can benefit your ecommerce project, visit our documentation on [Web Analytics](/docs/analytics) and [Speed Insights](/docs/speed-insights).

Web Analytics provides real-time insights into your site's traffic and user behavior,
helping you make data-driven decisions to improve your storefront's performance:

Speed Insights offers detailed performance metrics and suggestions to optimize your
site's loading speed and overall user experience:

For more advanced configurations or to learn more about BigCommerce Catalyst, refer to the [BigCommerce Catalyst documentation](https://catalyst.dev/docs).


---

[View full sitemap](/docs/sitemap)
