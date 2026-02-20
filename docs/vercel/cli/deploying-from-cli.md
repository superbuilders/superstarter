---
title: Deploying Projects from Vercel CLI
product: vercel
url: /docs/cli/deploying-from-cli
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/cli/deploy
  - /docs/cli/promote
  - /docs/build-output-api/v3
  - /docs/cli/build
summary: Learn how to deploy your Vercel Projects from Vercel CLI using the vercel or vercel deploy commands.
---

# Deploying Projects from Vercel CLI

## Deploying from source

The `vercel` command is used to [deploy](/docs/cli/deploy) Vercel Projects and can be used from either the root of the Vercel Project directory or by providing a path.

```bash filename="terminal"
vercel
```

*Deploys the current Vercel project, when run from the Vercel Project root.*

You can alternatively use the [`vercel deploy` command](/docs/cli/deploy) for the same effect, if you want to be more explicit.

```bash filename="terminal"
vercel [path-to-project]
```

*Deploys the Vercel project found at the provided path, when it's a Vercel
Project root.*

When deploying, stdout is always the Deployment URL.

```bash filename="terminal"
vercel > deployment-url.txt
```

*Writes the Deployment URL output from the deploy
command to a text file.*

### Relevant commands

- [deploy](/docs/cli/deploy)

## Deploying a staged production build

By default, when you promote a deployment to production, your domain will point to that deployment. If you want to create a production deployment without assigning it to your domain, for example to avoid sending all of your traffic to it, you can:

1. Turn off the auto-assignment of domains for the current production deployment:

```bash filename="terminal"
vercel --prod --skip-domain
```

2. When you are ready, manually promote the staged deployment to production:

```bash filename="terminal"
vercel promote [deployment-id or url]
```

### Relevant commands

- [promote](/docs/cli/promote)
- [deploy](/docs/cli/deploy)

## Deploying from local build (prebuilt)

You can build Vercel projects locally to inspect the build outputs before they are [deployed](/docs/cli/deploy). This is a great option for producing builds for Vercel that do not share your source code with the platform.

It's also useful for debugging build outputs.

```bash filename="terminal"
vercel build
```

*Using the vercel command to deploy and write stdout
to a text file.*

This produces `.vercel/output` in the [Build Output API](/docs/build-output-api/v3) format. You can review the output, then [deploy](/docs/cli/deploy) with:

```bash filename="terminal"
vercel deploy --prebuilt
```

*Deploy the build outputs in .vercel/output produced
by vercel build.*

> **⚠️ Warning:** Review the [When not to use
> \--prebuilt](/docs/cli/deploy#when-not-to-use---prebuilt) section to understand
> when you should not use the `--prebuilt` flag.

See more details at [Build Output API](/docs/build-output-api/v3).

### Relevant commands

- [build](/docs/cli/build)
- [deploy](/docs/cli/deploy)


---

[View full sitemap](/docs/sitemap)
