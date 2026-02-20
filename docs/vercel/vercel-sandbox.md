---
title: Vercel Sandbox
product: vercel
url: /docs/vercel-sandbox
type: conceptual
prerequisites:
  []
related:
  - /docs/vercel-sandbox/sdk-reference
  - /docs/vercel-sandbox/cli-reference
  - /docs/vercel-sandbox/concepts/authentication
  - /docs/vercel-sandbox/system-specifications
  - /docs/vercel-sandbox/concepts
summary: Vercel Sandbox allows you to run arbitrary code in isolated, ephemeral Linux VMs.
---

# Vercel Sandbox

Vercel Sandbox is an ephemeral compute primitive designed to safely run untrusted or user-generated code on Vercel. It supports dynamic, real-time workloads for AI agents, code generation, and developer experimentation.

Use sandboxes to:

- **Execute untrusted code safely**: Run AI agent output, user uploads, or third-party scripts without exposing your production systems.
- **Build interactive tools**: Create code playgrounds, AI-powered UI builders, or developer sandboxes.
- **Test in isolation**: Preview how user-submitted or agent-generated code behaves in a self-contained environment with access to logs, file edits, and live previews.
- **Run development servers**: Spin up and test applications with live previews.

## Using Vercel Sandbox

The [Sandbox SDK](/docs/vercel-sandbox/sdk-reference) is the recommended way to integrate Vercel Sandbox into your applications. It provides a programmatic interface to create sandboxes, run commands, and manage files.

- **[SDK](/docs/vercel-sandbox/sdk-reference)** (recommended): Use `@vercel/sandbox` for TypeScript to automate sandbox workflows in your code
- **[CLI](/docs/vercel-sandbox/cli-reference)**: Use the `sandbox` CLI for manual testing, agentic workflows, debugging, and one-off operations

## Authentication

Vercel Sandbox supports two authentication methods:

- **[Vercel OIDC tokens](/docs/vercel-sandbox/concepts/authentication#vercel-oidc-token-recommended)** (recommended): Vercel generates the OIDC token that it associates with your Vercel project. For local development, run `vercel link` and `vercel env pull` to get a development token. In production on Vercel, authentication is automatic.
- **[Access tokens](/docs/vercel-sandbox/concepts/authentication#access-tokens)**: Use access tokens when `VERCEL_OIDC_TOKEN` is unavailable, such as in external CI/CD systems or non-Vercel environments.

To learn more on each method, see [Authentication](/docs/vercel-sandbox/concepts/authentication) for complete setup instructions.

## System specifications

Sandboxes run on Amazon Linux 2023 with `node24`, `node22`, and `python3.13` runtimes available. The default runtime is `node24`. Each sandbox runs as the `vercel-sandbox` user with `sudo` access and a default working directory of `/vercel/sandbox`.

For detailed information about runtimes, available packages, and sudo configuration, see [System Specifications](/docs/vercel-sandbox/system-specifications).

## Features

- **[Isolation](/docs/vercel-sandbox/concepts#isolation-architecture)**: Each sandbox runs in a secure Firecracker microVM with its own filesystem and network. Run untrusted code without affecting production.
- **[Node.js and Python runtimes](/docs/vercel-sandbox/system-specifications#runtimes)**: Choose from `node24`, `node22`, or `python3.13` with full root access. [Install any package or binary you need](/kb/guide/how-to-install-system-packages-in-vercel-sandbox).
- **[Fast startup](/docs/vercel-sandbox/concepts#how-sandboxes-work)**: Sandboxes start in milliseconds, making them ideal for real-time user interactions and latency-sensitive workloads.
- **[Snapshotting](/docs/vercel-sandbox/concepts/snapshots)**: Save the state of a running sandbox to resume later. Skip dependency installation on subsequent runs.
- **[CLI and SDK](/docs/vercel-sandbox/sdk-reference)**: Manage sandboxes through the CLI or TypeScript/Python SDK. Automate sandbox workflows in your application.

## Resources

**Quickstart**: Create your first sandbox step by step. [Learn more →](/docs/vercel-sandbox/quickstart)

**Working with Sandbox**: Task-oriented guides for common operations. [Learn more →](/docs/vercel-sandbox/working-with-sandbox)

**Concepts**: Understand how sandboxes work under the hood. [Learn more →](/docs/vercel-sandbox/concepts)

**SDK Reference**: Full API documentation for TypeScript and Python. [Learn more →](/docs/vercel-sandbox/sdk-reference)

**CLI Reference**: Manage sandboxes from the command line. [Learn more →](/docs/vercel-sandbox/cli-reference)

**Pricing**: Review costs and resource limits. [Learn more →](/docs/vercel-sandbox/pricing)

**Sandbox Repo**: View the Sandbox repository on GitHub contained the SDK and CLI codebase. [Learn more →](https://github.com/vercel/sandbox)


---

[View full sitemap](/docs/sitemap)
