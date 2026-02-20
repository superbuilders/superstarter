---
title: Quickstart
product: vercel
url: /docs/vercel-sandbox/quickstart
type: conceptual
prerequisites:
  - /docs/vercel-sandbox
related:
  - /docs/cli
  - /docs/vercel-sandbox/concepts/authentication
  - /docs/vercel-sandbox/working-with-sandbox
  - /docs/vercel-sandbox/sdk-reference
  - /docs/vercel-sandbox/cli-reference
summary: Learn how to run your first code in a Vercel Sandbox.
---

# Quickstart

This guide shows you how to run your first code in a Vercel Sandbox.

## Prerequisites

- A [Vercel account](https://vercel.com/signup)
- [Vercel CLI](/docs/cli) installed (`npm i -g vercel`)
- Node.js 22+ or Python 3.10+

- ### Set up your environment
  Create a new directory and connect it to a Vercel project. This is the recommended way to authenticate because the project handles secure [OIDC token authentication](/docs/vercel-sandbox/concepts/authentication) for you.

  When prompted, select **Create a new project**. The project doesn't need any code deployed. It needs to exist so Vercel can generate authentication tokens for you.

  Once linked, pull your environment variables to get an authentication token:
  ```bash filename="Terminal"
  vercel env pull
  ```
  This creates a `.env.local` file containing a token that the SDK uses to authenticate your requests. When you deploy to Vercel, token management happens automatically.

- ### Install the SDK

- ### Write your code
  Create a file that creates a sandbox and runs a command:

- ### Run it
  You should see: `Hello from Vercel Sandbox!`

  Sandboxes automatically stop after 5 minutes. To adjust this or manage running sandboxes, see [Working with Sandbox](/docs/vercel-sandbox/working-with-sandbox).

## What you just did

1. **Set up authentication**: Connected to a Vercel project and pulled credentials to enable sandbox creation.
2. **Created a sandbox**: Spun up an isolated Linux microVM.
3. **Ran a command**: Executed code inside the secure environment.

## Next steps

- [SDK Reference](/docs/vercel-sandbox/sdk-reference): Full API documentation for TypeScript and Python.
- [CLI Reference](/docs/vercel-sandbox/cli-reference): Manage sandboxes from the terminal.
- [Snapshots](/docs/vercel-sandbox/concepts/snapshots): Save sandbox state to skip setup on future runs.
- [Examples](/docs/vercel-sandbox/working-with-sandbox#examples): See real-world use cases.


---

[View full sitemap](/docs/sitemap)
