---
title: Markdown access
product: vercel
url: /docs/agent-resources/markdown-access
type: conceptual
prerequisites:
  - /docs/agent-resources
related:
  []
summary: Learn about markdown access on Vercel.
---

# Markdown access

Every page in Vercel's documentation is available as markdown. This makes it straightforward to feed specific documentation pages into AI assistants like Claude, ChatGPT, Cursor, or any other AI tool.

## .md endpoints

Append `.md` to any documentation URL to get the markdown version of that page.

**Example:**

- **HTML:** `https://vercel.com/docs/functions`
- **Markdown:** `https://vercel.com/docs/functions.md`

The markdown version includes features such as: full page content in plain markdown format, metadata for agents, code blocks with syntax highlighting markers, links preserved as markdown links, and tables formatted as markdown tables.

### Using .md endpoints

You can use these endpoints in various ways:

```bash
# Fetch documentation content with curl
curl https://vercel.com/docs/functions.md

# Pipe directly to an AI tool
curl https://vercel.com/docs/functions.md | pbcopy
```

## Copy as Markdown button

Every documentation page includes a "Copy as Markdown" button in the page sidebar. Click this button to copy the entire page content as markdown to your clipboard.

You can also use the Copy section button to copy all pages in a section as markdown to your clipboard. This is particularly useful for sections such as functions, deployments, or Sandbox that have many pages.

This is the fastest way to:

- Copy documentation for a specific topic
- Paste it into your AI assistant's context
- Ask questions about that specific feature

## Feeding documentation to AI assistants

Here are some patterns for using Vercel documentation with AI tools:

### Single page context

When you need help with a specific feature, copy that page's markdown and include it in your prompt:

```text
Here is the Vercel Functions documentation:

[paste markdown content]

Based on this, how do I set up a function with a 60 second timeout?
```

### Multiple page context

For complex tasks, combine multiple relevant pages:

```text
I need to deploy a Next.js app with custom domains. Here is the relevant documentation:

## Deploying
[paste deploying.md]

## Custom Domains
[paste domains.md]

Help me set this up step by step.
```

### Project rules

In tools like Cursor, you can add documentation URLs to your [project rules](https://cursor.com/docs/context/rules) so the AI always has access to relevant Vercel documentation.


---

[View full sitemap](/docs/sitemap)
