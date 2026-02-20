---
title: Sandbox CLI Reference
product: vercel
url: /docs/vercel-sandbox/cli-reference
type: reference
prerequisites:
  - /docs/vercel-sandbox
related:
  - /docs/vercel-sandbox/sdk-reference
  - /docs/project-configuration/general-settings
  - /docs/vercel-sandbox/concepts/snapshots
summary: Based on the Docker CLI, you can use the Sandbox CLI to manage your Vercel Sandbox from the command line.
---

# Sandbox CLI Reference

The Sandbox CLI, based on the Docker CLI, allows you to manage sandboxes, execute commands, copy files, and more from your terminal. This page provides a complete reference for all available commands.

Use the CLI for manual testing and debugging, or use the [SDK](/docs/vercel-sandbox/sdk-reference) to automate sandbox workflows in your application.

## Installation

Install the Sandbox CLI globally to use all commands:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i sandbox
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i sandbox
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i sandbox
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i sandbox
    ```
  </Code>
</CodeBlock>

You can invoke the CLI using the `sandbox` or `sbx` commands in your terminal.

## Authentication

Log in to use Vercel Sandbox:

```bash filename="Terminal"
sandbox login
```

## `sandbox --help`

Get help information for all available sandbox commands:

```bash filename="terminal"
sandbox <subcommand>
```

**Description:** Interfacing with Vercel Sandbox

**Available subcommands:**

- [`list`](#sandbox-list): List all sandboxes for the specified account and project. \[alias: `ls`]
- [`create`](#sandbox-create): Create a sandbox in the specified account and project.
- [`config`](#sandbox-config): Update configuration of a running sandbox (e.g. network firewall)
- [`copy`](#sandbox-copy): Copy files between your local filesystem and a remote sandbox \[alias: `cp`]
- [`exec`](#sandbox-exec): Execute a command in an existing sandbox
- [`connect`](#sandbox-connect): Start an interactive shell in an existing sandbox \[aliases: `ssh`, `shell`]
- [`stop`](#sandbox-stop): Stop one or more running sandboxes \[aliases: `rm`, `remove`]
- [`run`](#sandbox-run): Create and run a command in a sandbox
- [`snapshot`](#sandbox-snapshot): Take a snapshot of the filesystem of a sandbox
- [`snapshots`](#sandbox-snapshots): Manage sandbox snapshots
- [`login`](#sandbox-login): Log in to the Sandbox CLI
- [`logout`](#sandbox-logout): Log out of the Sandbox CLI

For more help, try running `sandbox <subcommand> --help`

## `sandbox list`

List all sandboxes for the specified account and project.

```bash filename="terminal"
sandbox list [OPTIONS]
```

### Sandbox list example

```bash filename="terminal"
# List all running sandboxes
sandbox list

# List all sandboxes (including stopped ones)
sandbox list --all

# List sandboxes for a specific project
sandbox list --project my-nextjs-app
```

### Sandbox list options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox list flags

| Flag     | Short | Description                                                                        |
| -------- | ----- | ---------------------------------------------------------------------------------- |
| `--all`  | `-a`  | Show all sandboxes, including stopped ones (we only show running ones by default). |
| `--help` | `-h`  | Display help information.                                                          |

## `sandbox create`

Create a sandbox in the specified account and project.

```bash filename="terminal"
sandbox create [OPTIONS]
```

### Sandbox create example

```bash filename="terminal"
# Create a basic Node.js sandbox
sandbox create

# Create a Python sandbox with custom timeout
sandbox create --runtime python3.13 --timeout 1h

# Create sandbox with port forwarding
sandbox create --publish-port 8080 --project my-app

# Create sandbox silently (no output)
sandbox create --silent

# Create sandbox from a snapshot
sandbox create --snapshot snap_abc123

# Create sandbox without Internet access
sandbox create --network-policy deny-all

# Create sandbox with restricted Internet access (limited to Vercel's AI gateway)
sandbox create --allowed-domain ai-gateway.vercel.sh
```

### Sandbox create options

| Option                      | Alias    | Description                                                                                                                                                      |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`           | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>`       | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`            | `--team` | The team you want to use with this command.                                                                                                                      |
| `--runtime <runtime>`       | -        | Choose between Node.js ('node24' or 'node22') or Python ('python3.13'). We'll use Node.js 24 by default.                                                         |
| `--timeout <duration>`      | -        | How long the sandbox can run before we automatically stop it. Examples: '5m', '1h'. We'll stop it after 5 minutes by default.                                    |
| `--publish-port <port>`     | `-p`     | Make a port from your sandbox accessible via a public URL.                                                                                                       |
| `--snapshot <snapshot_id>`  | -        | Create the sandbox from a previously saved snapshot.                                                                                                             |
| `--network-policy <mode>`   | -        | Base network mode to start the sandbox with ('allow-all' - default or 'deny-all'). Leave unset if using more specific rules.                                     |
| `--allowed-domain <domain>` | -        | List of domains (or pattern) to allow access to (only applicable in 'custom' mode). Use wildcard `*` to match multiple domains or subdomains.                    |
| `--allowed-cidr <cidr>`     | -        | List of address ranges to allow access to (only applicable in 'custom' mode). Traffic to those addresses will bypass domain matching.                            |
| `--denied-cidr <cidr>`      | -        | List of address ranges to deny access to (only applicable in 'custom' mode). Those take precedence over allowed domains and addresses.                           |

### Sandbox create flags

| Flag        | Short | Description                                                    |
| ----------- | ----- | -------------------------------------------------------------- |
| `--silent`  | -     | Create the sandbox without showing you the sandbox ID.         |
| `--connect` | -     | Start an interactive shell session after creating the sandbox. |
| `--help`    | `-h`  | Display help information.                                      |

## `sandbox config`

Update configuration of a running sandbox (e.g. network firewall)

```bash filename="terminal"
sandbox config <command> <SANDBOX_ID> [OPTIONS]
```

### Sandbox config example

```bash filename="terminal"
# Update the sandbox firewall to deny all egress traffic
sandbox config network-policy sb_1234567890 --network-policy deny-all

# Update the sandbox firewall to allow all egress traffic
sandbox config network-policy sb_1234567890 --mode allow-all

# Update the sandbox firewall to specific rules
sandbox config network-policy sb_1234567890 --allowed-domain vercel.com --allowed-domain ai-gateway.vercel.sh
```

### Sandbox config network-policy options

| Option                      | Alias    | Description                                                                                                                                   |
| --------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `--network-policy <mode>`   | `--mode` | Base network mode to update the sandbox to ('allow-all' - default, 'deny-all'). Leave unset if using more specific rules.                     |
| `--allowed-domain <domain>` | -        | List of domains (or pattern) to allow access to (only applicable in 'custom' mode). Use wildcard `*` to match multiple domains or subdomains. |
| `--allowed-cidr <cidr>`     | -        | List of address ranges to allow access to (only applicable in 'custom' mode). Traffic to those addresses will bypass domain matching.         |
| `--denied-cidr <cidr>`      | -        | List of address ranges to deny access to (only applicable in 'custom' mode). Those take precedence over allowed domains and addresses.        |

### Sandbox config network-policy flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

### Sandbox config network-policy arguments

| Argument       | Description                    |
| -------------- | ------------------------------ |
| `<SANDBOX_ID>` | The running sandbox to update. |

## `sandbox copy`

Copy files between your local filesystem and a remote sandbox.

```bash filename="terminal"
sandbox copy [OPTIONS] <SANDBOX_ID:PATH> <SANDBOX_ID:PATH>
```

### Sandbox copy example

```bash filename="terminal"
# Copy file from local to sandbox
sandbox copy ./local-file.txt sb_1234567890:/app/remote-file.txt

# Copy file from sandbox to local
sandbox copy sb_1234567890:/app/output.log ./output.log

# Copy directory from sandbox to local
sandbox copy sb_1234567890:/app/dist/ ./build/
```

### Sandbox copy options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox copy flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

### Sandbox copy arguments

| Argument            | Description                                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `<SANDBOX_ID:PATH>` | The source file path (either a local file or sandbox\_id:path for remote files).      |
| `<SANDBOX_ID:PATH>` | The destination file path (either a local file or sandbox\_id:path for remote files). |

## `sandbox exec`

Execute a command in an existing sandbox.

```bash filename="terminal"
sandbox exec [OPTIONS] <sandbox_id> <command> [...args]
```

### Sandbox exec example

```bash filename="terminal"
# Execute a simple command in a sandbox
sandbox exec sb_1234567890 ls -la

# Run with environment variables
sandbox exec --env DEBUG=true sb_1234567890 npm test

# Execute interactively with sudo
sandbox exec --interactive --sudo sb_1234567890 sh

# Run command in specific working directory
sandbox exec --workdir /app sb_1234567890 python script.py
```

### Sandbox exec options

| Option                  | Alias    | Description                                                                                                                                                      |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`       | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>`   | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`        | `--team` | The team you want to use with this command.                                                                                                                      |
| `--workdir <directory>` | `-w`     | Set the directory where you want the command to run.                                                                                                             |
| `--env <key=value>`     | `-e`     | Set environment variables for your command.                                                                                                                      |

### Sandbox exec flags

| Flag            | Short | Description                                        |
| --------------- | ----- | -------------------------------------------------- |
| `--sudo`        | -     | Run the command with admin privileges.             |
| `--interactive` | `-i`  | Run the command in an interactive shell.           |
| `--tty`         | `-t`  | Enable terminal features for interactive commands. |
| `--help`        | `-h`  | Display help information.                          |

### Sandbox exec arguments

| Argument       | Description                                              |
| -------------- | -------------------------------------------------------- |
| `<sandbox_id>` | The ID of the sandbox where you want to run the command. |
| `<command>`    | The command you want to run.                             |
| `[...args]`    | Additional arguments for your command.                   |

## `sandbox connect`

Start an interactive shell in an existing sandbox.

```bash filename="terminal"
sandbox connect [OPTIONS] <sandbox_id>
```

### Sandbox connect example

```bash filename="terminal"
# Connect to an existing sandbox
sandbox connect sb_1234567890

# Connect with a specific working directory
sandbox connect --workdir /app sb_1234567890

# Connect with environment variables and sudo
sandbox connect --env DEBUG=true --sudo sb_1234567890
```

### Sandbox connect options

| Option                  | Alias    | Description                                                                                                                                                      |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`       | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>`   | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`        | `--team` | The team you want to use with this command.                                                                                                                      |
| `--workdir <directory>` | `-w`     | Set the directory where you want the command to run.                                                                                                             |
| `--env <key=value>`     | `-e`     | Set environment variables for your command.                                                                                                                      |

### Sandbox connect flags

| Flag                  | Short | Description                                                                                                  |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------ |
| `--sudo`              | -     | Run the command with admin privileges.                                                                       |
| `--no-extend-timeout` | -     | Do not extend the sandbox timeout while running an interactive command. Only affects interactive executions. |
| `--help`              | `-h`  | Display help information.                                                                                    |

### Sandbox connect arguments

| Argument       | Description                                            |
| -------------- | ------------------------------------------------------ |
| `<sandbox_id>` | The ID of the sandbox where you want to start a shell. |

## `sandbox stop`

Stop one or more running sandboxes.

```bash filename="terminal"
sandbox stop [OPTIONS] <sandbox_id> [...sandbox_id]
```

### Sandbox stop example

```bash filename="terminal"
# Stop a single sandbox
sandbox stop sb_1234567890

# Stop multiple sandboxes
sandbox stop sb_1234567890 sb_0987654321

# Stop sandbox for a specific project
sandbox stop --project my-app sb_1234567890
```

### Sandbox stop options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox stop flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

### Sandbox stop arguments

| Argument          | Description                             |
| ----------------- | --------------------------------------- |
| `<sandbox_id>`    | The ID of the sandbox you want to stop. |
| `[...sandbox_id]` | Additional sandbox IDs to stop.         |

## `sandbox run`

Create and run a command in a sandbox.

```bash filename="terminal"
sandbox run [OPTIONS] <command> [...args]
```

### Sandbox run example

```bash filename="terminal"
# Run a simple Node.js script
sandbox run -- node --version

# Run with custom environment and timeout
sandbox run --env NODE_ENV=production --timeout 10m -- npm start

# Run interactively with port forwarding
sandbox run --interactive --publish-port 3000 --tty npm run dev

# Run with auto-cleanup
sandbox run --rm -- python3 script.py
```

### Sandbox run options

| Option                  | Alias    | Description                                                                                                                                                      |
| ----------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`       | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>`   | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`        | `--team` | The team you want to use with this command.                                                                                                                      |
| `--runtime <runtime>`   | -        | Choose between Node.js ('node24' or 'node22') or Python ('python3.13'). We'll use Node.js 24 by default.                                                         |
| `--timeout <duration>`  | -        | How long the sandbox can run before we automatically stop it. Examples: '5m', '1h'. We'll stop it after 5 minutes by default.                                    |
| `--publish-port <port>` | `-p`     | Make a port from your sandbox accessible via a public URL.                                                                                                       |
| `--workdir <directory>` | `-w`     | Set the directory where you want the command to run.                                                                                                             |
| `--env <key=value>`     | `-e`     | Set environment variables for your command.                                                                                                                      |

### Sandbox run flags

| Flag            | Short | Description                                                 |
| --------------- | ----- | ----------------------------------------------------------- |
| `--sudo`        | -     | Run the command with admin privileges.                      |
| `--interactive` | `-i`  | Run the command in an interactive shell.                    |
| `--tty`         | `-t`  | Enable terminal features for interactive commands.          |
| `--rm`          | -     | Automatically delete the sandbox when the command finishes. |
| `--help`        | `-h`  | Display help information.                                   |

### Sandbox run arguments

| Argument    | Description                            |
| ----------- | -------------------------------------- |
| `<command>` | The command you want to run.           |
| `[...args]` | Additional arguments for your command. |

## `sandbox snapshot`

Take a snapshot of the filesystem of a sandbox.

```bash filename="terminal"
sandbox snapshot [OPTIONS] <SANDBOX_ID>
```

### Sandbox snapshot example

```bash filename="terminal"
# Create a snapshot of a running sandbox
sandbox snapshot sb_1234567890 --stop

# Create a snapshot that expires in 14 days
sandbox snapshot sb_1234567890 --stop --expiration 14d

# Create a snapshot that never expires
sandbox snapshot sb_1234567890 --stop --expiration 0
```

### Sandbox snapshot options

| Option                      | Alias    | Description                                                                                                                                                      |
| --------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`           | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>`       | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`            | `--team` | The team you want to use with this command.                                                                                                                      |
| `--expiration <expiration>` | -        | The snapshot [expiration period](/docs/vercel-sandbox/concepts/snapshots#snapshot-limits). Examples: `1d`, `14d`. The default is 30 days.                        |

### Sandbox snapshot flags

| Flag       | Short | Description                                                 |
| ---------- | ----- | ----------------------------------------------------------- |
| `--stop`   | -     | Confirm that the sandbox will be stopped when snapshotting. |
| `--silent` | -     | Don't write snapshot ID to stdout.                          |
| `--help`   | `-h`  | Display help information.                                   |

### Sandbox snapshot arguments

| Argument       | Description                        |
| -------------- | ---------------------------------- |
| `<sandbox_id>` | The ID of the sandbox to snapshot. |

## `sandbox snapshots`

Manage sandbox snapshots.

```bash filename="terminal"
sandbox snapshots <subcommand> [OPTIONS]
```

### Sandbox snapshots subcommands

- `list`: List snapshots for the specified account and project. \[alias: `ls`]
- `get`: Get details of a snapshot.
- `delete`: Delete one or more snapshots. \[aliases: `rm`, `remove`]

## `sandbox snapshots list`

List snapshots for the specified account and project.

```bash filename="terminal"
sandbox snapshots list [OPTIONS]
```

### Sandbox snapshots list example

```bash filename="terminal"
# List snapshots for the current project
sandbox snapshots list

# List snapshots for a specific project
sandbox snapshots list --project my-app
```

### Sandbox snapshots list options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox snapshots list flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

## `sandbox snapshots get`

Get details of a snapshot.

```bash filename="terminal"
sandbox snapshots get [OPTIONS] <snapshot_id>
```

### Sandbox snapshots get example

```bash filename="terminal"
# Get details of a specific snapshot
sandbox snapshots get snap_1234567890

# Get snapshot details for a specific project
sandbox snapshots get --project my-app snap_1234567890
```

### Sandbox snapshots get options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox snapshots get flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

### Sandbox snapshots get arguments

| Argument        | Description                         |
| --------------- | ----------------------------------- |
| `<snapshot_id>` | The ID of the snapshot to retrieve. |

## `sandbox snapshots delete`

Delete one or more snapshots.

```bash filename="terminal"
sandbox snapshots delete [OPTIONS] <snapshot_id> [...snapshot_id]
```

### Sandbox snapshots delete example

```bash filename="terminal"
# Delete a single snapshot
sandbox snapshots delete snap_1234567890

# Delete multiple snapshots for a specific project
sandbox snapshots delete --project my-app snap_1234567890 snap_0987654321
```

### Sandbox snapshots delete options

| Option                | Alias    | Description                                                                                                                                                      |
| --------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--token <token>`     | -        | Your [Vercel authentication token](/kb/guide/how-do-i-use-a-vercel-api-access-token). If you don't provide it, we'll use a stored token or prompt you to log in. |
| `--project <project>` | -        | The [project name or ID](/docs/project-configuration/general-settings#project-id) you want to use with this command.                                             |
| `--scope <team>`      | `--team` | The team you want to use with this command.                                                                                                                      |

### Sandbox snapshots delete flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

### Sandbox snapshots delete arguments

| Argument           | Description                        |
| ------------------ | ---------------------------------- |
| `<snapshot_id>`    | Snapshot ID to delete.             |
| `[...snapshot_id]` | Additional snapshot IDs to delete. |

## `sandbox login`

Log in to the Sandbox CLI.

```bash filename="terminal"
sandbox login
```

### Sandbox login example

```bash filename="terminal"
# Log in to the Sandbox CLI
sandbox login
```

### Sandbox login flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

## `sandbox logout`

Log out of the Sandbox CLI.

```bash filename="terminal"
sandbox logout
```

### Sandbox logout example

```bash filename="terminal"
# Log out of the Sandbox CLI
sandbox logout
```

### Sandbox logout flags

| Flag     | Short | Description               |
| -------- | ----- | ------------------------- |
| `--help` | `-h`  | Display help information. |

## CLI examples

### Your first sandbox

Create a sandbox and run a command in one step:

```bash
sandbox run echo "Hello Sandbox!"
```

You'll see output like:

```
Creating sandbox... ✓
Running command...
Hello Sandbox!
Sandbox stopped.
```

### Create a long-running sandbox

For interactive work, create a sandbox that stays running:

```bash
sandbox create --timeout 30m
```

This returns a sandbox ID like `sb_abc123xyz`. Save this ID to interact with the sandbox.

### Execute commands in your sandbox

Run commands using the sandbox ID:

```bash
# Check the environment
sandbox exec sb_abc123xyz node --version

# Install packages
sandbox exec sb_abc123xyz npm init -y
sandbox exec sb_abc123xyz npm install express

# Create files
sandbox exec sb_abc123xyz touch server.js
```

### Copy files to/from sandbox

Test local code in the sandbox:

```bash
# Copy your code to the sandbox
sandbox copy ./my-app.js sb_abc123xyz:/home/sandbox/

# Run it
sandbox exec sb_abc123xyz node /home/sandbox/my-app.js

# Copy results back
sandbox copy sb_abc123xyz:/home/sandbox/output.json ./results.json
```

### Interactive shell access

Work inside the sandbox like it's your machine:

```bash
sandbox exec --interactive --tty sb_abc123xyz bash
```

Now you're inside the sandbox! Try:

```bash
pwd                    # See where you are
ls -la                 # List files
node -e "console.log('Inside!')"  # Run Node.js
exit                   # Leave when done
```

### Stop your sandbox

When finished:

```bash
sandbox stop sb_abc123xyz
```

### Test AI-generated code interactively

```bash
# Create sandbox
SANDBOX_ID=$(sandbox create --timeout 15m --silent)

# Copy AI-generated code
sandbox copy ./ai-generated.js $SANDBOX_ID:/app/

# Test it interactively
sandbox exec --interactive --tty $SANDBOX_ID bash
# Now inside: cd /app && node ai-generated.js

# Clean up
sandbox stop $SANDBOX_ID
```

### Debug a failing build

```bash
# Create sandbox with more time
sandbox create --timeout 1h

# Copy your project
sandbox copy ./my-project/ sb_abc123xyz:/app/

# Try building
sandbox exec sb_abc123xyz --workdir /app npm run build

# If it fails, debug interactively
sandbox exec -it sb_abc123xyz bash
```

### Run a development server

```bash
# Create with port exposure
sandbox create --timeout 30m --publish-port 3000

# Start your dev server
sandbox exec --workdir /app sb_abc123xyz npm run dev

# Access at the provided URL
# Visit: https://sb-abc123xyz.vercel.app
```


---

[View full sitemap](/docs/sitemap)
