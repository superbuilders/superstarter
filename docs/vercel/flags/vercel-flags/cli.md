---
title: CLI Workflows
product: vercel
url: /docs/flags/vercel-flags/cli
type: conceptual
prerequisites:
  - /docs/flags/vercel-flags
  - /docs/flags
related:
  - /docs/cli/flags
  - /docs/flags/vercel-flags/cli/roll-out-feature
  - /docs/flags/vercel-flags/cli/run-ab-test
  - /docs/flags/vercel-flags/cli/clean-up-after-rollout
  - /docs/flags/vercel-flags/cli/set-up-flags-explorer
summary: Learn about cli workflows on Vercel.
---

# CLI Workflows for Vercel Flags

These workflows show how to compose multiple [Vercel CLI](/docs/cli/flags) commands into complete work sessions. Each workflow walks through a real task from start to finish, including the reasoning between steps.

For a full reference of all `vercel flags` subcommands and options, see the [CLI reference](/docs/cli/flags).

| Workflow                                                                                | Description                                                                                           |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| [Rolling out a new feature](/docs/flags/vercel-flags/cli/roll-out-feature)              | Create a feature flag, wire it into your application, and progressively enable it across environments |
| [Running an A/B test](/docs/flags/vercel-flags/cli/run-ab-test)                         | Set up an A/B test, track results through Web Analytics, and clean up afterward                       |
| [Cleaning up after a full rollout](/docs/flags/vercel-flags/cli/clean-up-after-rollout) | Audit active flags, remove a fully rolled-out flag from code, and archive it                          |
| [Setting up Flags Explorer](/docs/flags/vercel-flags/cli/set-up-flags-explorer)         | Add the Flags Explorer to the Vercel Toolbar so you can override flag values on preview deployments   |

## How these workflows help AI agents

These workflows are designed as composition patterns. Each one shows a complete sequence of CLI commands with the reasoning that connects them. AI coding agents can use these patterns to:

- Learn when to reach for each Vercel CLI command
- Understand the investigation flow for common problems
- Compose commands into multi-step sessions for novel situations
- Follow the same workflow that experienced Vercel users follow


---

[View full sitemap](/docs/sitemap)
