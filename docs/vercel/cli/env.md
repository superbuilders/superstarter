---
title: vercel env
product: vercel
url: /docs/cli/env
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/environment-variables
  - /docs/cli/build
  - /docs/cli/dev
  - /docs/cli/pull
summary: Learn how to manage your environment variables in your Vercel Projects using the vercel env CLI command.
---

# vercel env

The `vercel env` command is used to manage [Environment Variables](/docs/environment-variables) of a Project, providing functionality to list, add, remove, export, and run commands with environment variables.

To leverage environment variables in local tools (like `next dev` or `gatsby dev`) that want them in a file (like `.env`), run `vercel env pull <file>`. This will export your Project's environment variables to that file. After updating environment variables on Vercel (through the dashboard, `vercel env add`, or `vercel env rm`), you will have to run `vercel env pull <file>` again to get the updated values.

To run a command with environment variables without writing them to a file, use `vercel env run -- <command>`. This fetches the environment variables directly from your linked Vercel project and passes them to the specified command.

### Exporting Development Environment Variables

Some frameworks make use of environment variables during local development through CLI commands like `next dev` or `gatsby dev`. The `vercel env pull` sub-command will export development environment variables to a local `.env` file or a different file of your choice.

```bash filename="terminal"
vercel env pull [file]
```

To override environment variable values temporarily, use:

```bash filename="terminal"
MY_ENV_VAR="temporary value" next dev
```

> **💡 Note:** If you are using [`vercel build`](/docs/cli/build) or [
> `vercel dev`](/docs/cli/dev), you should use [
> `vercel pull`](/docs/cli/pull) instead. Those commands
> operate on a local copy of environment variables and Project settings that are
> saved under `.vercel/`, which
> `vercel pull` provides.

## Usage

```bash filename="terminal"
vercel env ls
```

*Using the vercel env command to list all Environment
Variables in a Vercel Project.*

```bash filename="terminal"
vercel env add
```

*Using the vercel env command to add an Environment
Variable to a Vercel Project.*

```bash filename="terminal"
vercel env rm
```

*Using the vercel env command to remove an Environment
Variable from a Vercel Project.*

## Extended Usage

```bash filename="terminal"
vercel env ls [environment]
```

*Using the vercel env command to list Environment
Variables for a specific Environment in a Vercel Project.*

```bash filename="terminal"
vercel env ls [environment] [gitbranch]
```

*Using the vercel env command to list Environment
Variables for a specific Environment and Git branch.*

```bash filename="terminal"
vercel env add [name]
```

*Using the vercel env command to add an Environment
Variable to all Environments to a Vercel Project.*

```bash filename="terminal"
vercel env add [name] [environment]
```

*Using the vercel env command to add an Environment
Variable for a specific Environment to a Vercel Project.*

```bash filename="terminal"
vercel env add [name] [environment] [gitbranch]
```

*Using the vercel env command to add an Environment
Variable to a specific Git branch.*

```bash filename="terminal"
vercel env add [name] [environment] < [file]
```

*Using the vercel env command to add an Environment
Variable to a Vercel Project using a local file's content as the value.*

```bash filename="terminal"
echo [value] | vercel env add [name] [environment]
```

*Using the echo command to generate the value of the
Environment Variable and piping that value into the
vercel dev command. Warning: this will save the value
in bash history, so this is not recommend for secrets.*

```bash filename="terminal"
vercel env add [name] [environment] [gitbranch] < [file]
```

*Using the vercel env command to add an Environment
Variable with Git branch to a Vercel Project using a local file's content as
the value.*

```bash filename="terminal"
vercel env rm [name] [environment]
```

*Using the vercel env command to remove an Environment
Variable from a Vercel Project.*

### Updating Environment Variables

The `vercel env update` sub-command updates the value of an existing environment variable.

```bash filename="terminal"
vercel env update [name]
```

*Using vercel env update to update an Environment
Variable across all Environments.*

```bash filename="terminal"
vercel env update [name] [environment]
```

*Using vercel env update to update an Environment
Variable for a specific Environment.*

```bash filename="terminal"
vercel env update [name] [environment] [gitbranch]
```

*Using vercel env update to update an Environment
Variable for a specific Environment and Git branch.*

```bash filename="terminal"
cat ~/.npmrc | vercel env update NPM_RC preview
```

*Update an Environment Variable value from stdin.*

```bash filename="terminal"
vercel env pull [file]
```

*Using the vercel env command to download Development
Environment Variables from the cloud and write to a specific file.*

```bash filename="terminal"
vercel env pull --environment=preview
```

*Using the vercel env command to download Preview
Environment Variables from the cloud and write to the
.env.local file.*

```bash filename="terminal"
vercel env pull --environment=preview --git-branch=feature-branch
```

*Using the vercel env command to download
"feature-branch" Environment Variables from the cloud and write to the
.env.local file.*

### Running Commands with Environment Variables

The `vercel env run` sub-command runs any command with environment variables from your linked Vercel project, without writing them to a file. This is useful when you want to avoid storing secrets on disk or need a quick way to test with production-like configuration.

```bash filename="terminal"
vercel env run -- <command>
```

*Using vercel env run to run a command with
development Environment Variables from your Vercel Project.*

```bash filename="terminal"
vercel env run -- next dev
```

*Run the Next.js development server with development Environment Variables.*

```bash filename="terminal"
vercel env run -e preview -- npm test
```

*Run tests with preview Environment Variables.*

```bash filename="terminal"
vercel env run -e production -- next build
```

*Run a production build with production Environment Variables.*

```bash filename="terminal"
vercel env run -e preview --git-branch feature-x -- next dev
```

*Run the development server with preview Environment Variables for a specific
Git branch.*

> **💡 Note:** The `--` separator is required to distinguish between
> flags for `vercel env run` and the command you want to
> run. Flags after `--` are passed to your command.

#### Options

The following options are available for `vercel env run`:

- `-e, --environment`: Specify the environment to pull variables from. Defaults to `development`. Accepts `development`, `preview`, or `production`.
- `--git-branch`: Specify a Git branch to pull branch-specific Environment Variables.

## Unique Options

These are options that only apply to the `vercel env` command.

### Sensitive

The `--sensitive` option marks an environment variable as sensitive. Sensitive variables have additional security measures and their values are hidden in the dashboard.

```bash filename="terminal"
vercel env add API_TOKEN --sensitive
```

*Using vercel env add with the
\--sensitive option to add a sensitive Environment
Variable.*

```bash filename="terminal"
vercel env update API_TOKEN --sensitive
```

*Using vercel env update with the
\--sensitive option to update a variable and mark it
as sensitive.*

### Force

The `--force` option overwrites an existing environment variable of the same target without prompting for confirmation.

```bash filename="terminal"
vercel env add API_TOKEN production --force
```

*Using vercel env add with the
\--force option to overwrite an existing Environment
Variable.*

### Yes

The `--yes` option can be used to bypass the confirmation prompt when overwriting an environment file, removing an environment variable, or updating an environment variable.

```bash filename="terminal"
vercel env pull --yes
```

*Using the vercel env pull command with the
\--yes option to overwrite an existing environment
file.*

```bash filename="terminal"
vercel env rm [name] --yes
```

*Using the vercel env rm command with the
\--yes option to skip the remove confirmation.*

```bash filename="terminal"
vercel env update API_TOKEN production --yes
```

*Using the vercel env update command with the
\--yes option to skip the update confirmation.*


---

[View full sitemap](/docs/sitemap)
