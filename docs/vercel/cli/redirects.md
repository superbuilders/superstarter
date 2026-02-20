---
title: vercel redirects
product: vercel
url: /docs/cli/redirects
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to manage project-level redirects using the vercel redirects CLI command.
---

# vercel redirects

The `vercel redirects` command lets you manage redirects for a project. Redirects managed at the project level apply to all deployments and environments and take effect immediately after being created and promoted to production.

> **💡 Note:** Redirects can also be defined and managed in source control using
> `vercel.json`. Project-level redirects are updated without a need for a new
> deployment.

## Usage

```bash filename="terminal"
vercel redirects list
```

*Using the vercel redirects command to list all
redirects for the current project.*

## Commands

The `vercel redirects` command includes several subcommands for managing redirects:

### `list`

List all redirects for the current project. These redirects apply to all deployments and environments.

```bash filename="terminal"
vercel redirects list [options]
```

**Options:**

- `--page <NUMBER>`: Page number to display
- `--per-page <NUMBER>`: Number of redirects per page (default: 50)
- `-s, --search <QUERY>`: Search for redirects by source or destination
- `--staged`: List redirects from the staging version
- `--version <VERSION_ID>`: List redirects from a specific version ID

**Examples:**

```bash filename="terminal"
# List all redirects
vercel redirects list

# Search for redirects
vercel redirects list --search "/old-path"

# List redirects on page 2
vercel redirects list --page 2

# List redirects with custom page size
vercel redirects list --per-page 25

# List redirects from staging version
vercel redirects list --staged

# List redirects from a specific version
vercel redirects list --version ver_abc123
```

### `list-versions`

List all versions of redirects for the current project.

```bash filename="terminal"
vercel redirects list-versions
```

*View the history of all redirect versions for your project.*

### `add`

Add a new redirect to your project.

```bash filename="terminal"
vercel redirects add [source] [destination] [options]
```

**Options:**

- `--case-sensitive`: Make the redirect case sensitive
- `--name <NAME>`: Version name for this redirect (max 256 characters)
- `--preserve-query-params`: Preserve query parameters when redirecting
- `--status <CODE>`: HTTP status code (301, 302, 307, or 308)
- `-y, --yes`: Skip prompts and use default values

**Examples:**

```bash filename="terminal"
# Add a new redirect interactively
vercel redirects add

# Add a new redirect with arguments
vercel redirects add /old-path /new-path

# Add a redirect with all options
vercel redirects add /old-path /new-path --status 301 --case-sensitive --preserve-query-params --name "My redirect"

# Add a redirect non-interactively
vercel redirects add /old-path /new-path --yes
```

### `upload`

Upload redirects from a CSV or JSON file.

```bash filename="terminal"
vercel redirects upload file [options]
```

**Options:**

- `--overwrite`: Replace all existing redirects
- `-y, --yes`: Skip confirmation prompt

**Examples:**

```bash filename="terminal"
# Upload redirects from CSV file
vercel redirects upload redirects.csv

# Upload redirects from JSON file
vercel redirects upload redirects.json

# Upload and overwrite existing redirects
vercel redirects upload redirects.csv --overwrite

# Upload without confirmation
vercel redirects upload redirects.csv --yes
```

#### File Formats

**CSV Format:**

```csv filename="redirects.csv"
source,destination,status,caseSensitive,preserveQueryParams
/old-path,/new-path,301,false,true
/legacy/*,/modern/:splat,308,false,false
/old-blog,/blog,302,false,false
```

**JSON Format:**

```json filename="redirects.json"
[
  {
    "source": "/old-path",
    "destination": "/new-path",
    "status": 301,
    "caseSensitive": false,
    "preserveQueryParams": true
  },
  {
    "source": "/legacy/*",
    "destination": "/modern/:splat",
    "status": 308,
    "caseSensitive": false,
    "preserveQueryParams": false
  }
]
```

### `remove`

Remove a redirect from your project.

```bash filename="terminal"
vercel redirects remove source [options]
```

**Options:**

- `-y, --yes`: Skip the confirmation prompt when removing a redirect

**Example:**

```bash filename="terminal"
# Remove a redirect
vercel redirects remove /old-path
```

### `promote`

Promote a staged redirects version to production.

```bash filename="terminal"
vercel redirects promote version-id [options]
```

**Options:**

- `-y, --yes`: Skip the confirmation prompt when promoting

**Example:**

```bash filename="terminal"
# Promote a redirect version
vercel redirects promote <version-id>
```

### `restore`

Restore a previous redirects version.

```bash filename="terminal"
vercel redirects restore version-id [options]
```

**Options:**

- `-y, --yes`: Skip the confirmation prompt when restoring

**Example:**

```bash filename="terminal"
# Restore a redirects version
vercel redirects restore <version-id>
```


---

[View full sitemap](/docs/sitemap)
