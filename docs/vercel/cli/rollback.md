---
title: vercel rollback
product: vercel
url: /docs/cli/rollback
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/instant-rollback
  - /docs/cli/promote
summary: Learn how to roll back your production deployments to previous deployments using the vercel rollback CLI command.
---

# vercel rollback

The `vercel rollback` command is used to [roll back production deployments](/docs/instant-rollback) to previous deployments.

## Usage

```bash filename="terminal"
vercel rollback [deployment-id or url]
```

*Using vercel rollback rolls back to a previous
deployment.*

> **💡 Note:** On the hobby plan, you can only [roll
> back](/docs/instant-rollback#who-can-roll-back-deployments) to the previous
> production deployment. If you attempt to pass in a deployment id or url from
> an earlier deployment, you will be given an error:.

## Commands

### `status`

Show the status of any current pending rollbacks.

```bash filename="terminal"
vercel rollback status [project]
```

*Using vercel rollback status to check the status of
pending rollbacks.*

**Examples:**

```bash filename="terminal"
# Check status for the linked project
vercel rollback status

# Check status for a specific project
vercel rollback status my-project

# Check status with a custom timeout
vercel rollback status --timeout 30s
```

## Unique Options

These are options that only apply to the `vercel rollback` command.

### Timeout

The `--timeout` option is the time that the `vercel rollback` command will wait for the rollback to complete. It does not affect the actual rollback which will continue to proceed.

When rolling back a deployment, a timeout of `0` will immediately exit after requesting the rollback.

```bash filename="terminal"
vercel rollback https://example-app-6vd6bhoqt.vercel.app
```

*Using the vercel rollback command to the
https://example-app-6vd6bhoqt.vercel.app deployment.*

## Undo a rollback

To undo a rollback, promote a deployment using [`vercel promote`](/docs/cli/promote):

```bash filename="terminal"
vercel promote [deployment-id or url]
```

This promotes the specified deployment to production and re-enables auto-assignment of production domains. For more details, see [Undo a rollback](/docs/instant-rollback#undo-a-rollback).


---

[View full sitemap](/docs/sitemap)
