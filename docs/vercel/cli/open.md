---
title: vercel open
product: vercel
url: /docs/cli/open
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/cli
  - /docs/cli/project-linking
  - /docs/cli/link
  - /docs/cli/project
summary: Learn how to open your current project in the Vercel Dashboard using the vercel open CLI command.
---

# vercel open

The `vercel open` command opens your current project in the Vercel Dashboard. It automatically opens your default browser to the project's dashboard page, making it easy to access project settings, deployments, and other configuration options.

> **💡 Note:** This command is available in Vercel CLI v48.10.0 and later. If you're using an older version, see [Updating Vercel CLI](/docs/cli#updating-vercel-cli).

This command requires your directory to be [linked to a Vercel project](/docs/cli/project-linking). If you haven't linked your project yet, run [`vercel link`](/docs/cli/link) first.

## Usage

```bash filename="terminal"
vercel open
```

*Using the vercel open command to open the current
project in the Vercel Dashboard.*

## How it works

When you run `vercel open`:

1. The CLI checks if your current directory is linked to a Vercel project
2. It retrieves the project information, including the team slug and project name
3. It constructs the dashboard URL for your project
4. It opens the URL in your default browser

The command opens the project's main dashboard page at `https://vercel.com/{team-slug}/{project-name}`, where you can view deployments, configure settings, and manage your project.

## Examples

### Open the current project

From a linked project directory:

```bash filename="terminal"
vercel open
```

*Opening the current project in the Vercel Dashboard.*

This opens your browser to the project's dashboard page.

## Troubleshooting

### Project not linked

If you see an error that the command requires a linked project:

```bash filename="terminal"
# Link your project first
vercel link

# Then open it
vercel open
```

*Linking your project before opening it in the dashboard.*

Make sure you're in the correct directory where your project files are located.

## Related

- [vercel link](/docs/cli/link)
- [vercel project](/docs/cli/project)
- [Project Linking](/docs/cli/project-linking)


---

[View full sitemap](/docs/sitemap)
