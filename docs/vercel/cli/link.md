---
title: vercel link
product: vercel
url: /docs/cli/link
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/projects/overview
  - /docs/git
  - /docs/cli/global-options
summary: Learn how to link a local directory to a Vercel Project using the vercel link CLI command.
---

# vercel link

The `vercel link` command links your local directory to a [Vercel Project](/docs/projects/overview).

## Usage

```bash filename="terminal"
vercel link
```

*Using the vercel link command to link the current
directory to a Vercel Project.*

## Extended Usage

```bash filename="terminal"
vercel link [path-to-directory]
```

*Using the vercel link command and supplying a path to
the local directory of the Vercel Project.*

## Unique Options

These are options that only apply to the `vercel link` command.

### Repo&#x20;

The `--repo` option can be used to link all projects in your repository to their respective Vercel projects in one command. This command requires that your Vercel projects are using the [Git integration](/docs/git).

```bash filename="terminal"
vercel link --repo
```

*Using the \`vercel link\` command with the \`--repo\` option.*

### Yes

The `--yes` option can be used to skip questions you are asked when setting up a new Vercel Project.
The questions will be answered with the default scope and current directory for the Vercel Project name and location.

```bash filename="terminal"
vercel link --yes
```

*Using the vercel link command with the
\--yes option.*

### Project

The `--project` option specifies a project name or ID. In non-interactive usage, `--project` allows you to set a project that does not match the name of the current working directory.

```bash filename="terminal"
vercel link --yes --project foo
```

*Using the vercel link command with the
\--project option.*

You can also set the `VERCEL_PROJECT_ID` environment variable instead of using the `--project` flag. If both are provided, the `--project` flag takes precedence. See [CLI Global Options](/docs/cli/global-options#project) for the full precedence order when specifying a project.


---

[View full sitemap](/docs/sitemap)
