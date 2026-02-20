---
title: Vercel Agent
product: vercel
url: /docs/agent
type: integration
prerequisites:
  []
related:
  - /docs/agent/pr-review
  - /docs/agent/investigation
  - /docs/analytics
  - /docs/speed-insights
  - /docs/agent/installation
summary: AI-powered development tools that speed up your workflow and help resolve issues faster
---

# Vercel Agent

> **🔒 Permissions Required**: Vercel Agent

Vercel Agent is a suite of AI-powered development tools built to speed up your workflow. Instead of spending hours debugging production issues or waiting for code reviews, Agent helps you catch problems faster and resolve incidents quickly.

Agent works because it already understands your application. Vercel builds your code, deploys your functions, and serves your traffic. Agent uses this deep context about your codebase, deployment history, and runtime behavior to provide intelligent assistance right where you need it.

Everything runs on [Vercel's AI Cloud](https://vercel.com/ai), infrastructure designed specifically for AI workloads. This means Agent can use secure sandboxes to reproduce issues, access the latest models, and provide reliable results you can trust.

## Features

### Code Review

Get automatic code reviews on every pull request. Code Review analyzes your changes, identifies potential issues, and suggests fixes you can apply directly.

What it does:

- Performs multi-step reasoning to identify security vulnerabilities, logic errors, and performance issues
- Generates patches and runs them in secure sandboxes with your real builds, tests, and linters
- Only suggests fixes that pass validation checks, allowing you to apply specific code changes with one click

You can also mention `@vercel` in any pull request comment. The agent will read your message and either propose a fix for you to review and apply, or respond directly to your question in the same thread.

Learn more in the [Code Review docs](/docs/agent/pr-review).

### Investigation

When error alerts fire, Vercel Agent Investigations can analyze what's happening to help you debug faster. Instead of manually digging through logs and metrics, AI does the analysis and shows you what might be causing the issue.

What it does:

- Queries logs and metrics around the time of the alert
- Looks for patterns and correlations that might explain the problem
- Provides insights about potential root causes

Learn more in the [Agent Investigation docs](/docs/agent/investigation).

### Installation

Add [Web Analytics](/docs/analytics) and [Speed Insights](/docs/speed-insights) to your project using Vercel Agent. Instead of manually installing and writing integration code, Vercel Agent analyzes your repository, installs dependencies, writes integration code, and creates a pull request. All you need to do is review and merge.

Learn more in the [Agent Installation docs](/docs/agent/installation).

## Getting started

You can enable Vercel Agent in the [Agent tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) of your dashboard. Setup varies by feature:

- **Code Review**: You'll need to configure which repositories to review and whether to review draft PRs. See [Code Review setup](/docs/agent/pr-review#how-to-set-up-code-review) for details.
- **Agent Investigation**: This requires [Observability Plus](/docs/observability/observability-plus) and in order to run investigations automatically, you'll need to enable Vercel Agent Investigations. See [Investigation setup](/docs/agent/investigation#how-to-enable-agent-investigation) to get started.
- **Installation**: See [Installation docs](/docs/agent/installation#getting-started) for details.

## Pricing

Vercel Agent uses a credit-based system. Each review or investigation costs a fixed $0.30 USD plus token costs billed at the Agent's underlying AI provider's rate, with no additional markup. Pro teams can redeem a $100 USD promotional credit when enabling Agent. Agent Installation is free for all teams.

You can [purchase credits and enable auto-reload](/docs/agent/pricing#adding-credits) in the Agent tab of your dashboard. For complete pricing details, credit management, and cost tracking information, see [Vercel Agent Pricing](/docs/agent/pricing).

## Privacy

Vercel Agent doesn't store or train on your data. It only uses LLMs from providers on our [subprocessor list](https://security.vercel.com/?itemUid=e3fae2ca-94a9-416b-b577-5c90e382df57\&source=click), and we have agreements in place that don't allow them to train on your data.


---

[View full sitemap](/docs/sitemap)
