---
title: vercel mcp
product: vercel
url: /docs/cli/mcp
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Set up Model Context Protocol (MCP) usage with a Vercel project using the vercel mcp CLI command.
---

# vercel mcp

The `vercel mcp` command helps you set up an MCP client to talk to MCP servers you deploy on Vercel. It links your local MCP client configuration to a Vercel Project and generates the connection details so agents and tools can call your MCP endpoints securely.

## Usage

```bash filename="terminal"
vercel mcp [options]
```

*Using the vercel mcp command to initialize local MCP
configuration for the currently linked Project.*

## Examples

### Initialize global MCP configuration

```bash filename="terminal"
vercel mcp
```

*Initializes global MCP client configuration for your Vercel account.*

### Initialize project-specific MCP access

```bash filename="terminal"
vercel mcp --project
```

*Sets up project-specific MCP access for the currently linked Vercel Project.*

## Unique options

These are options that only apply to the `vercel mcp` command.

### Project

The `--project` option sets up project-specific MCP access for the currently linked project instead of global configuration.

```bash filename="terminal"
vercel mcp --project
```

*Use the --project flag to configure MCP access scoped to your linked project.*


---

[View full sitemap](/docs/sitemap)
