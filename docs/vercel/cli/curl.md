---
title: vercel curl
product: vercel
url: /docs/cli/curl
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/security/deployment-protection
  - /docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
  - /docs/cli
  - /docs/cli/global-options
  - /docs/cli/deploy
summary: Learn how to make HTTP requests to your Vercel deployments with automatic deployment protection bypass using the vercel curl CLI command.
---

# vercel curl

> **⚠️ Warning:** The `vercel curl` command is currently in beta. Features and behavior may change.

The `vercel curl` command works like `curl`, but automatically handles deployment protection bypass tokens for you. When your project has [Deployment Protection](/docs/security/deployment-protection) enabled, this command lets you test protected deployments without manually managing bypass secrets.

The command runs the system `curl` command with the same arguments you provide, but adds an [`x-vercel-protection-bypass`](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#using-protection-bypass-for-automation) header with a valid token. This makes it simple to test API endpoints, check responses, or debug issues on protected deployments.

> **💡 Note:** This command is available in Vercel CLI v48.8.0 and later. If you're using an older version, see [Updating Vercel CLI](/docs/cli#updating-vercel-cli).

## Usage

```bash filename="terminal"
vercel curl [path]
```

*Using the \`vercel curl\` command to make an HTTP request to a deployment.*

## Examples

### Basic request

Make a GET request to your production deployment:

```bash filename="terminal"
vercel curl /api/hello
```

*Making a GET request to the \`/api/hello\` endpoint on your production deployment.*

### POST request with data

Send a POST request with JSON data:

```bash filename="terminal"
vercel curl /api/users -X POST -H "Content-Type: application/json" -d '{"name":"John"}'
```

*Making a POST request with JSON data to create a new user.*

### Request specific deployment

Test a specific deployment by its URL:

```bash filename="terminal"
vercel curl /api/status --deployment https://my-app-abc123.vercel.app
```

*Making a request to a specific deployment instead of the production
deployment.*

### Verbose output

See detailed request information:

```bash filename="terminal"
vercel curl /api/data -v
```

*Using curl's \`-v\` flag for verbose output, which shows headers and connection details.*

## How it works

When you run `vercel curl`:

1. The CLI finds your linked project (or you can specify one with [`--scope`](/docs/cli/global-options#scope))
2. It gets the latest production deployment URL (or uses the deployment you specified)
3. It retrieves or generates a deployment protection bypass token
4. It runs the system `curl` command with the bypass token in the `x-vercel-protection-bypass` header

The command requires `curl` to be installed on your system.

## Unique options

These are options that only apply to the `vercel curl` command.

### Deployment

The `--deployment` option, shorthand `-d`, lets you specify a deployment URL to request instead of using the production deployment.

```bash filename="terminal"
vercel curl /api/hello --deployment https://my-app-abc123.vercel.app
```

*Using the \`--deployment\` option to target a specific deployment.*

### Protection Bypass

The `--protection-bypass` option, shorthand `-b`, lets you provide your own deployment protection bypass secret instead of automatically generating one. This is useful when you already have a bypass secret configured.

```bash filename="terminal"
vercel curl /api/hello --protection-bypass your-secret-here
```

*Using the \`--protection-bypass\` option with a manual secret.*

You can also use the [`VERCEL_AUTOMATION_BYPASS_SECRET`](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation#using-protection-bypass-for-automation) environment variable:

```bash filename="terminal"
export VERCEL_AUTOMATION_BYPASS_SECRET=your-secret-here
vercel curl /api/hello
```

*Setting the bypass secret as an environment variable.*

## Troubleshooting

### curl command not found

Make sure `curl` is installed on your system:

```bash filename="terminal"
# macOS (using Homebrew)
brew install curl

# Ubuntu/Debian
sudo apt-get install curl

# Windows (using Chocolatey)
choco install curl
```

*Installing curl on different operating systems.*

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
- [vercel deploy](/docs/cli/deploy)
- [vercel inspect](/docs/cli/inspect)


---

[View full sitemap](/docs/sitemap)
