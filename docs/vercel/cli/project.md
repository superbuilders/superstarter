---
title: vercel project
product: vercel
url: /docs/cli/project
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to list, add, remove, and manage your Vercel Projects using the vercel project CLI command.
---

# vercel project

The `vercel project` command is used to manage your Vercel Projects, providing functionality to list, add, inspect, and remove.

## Usage

```bash filename="terminal"
vercel project ls

# Output as JSON
vercel project ls --json
```

*Using the vercel project command to list all Vercel
Project.*

```bash filename="terminal"
vercel project ls --update-required

# Output as JSON
vercel project ls --update-required --json
```

*Using the vercel project command to list all Vercel
Project that are affected by an upcoming Node.js runtime deprecation.*

```bash filename="terminal"
vercel project add
```

*Using the vercel project command to create a new
Vercel Project.*

```bash filename="terminal"
vercel project inspect
```

*Using the vercel project inspect command to display
information about the linked project.*

```bash filename="terminal"
vercel project inspect my-project
```

*Using the vercel project inspect command to display
information about a specific project by name.*

```bash filename="terminal"
vercel project rm
```

*Using the vercel project command to remove a Vercel
Project.*


---

[View full sitemap](/docs/sitemap)
