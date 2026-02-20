---
title: vercel build
product: vercel
url: /docs/cli/build
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/build-output-api/v3
  - /docs/deployments/environments
summary: Learn how to build a Vercel Project locally or in your own CI environment using the vercel build CLI command.
---

# vercel build

The `vercel build` command can be used to build a Vercel Project locally or in your own CI environment.
Build artifacts are placed into the `.vercel/output` directory according to the
[Build Output API](/docs/build-output-api/v3).

When used in conjunction with the `vercel deploy --prebuilt` command, this allows a Vercel Deployment
to be created *without* sharing the Vercel Project's source code with Vercel.

This command can also be helpful in debugging a Vercel Project by receiving error messages for a failed
build locally, or by inspecting the resulting build artifacts to get a better understanding of
how Vercel will create the Deployment.

It is recommended to run the `vercel pull` command before invoking `vercel build` to ensure that
you have the most recent Project Settings and Environment Variables stored locally.

## Usage

```bash filename="terminal"
vercel build
```

*Using the vercel build command to build a Vercel
Project.*

## Unique Options

These are options that only apply to the `vercel build` command.

### Production

The `--prod` option can be specified when you want to build the Vercel Project using Production Environment Variables. By default, the Preview Environment Variables will be used.

```bash filename="terminal"
vercel build --prod
```

*Using the vercel build command with the
\--prod option.*

### Yes

The `--yes` option can be used to bypass the confirmation prompt and automatically pull environment variables and Project Settings if not found locally.

```bash filename="terminal"
vercel build --yes
```

*Using the vercel build command with the
\--yes option.*

### target

Use the `--target` option to define the environment you want to build against. This could be production, preview, or a [custom environment](/docs/deployments/environments#custom-environments).

```bash filename="terminal"
vercel build --target=staging
```

### Output

The `--output` option specifies a custom directory where the build artifacts will be written to, instead of the default `.vercel/output` directory.

```bash filename="terminal"
vercel build --output ./custom-output
```

*Using the vercel build command with the
\--output option to specify a custom output directory.*

## Related guides

- [How can I use the Vercel CLI for custom workflows?](/kb/guide/using-vercel-cli-for-custom-workflows)


---

[View full sitemap](/docs/sitemap)
