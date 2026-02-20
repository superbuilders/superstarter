---
title: vercel httpstat
product: vercel
url: /docs/cli/httpstat
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/security/deployment-protection
  - /docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
  - /docs/cli
  - /docs/cli/global-options
  - /docs/cli/curl
summary: Learn how to visualize HTTP request timing statistics for your Vercel deployments using the vercel httpstat CLI command.
---

# vercel httpstat

> **⚠️ Warning:** The `vercel httpstat` command is currently in beta. Features and behavior may change.

The `vercel httpstat` command works like `httpstat`, but automatically handles deployment protection bypass tokens for you. It provides visualization of HTTP timing statistics, showing how long each phase of an HTTP request takes. When your project has [Deployment Protection](/docs/security/deployment-protection) enabled, this command lets you test protected deployments without manually managing bypass secrets.

The command runs the `httpstat` tool with the same arguments you provide, but adds an [`x-vercel-protection-bypass`](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#using-protection-bypass-for-automation) header with a valid token. This makes it simple to measure response times, analyze performance bottlenecks, or debug latency issues on protected deployments.

> **💡 Note:** This command is available in Vercel CLI v48.9.0 and later. If you're using an older version, see [Updating Vercel CLI](/docs/cli#updating-vercel-cli).

## Usage

```bash filename="terminal"
vercel httpstat [path]
```

*Using the \`vercel httpstat\` command to visualize HTTP timing statistics for a deployment.*

## Examples

### Basic timing analysis

Get timing statistics for your production deployment:

```bash filename="terminal"
vercel httpstat /api/hello
```

*Getting timing statistics for the \`/api/hello\` endpoint on your production deployment.*

### POST request timing

Analyze timing for a POST request with JSON data:

```bash filename="terminal"
vercel httpstat /api/users -X POST -H "Content-Type: application/json" -d '{"name":"John"}'
```

*Measuring timing statistics for a POST request that creates a new user.*

### Specific deployment timing

Test timing for a specific deployment by its URL:

```bash filename="terminal"
vercel httpstat /api/status --deployment https://my-app-abc123.vercel.app
```

*Analyzing timing for a specific deployment instead of the production
deployment.*

### Multiple requests

Run multiple requests to get average timing statistics:

```bash filename="terminal"
vercel httpstat /api/data -n 10
```

*Running 10 requests to get more reliable timing data.*

## How it works

When you run `vercel httpstat`:

1. The CLI finds your linked project (or you can specify one with [`--scope`](/docs/cli/global-options#scope))
2. It gets the latest production deployment URL (or uses the deployment you specified)
3. It retrieves or generates a deployment protection bypass token
4. It runs the `httpstat` tool with the bypass token in the `x-vercel-protection-bypass` header
5. The tool displays a visual breakdown of request timing phases: DNS lookup, TCP connection, TLS handshake, server processing, and content transfer

The command requires `httpstat` to be installed on your system.

## Unique options

These are options that only apply to the `vercel httpstat` command.

### Deployment

The `--deployment` option, shorthand `-d`, lets you specify a deployment URL to request instead of using the production deployment.

```bash filename="terminal"
vercel httpstat /api/hello --deployment https://my-app-abc123.vercel.app
```

*Using the \`--deployment\` option to target a specific deployment.*

### Protection Bypass

The `--protection-bypass` option, shorthand `-b`, lets you provide your own deployment protection bypass secret instead of automatically generating one. This is useful when you already have a bypass secret configured.

```bash filename="terminal"
vercel httpstat /api/hello --protection-bypass your-secret-here
```

*Using the \`--protection-bypass\` option with a manual secret.*

You can also use the [`VERCEL_AUTOMATION_BYPASS_SECRET`](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#using-protection-bypass-for-automation) environment variable:

```bash filename="terminal"
export VERCEL_AUTOMATION_BYPASS_SECRET=your-secret-here
vercel httpstat /api/hello
```

*Setting the bypass secret as an environment variable.*

## Understanding the output

The `httpstat` tool displays timing information in a visual format:

- **DNS Lookup**: Time to resolve the domain name
- **TCP Connection**: Time to establish a TCP connection
- **TLS Handshake**: Time to complete the SSL/TLS handshake (for HTTPS)
- **Server Processing**: Time for the server to generate the response
- **Content Transfer**: Time to download the response body

Each phase is color-coded and displayed with its duration in milliseconds, helping you identify which part of the request is taking the most time.

## Troubleshooting

### httpstat command not found

Make sure `httpstat` is installed on your system:

```bash filename="terminal"
# Install with pip (Python)
pip install httpstat

# Or install with Homebrew (macOS)
brew install httpstat
```

*Installing httpstat on different systems.*

### No deployment found for the project

Make sure you're in a directory with a linked Vercel project and that the project has at least one deployment:

```bash filename="terminal"
# Link your project
vercel link

# Deploy your project
vercel deploy
```

*Linking your project and creating a deployment.*

### Failed to get deployment protection bypass token

If automatic token creation fails, you can create a bypass secret manually in the Vercel Dashboard:

1. Go to your project's **Settings** → **Deployment Protection**
2. Find "Protection Bypass for Automation"
3. Click "Create" or "Generate" to create a new secret
4. Copy the generated secret
5. Use it with the `--protection-bypass` flag or [`VERCEL_AUTOMATION_BYPASS_SECRET`](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#using-protection-bypass-for-automation) environment variable

### No deployment found for ID

When using `--deployment`, verify that:

- The deployment ID or URL is correct
- The deployment belongs to your linked project
- The deployment hasn't been deleted

## Related

- [Deployment Protection](/docs/security/deployment-protection)
- [vercel curl](/docs/cli/curl)
- [vercel deploy](/docs/cli/deploy)
- [vercel inspect](/docs/cli/inspect)


---

[View full sitemap](/docs/sitemap)
