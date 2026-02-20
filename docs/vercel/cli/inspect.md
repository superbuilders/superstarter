---
title: vercel inspect
product: vercel
url: /docs/cli/inspect
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to retrieve information about your Vercel deployments using the vercel inspect CLI command.
---

# vercel inspect

The `vercel inspect` command is used to retrieve information about a deployment referenced either by its deployment URL or ID.

You can use this command to view either a deployment's information or its [build logs](/docs/cli/inspect#logs).

## Usage

```bash filename="terminal"
vercel inspect [deployment-id or url]
```

*Using the vercel inspect command to retrieve
information about a specific deployment.*

## Unique Options

These are options that only apply to the `vercel inspect` command.

### Timeout

The `--timeout` option sets the time to wait for deployment completion. It defaults to 3 minutes.

Any valid time string for the [ms](https://www.npmjs.com/package/ms) package can be used.

```bash filename="terminal"
vercel inspect https://example-app-6vd6bhoqt.vercel.app --timeout=5m
```

*Using the vercel inspect command with the
\--timeout option.*

### Wait

The `--wait` option will block the CLI until the specified deployment has completed.

```bash filename="terminal"
vercel inspect https://example-app-6vd6bhoqt.vercel.app --wait
```

*Using the vercel inspect command with the
\--wait option.*

### Logs

The `--logs` option, shorthand `-l`, prints the build logs instead of the deployment information.

```bash filename="terminal"
vercel inspect https://example-app-6vd6bhoqt.vercel.app --logs
```

*Using the vercel inspect command with the
\--logs option, to view available build logs.*

If the deployment is queued or canceled, there will be no logs to display.

If the deployment is building, you may want to specify `--wait` option. The command will wait for build completion, and will display build logs as they are emitted.

```bash filename="terminal"
vercel inspect https://example-app-6vd6bhoqt.vercel.app --logs --wait
```

*Using the vercel inspect command with the
\--logs and --wait options,
to view all build logs until the deployement is ready.*


---

[View full sitemap](/docs/sitemap)
