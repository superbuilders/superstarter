---
title: vercel target
product: vercel
url: /docs/cli/target
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Work with custom environments using the --target flag in Vercel CLI.
---

# vercel target

The `vercel target` command (alias: `vercel targets`) manages your Vercel project's targets (custom environments). Targets are custom deployment environments beyond the standard production, preview, and development environments.

## Usage

```bash filename="terminal"
vercel target list
```

*Using vercel target list to list all targets for your project.*

## Commands

### list (ls)

List all targets defined for the current project.

```bash filename="terminal"
vercel target list
vercel target ls
vercel targets ls
```

*List all custom environments configured for your project.*

## Using the --target flag

The `--target` flag is available on several commands to specify which environment to target:

```bash filename="terminal"
# Deploy to a custom environment named "staging"
vercel deploy --target=staging
```

*Deploy your project to a custom environment by specifying
\--target=\<environment-name>.*

## Examples

### List all targets

```bash filename="terminal"
vercel target list
```

### Deploy to a custom environment

```bash filename="terminal"
vercel deploy --target=staging
```

### Pull environment variables for a custom environment

```bash filename="terminal"
vercel pull --environment=staging
```

### Set and use environment variables for a custom environment

```bash filename="terminal"
vercel env add MY_KEY staging
vercel env ls staging
```

## Related

-
-
-


---

[View full sitemap](/docs/sitemap)
