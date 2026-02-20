---
title: vercel integration
product: vercel
url: /docs/cli/integration
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/integrations/create-integration/submit-integration
  - /docs/cli/integration-resource
summary: Learn how to perform key integration tasks using the vercel integration CLI command.
---

# vercel integration

The `vercel integration` command needs to be used with one of the following actions:

- `vercel integration add`
- `vercel integration open`
- `vercel integration list`
- `vercel integration remove`

For the `integration-name` in all the commands below, use the [URL slug](/docs/integrations/create-integration/submit-integration#url-slug) value of the integration.

## vercel integration add

The `vercel integration add` command initializes the setup wizard for creating an integration resource.
This command is used when you want to add a new resource from one of your installed integrations.
This functionality is the same as `vercel install [integration-name]`.

> **💡 Note:** If you have not installed the integration for the resource or accepted the
> terms & conditions of the integration through the web UI, this command will
> open your browser to the Vercel dashboard and start the installation flow for
> that integration.

```bash filename="terminal"
vercel integration add [integration-name]
```

*Using the \`vercel integration add\` command to create a new integration
resource*

## vercel integration open

The `vercel integration open` command opens a deep link into the provider's dashboard for a specific integration. It's useful when you need quick access to the provider's resources from your development environment.

```bash filename="terminal"
vercel integration open [integration-name]
```

*Using the \`vercel integration open\` command to open the provider's dashboard*

## vercel integration list

The `vercel integration list` command displays a list of all installed resources with their associated integrations for the current team or project. It's useful for getting an overview of what integrations are set up in the current scope of your development environment.

```bash filename="terminal"
vercel integration list
```

*Using the \`vercel integration list\` command to list the integration resources.*

The output shows the name, status, product, and integration for each installed resource.

**Options:**

| Option          | Shorthand | Description                                |
| --------------- | --------- | ------------------------------------------ |
| `--integration` | `-i`      | Filter resources to a specific integration |
| `--all`         | `-a`      | List all resources regardless of project   |

**Examples:**

```bash filename="terminal"
# List all resources for the current project
vercel integration list

# Filter resources to a specific integration
vercel integration list --integration neon
vercel integration list -i upstash

# List all resources across all projects in the team
vercel integration list --all
vercel integration list -a
```

## vercel integration remove

The `vercel integration remove` command uninstalls the specified integration from your Vercel account. It's useful in automation workflows.

```bash filename="terminal"
vercel integration remove [integration-name]
```

*Using the \`vercel integration remove\` command to uninstall an integration*

> **💡 Note:** You are required to [remove all installed
> resources](/docs/cli/integration-resource#vercel-integration-resource-remove)
> from this integration before using this command.


---

[View full sitemap](/docs/sitemap)
