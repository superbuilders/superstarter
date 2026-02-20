---
title: vercel integration-resource
product: vercel
url: /docs/cli/integration-resource
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/integrations/create-integration
summary: Learn how to perform native integration product resources tasks using the vercel integration-resource CLI command.
---

# vercel integration-resource

The `vercel integration-resource` command (alias: `vercel ir`) needs to be used with one of the following actions:

- `vercel integration-resource remove`
- `vercel integration-resource disconnect`

For the `resource-name` in all the commands below, use the [URL slug](/docs/integrations/create-integration#create-product-form-details) value of the product for this installed resource.

## vercel integration-resource remove

The `vercel integration-resource remove` command (alias: `rm`) deletes an integration resource permanently.

```bash filename="terminal"
vercel integration-resource remove [resource-name]
```

*Using the \`vercel integration-resource remove\` command to delete a resource.*

**Options:**

| Option             | Shorthand | Description                             |
| ------------------ | --------- | --------------------------------------- |
| `--disconnect-all` | `-a`      | Disconnect all projects before deletion |
| `--yes`            | `-y`      | Skip the confirmation prompt            |

**Examples:**

```bash filename="terminal"
# Remove a resource
vercel integration-resource remove my-database

# Remove with alias
vercel ir rm my-cache

# Disconnect all projects and remove
vercel ir remove my-database --disconnect-all

# Remove without confirmation
vercel ir rm my-cache -a -y
```

## vercel integration-resource disconnect

The `vercel integration-resource disconnect` command disconnects a resource from a project or from all projects.

```bash filename="terminal"
vercel integration-resource disconnect [resource-name] [project-name]
```

*Using the \`vercel integration-resource disconnect\` command to disconnect a
resource from a project.*

**Arguments:**

| Argument      | Required | Description                                                 |
| ------------- | -------- | ----------------------------------------------------------- |
| resource-name | Yes      | Name or ID of the resource to disconnect                    |
| project-name  | No       | Project to disconnect from (uses linked project if omitted) |

**Options:**

| Option  | Shorthand | Description                               |
| ------- | --------- | ----------------------------------------- |
| `--all` | `-a`      | Disconnect all projects from the resource |
| `--yes` | `-y`      | Skip the confirmation prompt              |

**Examples:**

```bash filename="terminal"
# Disconnect from linked project
vercel integration-resource disconnect my-database

# Using alias
vercel ir disconnect my-redis-cache

# Disconnect from a specific project
vercel ir disconnect my-database my-project

# Disconnect all projects from the resource
vercel ir disconnect my-database --all

# Disconnect all without confirmation
vercel ir disconnect my-database -a -y
```


---

[View full sitemap](/docs/sitemap)
