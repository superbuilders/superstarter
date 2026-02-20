---
title: vercel logs
product: vercel
url: /docs/cli/logs
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: View and filter request logs for your Vercel project, or stream live runtime logs from a deployment.
---

# vercel logs

The `vercel logs` command displays request logs for your project or streams live runtime logs from a specific deployment.

By default, running `vercel logs` shows request logs from the last 24 hours for the linked project and branch. You can filter logs by environment, log level, status code, source, and more.

To stream live logs, use the `--follow` flag. Live streaming continues for up to 5 minutes unless interrupted.

You can find more detailed logs on the [Logs](/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Flogs\&title=Open+Logs) page in the Vercel Dashboard.

## Usage

```bash filename="terminal"
# Display recent request logs for the linked project
vercel logs

# Stream live logs for the current git branch
vercel logs --follow

# Filter logs by level and time range
vercel logs --level error --since 1h
```

*Using the \`vercel logs\` command to view request logs or stream runtime logs.*

## Unique options

These options only apply to the `vercel logs` command.

### Project

The `--project` option, shorthand `-p`, specifies the project ID or name. Defaults to the linked project.

```bash filename="terminal"
vercel logs --project my-app
```

### Deployment

The `--deployment` option, shorthand `-d`, specifies a deployment ID or URL to filter logs.

```bash filename="terminal"
vercel logs --deployment dpl_xxxxx
```

### Follow

The `--follow` option, shorthand `-f`, streams live runtime logs instead of showing request logs.

When using `--follow`, the command finds the latest deployment for your current git branch. You can combine it with `--deployment` to stream logs for a specific deployment.

```bash filename="terminal"
# Stream logs for the current branch's latest deployment
vercel logs --follow

# Stream logs for a specific deployment
vercel logs --follow --deployment dpl_xxxxx
```

Use `--no-follow` to disable auto-following when a deployment ID or URL is given as the first argument.

### JSON

The `--json` option, shorthand `-j`, outputs logs in JSON Lines format. This makes it easier to pipe the output to other command-line tools such as [jq](https://jqlang.github.io/jq/).

```bash filename="terminal"
vercel logs --json | jq 'select(.level == "error")'
```

### Expand

The `--expand` option, shorthand `-x`, displays the full log message below each request line instead of truncating it.

```bash filename="terminal"
vercel logs --expand
```

### Limit

The `--limit` option, shorthand `-n`, specifies the maximum number of log entries to return. The default is 100.

```bash filename="terminal"
vercel logs --limit 50
```

### Environment

The `--environment` option filters logs by deployment environment. Valid values are `production` and `preview`.

```bash filename="terminal"
vercel logs --environment production
```

### Level

The `--level` option filters logs by log level. You can specify multiple levels. Valid values are `error`, `warning`, `info`, and `fatal`.

```bash filename="terminal"
vercel logs --level error --level warning
```

### Status-code

The `--status-code` option filters logs by HTTP status code. You can use specific codes or wildcards like `4xx` or `5xx`.

```bash filename="terminal"
vercel logs --status-code 500
vercel logs --status-code 5xx
```

### Source

The `--source` option filters logs by request source. You can specify multiple sources. Valid values are `serverless`, `edge-function`, `edge-middleware`, and `static`.

```bash filename="terminal"
vercel logs --source edge-function --source serverless
```

### Query

The `--query` option, shorthand `-q`, performs a full-text search across log messages.

```bash filename="terminal"
vercel logs --query "timeout"
```

### Request-id

The `--request-id` option filters logs by a specific request ID.

```bash filename="terminal"
vercel logs --request-id req_xxxxx
```

### Since

The `--since` option returns logs from after a specific time. You can use ISO 8601 format or relative values like `1h` or `30m`. The default is 24 hours ago.

```bash filename="terminal"
vercel logs --since 1h
vercel logs --since 2026-01-15T10:00:00Z
```

### Until

The `--until` option returns logs up until a specific time. You can use ISO 8601 format or relative values. The default is now.

```bash filename="terminal"
vercel logs --since 2h --until 1h
```

### Branch

The `--branch` option, shorthand `-b`, filters logs by git branch. By default, the command detects your current git branch and filters to matching deployments.

```bash filename="terminal"
vercel logs --branch feature-x
```

Use `--no-branch` to disable automatic git branch detection and show logs from all branches.

## Examples

Display error logs from the last hour:

```bash filename="terminal"
vercel logs --level error --since 1h
```

Display production logs with 500 errors and output as JSON:

```bash filename="terminal"
vercel logs --environment production --status-code 500 --json
```

Search logs and pipe to jq:

```bash filename="terminal"
vercel logs --query "timeout" --json | jq '.message'
```

Display logs with full message details:

```bash filename="terminal"
vercel logs --expand --limit 20
```


---

[View full sitemap](/docs/sitemap)
