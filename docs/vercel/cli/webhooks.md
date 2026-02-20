---
title: vercel webhooks
product: vercel
url: /docs/cli/webhooks
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/webhooks
  - /docs/headers/request-headers
  - /docs/webhooks/webhooks-api
summary: Learn how to manage webhooks for your Vercel account using the vercel webhooks CLI command.
---

# vercel webhooks

> **⚠️ Warning:** The `vercel webhooks` command is currently in beta. Features and behavior may change.

The `vercel webhooks` command is used to manage [webhooks](/docs/webhooks) for your Vercel account, providing functionality to list, inspect, create, and remove webhooks. Webhooks allow you to receive HTTP POST requests when events occur in your Vercel account.

For more information about webhooks and their supported events, see the [Webhooks documentation](/docs/webhooks).

## Usage

The `vercel webhooks` command supports the following subcommands:

- [`list`](#vercel-webhooks-list) - List all webhooks
- [`get`](#vercel-webhooks-get) - Get details of a specific webhook
- [`create`](#vercel-webhooks-create) - Create a new webhook
- [`rm`](#vercel-webhooks-rm) - Remove a webhook

## vercel webhooks list

The `vercel webhooks list` command lists all webhooks configured for your account.

```bash filename="terminal"
vercel webhooks list
```

*Using the \`vercel webhooks list\` command to list all webhooks.*

You can also use the `ls` alias:

```bash filename="terminal"
vercel webhooks ls
```

*Using the \`vercel webhooks ls\` alias to list all webhooks.*

### JSON output

Use the `--format` option to output the list as JSON:

```bash filename="terminal"
vercel webhooks ls --format json
```

*Using the \`--format json\` option to output webhooks as JSON.*

## vercel webhooks get

The `vercel webhooks get` command displays detailed information about a specific webhook.

```bash filename="terminal"
vercel webhooks get <id>
```

*Using the \`vercel webhooks get\` command to retrieve information about a webhook.*

You can also use the `inspect` alias:

```bash filename="terminal"
vercel webhooks inspect <id>
```

*Using the \`vercel webhooks inspect\` alias to retrieve information about a webhook.*

### JSON output

Use the `--format` option to output the webhook details as JSON:

```bash filename="terminal"
vercel webhooks get <id> --format json
```

*Using the \`--format json\` option to output webhook details as JSON.*

## vercel webhooks create

The `vercel webhooks create` command creates a new webhook for your account.

```bash filename="terminal"
vercel webhooks create <url> --event <event>
```

*Using the \`vercel webhooks create\` command to create a new webhook.*

You can also use the `add` alias:

```bash filename="terminal"
vercel webhooks add <url> --event <event>
```

*Using the \`vercel webhooks add\` alias to create a new webhook.*

### Specifying events

At least one event is required when creating a webhook. Use the `--event` option (shorthand `-e`) to specify which events the webhook should listen for. You can specify multiple events by using the option multiple times:

```bash filename="terminal"
vercel webhooks create https://example.com/webhook --event deployment.created --event deployment.ready
```

*Creating a webhook that listens for deployment created and ready events.*

### Specifying projects

By default, webhooks listen to events from all projects in your account. Use the `--project` option (shorthand `-p`) to limit the webhook to specific projects. You must provide the **project ID** (for example, `prj_abc123`), not the project name. To find a project ID, open the project in the [Vercel dashboard](/dashboard), go to **Settings** → **General**, or run `vercel project ls` in the CLI.

```bash filename="terminal"
vercel webhooks create https://example.com/webhook --event deployment.created --project prj_abc123
```

*Creating a webhook that only listens for events from a specific project.*

You can specify multiple projects:

```bash filename="terminal"
vercel webhooks create https://example.com/webhook --event deployment.created --project prj_abc123 --project prj_def456
```

*Creating a webhook that listens for events from multiple projects.*

> **💡 Note:** When a webhook is created, a secret is displayed. Save this secret because it
> will not be shown again. You can use this secret to verify webhook signatures
> using the [x-vercel-signature](/docs/headers/request-headers#x-vercel-signature) header.

## vercel webhooks rm

The `vercel webhooks rm` command removes a webhook from your account.

```bash filename="terminal"
vercel webhooks rm <id>
```

*Using the \`vercel webhooks rm\` command to remove a webhook.*

You can also use the `remove` or `delete` aliases:

```bash filename="terminal"
vercel webhooks remove <id>
vercel webhooks delete <id>
```

*Using the \`vercel webhooks remove\` or \`vercel webhooks delete\` aliases to remove a webhook.*

By default, the command prompts for confirmation before removing the webhook. Use the `--yes` option to skip the confirmation:

```bash filename="terminal"
vercel webhooks rm <id> --yes
```

*Using the \`--yes\` option to skip the confirmation prompt.*

## Unique options

These are options that only apply to the `vercel webhooks` command.

### Format

The `--format` option can be used with the `list` and `get` subcommands to output results as JSON. The only supported value is `json`.

```bash filename="terminal"
vercel webhooks ls --format json
```

*Using the \`vercel webhooks ls\` command with the \`--format\` option.*

### Event

The `--event` option (shorthand `-e`) specifies which events the webhook should listen for when using the `create` subcommand. This option can be used multiple times to subscribe to multiple events.

```bash filename="terminal"
vercel webhooks create https://example.com/webhook --event deployment.created
```

*Using the \`vercel webhooks create\` command with the \`--event\` option.*

See the [supported event types](/docs/webhooks/webhooks-api#supported-event-types) for a complete list of available events.

### Project

The `--project` option (shorthand `-p`) limits the webhook to specific projects when using the `create` subcommand. Provide the project ID (for example, `prj_abc123`). You can find it in the project's **Settings** → **General** in the [dashboard](/dashboard), or by running `vercel project ls`. This option can be used multiple times to include multiple projects.

```bash filename="terminal"
vercel webhooks create https://example.com/webhook --event deployment.created --project prj_abc123
```

*Using the \`vercel webhooks create\` command with the \`--project\` option.*

### Yes

The `--yes` option can be used with the `rm` subcommand to skip the confirmation prompt when removing a webhook.

```bash filename="terminal"
vercel webhooks rm <id> --yes
```

*Using the \`vercel webhooks rm\` command with the \`--yes\` option.*

## Related

- [Setting up webhooks](/docs/webhooks)
- [Webhooks API reference](/docs/webhooks/webhooks-api)


---

[View full sitemap](/docs/sitemap)
