---
title: vercel microfrontends
product: vercel
url: /docs/cli/microfrontends
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Manage microfrontends configuration from the CLI. Learn how to pull configuration for local development.
---

# vercel microfrontends

The `vercel microfrontends` command (alias: `vercel mf`) provides utilities for working with Vercel Microfrontends from the CLI.

Currently, it supports pulling the remote configuration to your local repository for development.

> **💡 Note:** To learn more about the architecture and config format, see
> .
> For a polyrepo setup walkthrough, see
> .
> This command requires Vercel CLI 44.2.2 or newer.

## Usage

```bash filename="terminal"
vercel microfrontends pull [options]
```

*Using the vercel microfrontends pull command to
download the project's microfrontends.json (or
microfrontends.jsonc) file for local development.*

## Unique options

These are options that only apply to the `vercel microfrontends` command.

### Deployment

Use the `--dpl` option to specify a deployment ID or URL
to pull configuration from. If omitted, the CLI uses your project's default
application/deployment.

```bash filename="terminal"
vercel microfrontends pull --dpl https://my-app-abc123.vercel.app
```

*Pull configuration from a specific deployment.*

## Examples

### Pull configuration for the linked project

```bash filename="terminal"
vercel microfrontends pull
```

### Pull configuration for a specific deployment

```bash filename="terminal"
vercel mf pull --dpl dpl_123xyz
```


---

[View full sitemap](/docs/sitemap)
