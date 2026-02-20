---
title: Code Review
product: vercel
url: /docs/agent/pr-review
type: integration
prerequisites:
  - /docs/agent
related:
  - /docs/agent
  - /docs/vercel-sandbox
  - /docs/git
  - /docs/agent/pr-review/usage
  - /docs/agent/pricing
summary: Get automatic AI-powered code reviews on your pull requests
---

# Code Review

> **🔒 Permissions Required**: Vercel Agent Code Review

AI Code Review is part of [Vercel Agent](/docs/agent), a suite of AI-powered development tools. When you open a pull request, it automatically analyzes your changes using multi-step reasoning to catch security vulnerabilities, logic errors, and performance issues.

It generates patches and runs them in [secure sandboxes](/docs/vercel-sandbox) with your real builds, tests, and linters to validate fixes before suggesting them. Only validated suggestions that pass these checks appear in your PR, allowing you to apply specific code changes with one click.

## How to set up Code Review

To enable code reviews for your [repositories](/docs/git#supported-git-providers), navigate to the
[**Agent** tab](/d?to=%2F%5Bteam%5D%2F%7E%2Fvercel-agent\&title=Open+Vercel+Agent) of the dashboard.

1. Click **Enable** to turn on Vercel Agent.
2. Under **Repositories**, choose which repositories to review:
   - All repositories (default)
   - Public only
   - Private only
3. Under **Review Draft PRs**, select whether to:
   - Skip draft PRs (default)
   - Review draft PRs
4. Optionally, configure **Auto-Recharge** to keep your balance topped up automatically:
   - Set the threshold for **When Balance Falls Below**
   - Set the amount for **Recharge To Target Balance**
   - Optionally, add a **Monthly Spending Limit**
5. Click **Save** to confirm your settings.

Once you've set up Code Review, it will automatically review pull requests in repositories connected to your Vercel projects.

## How it works

Code Review runs automatically when:

- A pull request is created
- A batch of commits is pushed to an open PR
- A draft PR is created, if you've enabled draft reviews in your settings

When triggered, Code Review analyzes all human-readable files in your codebase, including:

- Source code files (JavaScript, TypeScript, Python, etc.)
- Test files
- Configuration files (`package.json`, YAML files, etc.)
- Documentation (markdown files, README files)
- Comments within code

The AI uses your entire codebase as context to understand how your changes fit into the larger system.

Code Review then generates patches, runs them in [secure sandboxes](/docs/vercel-sandbox), and executes your real builds, tests, and linters. Only validated suggestions that pass these checks appear in your PR.

## Using Vercel Agent in GitHub

Beyond automatic reviews, you can interact with Vercel Agent on demand by mentioning `@vercel` in any pull request comment. The agent will read your comment and either generate a suggested fix (which you can review and apply) or reply to your question in the same thread.

Comment `@vercel` followed by your request:

- `@vercel run a review` runs a full code review
- `@vercel fix the type errors` implements and commits a fix
- `@vercel why is this failing?` investigates the issue

Replies appear in the same comment thread.

## Code guidelines

Code Review automatically detects and applies coding guidelines from your repository. When guidelines are found, they're used during review to ensure feedback aligns with your project's conventions.

### Supported guideline files

Code Review looks for these files in priority order (highest to lowest):

| File                                     | Description                       |
| ---------------------------------------- | --------------------------------- |
| `AGENTS.md`                              | OpenAI Codex / universal standard |
| `CLAUDE.md`                              | Claude Code instructions          |
| `.github/copilot-instructions.md`        | GitHub Copilot                    |
| `.cursor/rules/*.mdc`                    | Cursor rules                      |
| `.cursorrules`                           | Cursor (legacy)                   |
| `.windsurfrules`                         | Windsurf                          |
| `.windsurf/rules/*.md`                   | Windsurf (directory)              |
| `.clinerules`                            | Cline                             |
| `.github/instructions/*.instructions.md` | GitHub Copilot workspace          |
| `.roo/rules/*.md`                        | Roo Code                          |
| `.aiassistant/rules/*.md`                | JetBrains AI Assistant            |
| `CONVENTIONS.md`                         | Aider                             |
| `.rules/*.md`                            | Generic rules                     |
| `agent.md`                               | Generic agent file                |

When multiple guideline files exist in the same directory, the highest-priority file is used.

### How guidelines are applied

- **Hierarchical**: Guidelines from parent directories are inherited. A `CLAUDE.md` at the root applies to all files, while a `src/components/CLAUDE.md` adds additional context for that directory.
- **Scoped**: Guidelines only affect files within their directory subtree. A guideline in `src/` won't apply to files in `lib/`.
- **Nested references**: Guidelines can reference other files using `@import "file.md"` or relative markdown links. Referenced files are automatically included as context.
- **Size limit**: Guidelines are capped at 50 KB total.

### Writing effective guidelines

Guidelines should focus on project-specific conventions that help the reviewer understand your codebase:

- Code style preferences not enforced by linters
- Architecture patterns and design decisions
- Common pitfalls specific to your project
- Testing requirements and patterns

Guidelines are treated as context, not instructions. The reviewer's core behavior (identifying bugs, security issues, and performance problems) takes precedence over any conflicting guideline content.

## Managing reviews

Check out [Managing Reviews](/docs/agent/pr-review/usage) for details on how to customize which repositories get reviewed and monitor your review metrics and spending.

## Pricing

Code Review uses a credit-based system. Each review costs a fixed $0.30 USD plus token costs billed at the Agent's underlying AI provider's rate, with no additional markup. The token cost varies based on how complex your changes are and how much code the AI needs to analyze.

Pro teams can redeem a $100 USD promotional credit when enabling Agent. You can [purchase credits and enable auto-reload](/docs/agent/pricing#adding-credits) in the Agent tab of your dashboard. For complete pricing details, credit management, and cost tracking information, see [Vercel Agent Pricing](/docs/agent/pricing).

## Privacy

Code Review doesn't store or train on your data. It only uses LLMs from providers on our [subprocessor list](https://security.vercel.com/?itemUid=e3fae2ca-94a9-416b-b577-5c90e382df57\&source=click), and we have agreements in place that don't allow them to train on your data.


---

[View full sitemap](/docs/sitemap)
