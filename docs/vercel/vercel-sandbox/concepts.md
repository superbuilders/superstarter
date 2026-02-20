---
title: Understanding Sandboxes
product: vercel
url: /docs/vercel-sandbox/concepts
type: conceptual
prerequisites:
  - /docs/vercel-sandbox
related:
  - /docs/vercel-sandbox/cli-reference
  - /docs/vercel-sandbox/sdk-reference
  - /docs/vercel-sandbox/concepts/snapshots
  - /docs/vercel-sandbox/concepts/firewall
  - /docs/vercel-sandbox/quickstart
summary: Learn how Vercel Sandboxes provide on-demand, isolated compute environments for running untrusted code, testing applications, and executing...
---

# Understanding Sandboxes

Vercel Sandboxes provide on-demand, isolated compute environments for running untrusted code, testing applications, executing AI-generated scripts, and more. Sandboxes are **temporary by design**.

## What is a sandbox?

A sandbox is a short-lived, isolated Linux environment that you create programmatically with the SDK or CLI. Think of it as a secure virtual machine that:

- Starts from a clean state (or snapshot) every time
- Uses Amazon Linux 2023 as the base image
- Has network access for installing packages and making API calls
- Automatically terminates after a configurable timeout
- Provides full root access to install any package or binary

Each sandbox includes configurable isolation:

- **Filesystem access**: A dedicated private filesystem that is destroyed when the sandbox stops.
- **Process isolation**: Kernel-level isolation ensures code cannot see or access processes in other sandboxes.
- **Network isolation**: Each sandbox has its own network namespace with controlled outbound access.

## Sandboxes vs containers

Unlike Docker containers, each sandbox runs in its own [Firecracker](https://firecracker-microvm.github.io/) microVM with a dedicated kernel. This provides stronger isolation than container-based solutions, which makes sandboxes ideal for running untrusted code.

| Aspect           | Docker containers                                         | Vercel Sandboxes                                               |
| :--------------- | :-------------------------------------------------------- | :------------------------------------------------------------- |
| **Isolation**    | Shares host kernel; relies on namespaces and cgroups      | Dedicated kernel per sandbox; full VM isolation                |
| **Security**     | Suitable for trusted code; container escapes are possible | Designed for untrusted code; microVM boundary prevents escapes |
| **Startup time** | Sub-second                                                | Milliseconds (Firecracker optimized for fast boot)             |
| **Use case**     | Packaging and deploying applications                      | Running arbitrary, untrusted code safely                       |

If you already use Docker images to define your environment, you can replicate that setup in a sandbox by installing the same packages using [`dnf` and your language's package manager](/kb/guide/how-to-install-system-packages-in-vercel-sandbox), or by taking a snapshot after initial setup.

## How sandboxes work

When you call `Sandbox.create()`, Vercel provisions a Firecracker microVM on its infrastructure. This microVM boots an Amazon Linux 2023 image with your specified runtime (Node.js or Python) pre-installed.

The sandbox runs on Vercel's global infrastructure, so you don't need to manage servers, scale capacity, or worry about availability. Sandboxes automatically provision in `iad1` region.

Here's what happens during the lifecycle:

1. **Provisioning**: Vercel allocates compute resources and boots the microVM. Resuming from a snapshot is even faster than starting a fresh sandbox.
2. **Running**: Your code executes inside the isolated environment. You can run commands, install packages, start servers, and interact with the filesystem.
3. **Stopping**: When the timeout expires or you call `stop()`, the microVM shuts down. All data in the filesystem is destroyed unless you took a snapshot.

Since sandboxes are stateless and ephemeral, they're ideal for workloads where you don't need data to persist between runs. For persistent storage, write data to external services like databases or object storage before the sandbox stops.

## Sandbox lifecycle

### Creating a sandbox

When you're ready to use a sandbox, you can either create a new one from scratch or use a saved snapshot of a sandbox you created previously. Using a snapshot is much faster than creating from scratch because it avoids reinstalling dependencies and repeating setup steps.

Think of it like the difference between booting a fresh OS install versus resuming from a saved state. A new sandbox gives you a clean slate; a snapshot gives you a pre-configured environment ready to go.

To create a sandbox, you can use the [CLI](/docs/vercel-sandbox/cli-reference) or the [SDK](/docs/vercel-sandbox/sdk-reference):

### Running commands

Once created, you can run commands inside the sandbox. Commands can run in blocking mode (wait for completion) or detached mode (return immediately).

### Stopping a sandbox

Sandboxes automatically stop after a timeout. The default timeout is 5 minutes.

Alternatively, you can stop them manually:

You can also stop sandboxes from the Vercel Dashboard by navigating to **Observability > Sandboxes** and clicking **Stop Sandbox**.

### Taking snapshots

Snapshots save the current state of a sandbox, including all installed packages and files. Use snapshots to skip setup time on subsequent runs, checkpoint long-running tasks, or share environments with teammates.

See [Snapshots](/docs/vercel-sandbox/concepts/snapshots) for complete documentation on creating, retrieving, and managing snapshots.

## Common use cases

Vercel Sandboxes are ideal for features that require secure, on-demand code execution:

| Pattern                         | Why use sandboxes?                                                              | Example                                                                          |
| :------------------------------ | :------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- |
| **AI code interpreter**         | LLM-generated code can be unpredictable. Sandboxes ensure it runs in isolation. | An AI assistant that solves math problems by writing and running Python scripts. |
| **Clean test environments**     | Start fresh for every test run to avoid "works on my machine" issues.           | Running unit tests against a clean OS for every commit.                          |
| **Reproducible infrastructure** | Share identical snapshots of environments across teams.                         | A QA team spinning up an exact replica of a customer's environment.              |
| **Temporary debugging**         | Spin up a throwaway environment to inspect issues without risk.                 | Investigating a production issue by replicating the environment.                 |

### When not to use sandboxes

Sandboxes are ephemeral by design. They are **not** suitable for:

- **Permanent hosting**: If you need a server that stays up 24/7, use a traditional VM or Vercel Functions.
- **Persistent data**: Data in a sandbox is lost when it stops unless you [take a snapshot](/docs/vercel-sandbox/concepts/snapshots). Use external databases or storage for long-term persistence.

## Security model

Vercel Sandboxes are designed for running untrusted code safely.

### Isolation architecture

Sandboxes use [Firecracker](https://firecracker-microvm.github.io/) microVMs to provide strict isolation. Each sandbox runs in its own lightweight virtual machine with a dedicated kernel, ensuring that code in one sandbox cannot access or interfere with others or the underlying host system.

### Resource limits

Every sandbox comes with:

- A dedicated private filesystem
- Network namespace isolation
- Kernel-level process isolation
- Strict CPU, memory, and disk limits
- Automatic timeouts to prevent runaway processes

These limits prevent resource exhaustion and ensure fair usage across all sandboxes.

### Network access

Sandboxes can make outbound HTTP requests by default, so you can install packages from public registries like npm or PyPI. Exposed ports are accessible via a public URL, so be mindful of what services you run.

Internet access from the sandbox can be restricted through network policies defined by the users, as part of the [sandbox firewall](/docs/vercel-sandbox/concepts/firewall).

### Data privacy

Sandboxes run on Vercel's secure infrastructure, which maintains SOC 2 Type II certification. Since sandboxes are ephemeral, they do not persist data long-term. For specific data residency requirements, consult your plan details or compliance team.

## Next steps

- [Quickstart](/docs/vercel-sandbox/quickstart): Run your first sandbox.
- [Working with Sandbox](/docs/vercel-sandbox/working-with-sandbox): Task-oriented guides for common operations.
- [Authentication](/docs/vercel-sandbox/concepts/authentication): Configure SDK authentication.
- [Snapshots](/docs/vercel-sandbox/concepts/snapshots): Save and restore sandbox state.
- [SDK Reference](/docs/vercel-sandbox/sdk-reference): Full API documentation.
- [CLI Reference](/docs/vercel-sandbox/cli-reference): Manage sandboxes from the terminal.
- [Examples](/docs/vercel-sandbox/working-with-sandbox#examples): Real-world use cases and code samples.


---

[View full sitemap](/docs/sitemap)
