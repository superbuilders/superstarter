---
title: Vercel CLI Global Options
product: vercel
url: /docs/cli/global-options
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/project-configuration/global-configuration
  - /docs/cli/link
summary: "Global options are commonly available to use with multiple Vercel CLI commands. Learn about Vercel CLI's global options here."
---

# Vercel CLI Global Options

Global options are commonly available to use with multiple Vercel CLI commands.

## Current Working Directory

The `--cwd` option can be used to provide a working directory (that can be different from the current directory) when running Vercel CLI commands.

This option can be a relative or absolute path.

```bash filename="terminal"
vercel --cwd ~/path-to/project
```

*Using the vercel command with the
\--cwd option.*

## Debug

The `--debug` option, shorthand `-d`, can be used to provide a more verbose output when running Vercel CLI commands.

```bash filename="terminal"
vercel --debug
```

*Using the vercel command with the
\--debug option.*

## Global config

The `--global-config` option, shorthand `-Q`, can be used to set the path to the [global configuration directory](/docs/project-configuration/global-configuration).

```bash filename="terminal"
vercel --global-config /path-to/global-config-directory
```

*Using the vercel command with the
\--global-config option.*

## Help

The `--help` option, shorthand `-h`, can be used to display more information about [Vercel CLI](/cli) commands.

```bash filename="terminal"
vercel --help
```

*Using the vercel command with the
\--help option.*

```bash filename="terminal"
vercel alias --help
```

*Using the vercel alias command with the
\--help option.*

## Local config

The `--local-config` option, shorthand `-A`, can be used to set the path to a local `vercel.json` file.

```bash filename="terminal"
vercel --local-config /path-to/vercel.json
```

*Using the vercel command with the
\--local-config option.*

## Scope

The `--scope` option, shorthand `-S`, can be used to execute Vercel CLI commands from a scope that’s not currently active.

```bash filename="terminal"
vercel --scope my-team-slug
```

*Using the vercel command with the
\--scope option.*

## Project

You can specify which Vercel Project to use for a CLI command in three ways:

1. **`--project` flag**: Pass a project name or ID directly to the command
2. **`VERCEL_PROJECT_ID` environment variable**: Set the project ID as an environment variable
3. **Project linking**: Use the `.vercel` directory created by [`vercel link`](/docs/cli/link)

If you provide multiple options, the CLI uses this precedence order (highest to lowest):

1. `--project` flag
2. `VERCEL_PROJECT_ID` environment variable
3. `.vercel/project.json` from project linking

```bash filename="terminal"
# Using the --project flag with a project name
vercel deploy --project my-project

# Using the --project flag with a project ID
vercel deploy --project prj_abc123

# Using the environment variable
VERCEL_PROJECT_ID=prj_abc123 vercel deploy
```

*Different ways to specify the project for a Vercel CLI command.*

The `--project` flag and `VERCEL_PROJECT_ID` both accept a project name or project ID. When using CI/CD pipelines or non-interactive environments, set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as environment variables to skip project linking. See [using Vercel CLI for custom workflows](/kb/guide/using-vercel-cli-for-custom-workflows) for more details.

## Token

The `--token` option, shorthand `-t`, can be used to execute Vercel CLI commands with an [authorization token](/account/tokens).

```bash filename="terminal"
vercel --token iZJb2oftmY4ab12HBzyBXMkp
```

*Using the vercel command with the
\--token option.*

## No Color

The `--no-color` option, or `NO_COLOR=1` environment variable, can be used to execute Vercel CLI commands with no color or emoji output. This respects the [NO\_COLOR standard](https://no-color.org).

```bash filename="terminal"
vercel login --no-color
```

*Using the vercel command with the
\--no-color option.*

## Team

The `--team` option, shorthand `-T`, can be used to specify a team slug or ID for the command. This is useful when you need to run a command against a specific team without switching scope.

```bash filename="terminal"
vercel list --team my-team-slug
```

*Using the vercel command with the
\--team option.*

```bash filename="terminal"
vercel deploy -T team_abc123def
```

*Using the vercel command with the
-T shorthand to specify a team by ID.*

## Version

The `--version` option, shorthand `-v`, outputs the current version number of Vercel CLI.

```bash filename="terminal"
vercel --version
```

*Using the vercel command with the
\--version option to display the CLI version.*


---

[View full sitemap](/docs/sitemap)
