---
title: vercel dev
product: vercel
url: /docs/cli/dev
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/functions
  - /docs/routing-middleware
  - /docs/deployments/configure-a-build
  - /docs/frameworks/nextjs
  - /docs/redirects
summary: Learn how to replicate the Vercel deployment environment locally and test your Vercel Project before deploying using the vercel dev CLI command.
---

# vercel dev

The `vercel dev` command is used to replicate the Vercel deployment environment locally, allowing you to test your [Vercel Functions](/docs/functions) and [Middleware](/docs/routing-middleware) without requiring you to deploy each time a change is made.

If the [Development Command](/docs/deployments/configure-a-build#development-command) is configured in your Project Settings, it will affect the behavior of `vercel dev` for everyone on that team.

> **💡 Note:** Before running `vercel dev`, make sure to install your
> dependencies by running `npm install`.

## When to Use This Command

If you're using a framework and your framework's [Development Command](/docs/deployments/configure-a-build#development-command) already provides all the features you need, we do not recommend using `vercel dev`.

For example, [Next.js](/docs/frameworks/nextjs)'s Development Command (`next dev`) provides native support for Functions, [redirects](/docs/redirects#configuration-redirects), rewrites, headers and more.

## Usage

```bash filename="terminal"
vercel dev
```

*Using the vercel dev command from the root of a
Vercel Project directory.*

## Unique Options

These are options that only apply to the `vercel dev` command.

### Listen

The `--listen` option, shorthand `-l`, can be used to specify which port `vercel dev` runs on.

```bash filename="terminal"
vercel dev --listen 5005
```

*Using the vercel dev command with the
\--listen option.*

### Yes

The `--yes` option can be used to skip questions you are asked when setting up a new Vercel Project.
The questions will be answered with the default scope and current directory for the Vercel Project name and location.

```bash filename="terminal"
vercel dev --yes
```

*Using the vercel dev command with the
\--yes option.*


---

[View full sitemap](/docs/sitemap)
