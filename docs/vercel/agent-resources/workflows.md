---
title: CLI Workflows
product: vercel
url: /docs/agent-resources/workflows
type: conceptual
prerequisites:
  - /docs/agent-resources
related:
  - /docs/observability/debug-production-errors
  - /docs/deployments/rollback-production-deployment
  - /docs/functions/debug-slow-functions
  - /docs/projects/deploy-from-cli
summary: Learn about cli workflows on Vercel.
---

# CLI Workflows

These workflows show how to compose multiple Vercel CLI commands into complete work sessions. Each workflow walks through a real task from start to finish, including the reasoning between steps.

Workflows are distributed throughout the docs, colocated with the features they use. This page links to all available workflows.

## Debugging and recovery

| Workflow                                                                                 | Description                                                                              | Entry point   |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------- |
| [Debugging production 500 errors](/docs/observability/debug-production-errors)           | Find, fix, and verify production 500 errors using logs, inspect, and preview deployments | Observability |
| [Rolling back a production deployment](/docs/deployments/rollback-production-deployment) | Recover from a bad production deployment with rollback, investigation, and redeployment  | Deployments   |
| [Debugging slow Vercel Functions](/docs/functions/debug-slow-functions)                  | Diagnose and fix slow functions using timing analysis, logs, and configuration tuning    | Functions     |

## Setup and deployment

| Workflow                                                           | Description                                                                             | Entry point |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------- |
| [Deploying a project from the CLI](/docs/projects/deploy-from-cli) | Set up and deploy a project end-to-end, from linking to production with a custom domain | Projects    |

## How these workflows help AI agents

These workflows are designed as composition patterns. Each one shows a complete sequence of CLI commands with the reasoning that connects them. AI coding agents can use these patterns to:

- Learn when to reach for each Vercel CLI command
- Understand the investigation flow for common problems
- Compose commands into multi-step sessions for novel situations
- Follow the same debugging methodology that experienced Vercel users follow


---

[View full sitemap](/docs/sitemap)
