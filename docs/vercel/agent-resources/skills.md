---
title: Skills
product: vercel
url: /docs/agent-resources/skills
type: conceptual
prerequisites:
  - /docs/agent-resources
related:
  []
summary: Learn about skills on Vercel.
---

# Agent Skills

An agent skill is a packaged capability that extends an AI agent with a specific, production ready behavior such as data access, automation, or domain logic. Skills give agents secure, structured ways to take action across your stack, so they can move beyond chat and reliably execute real workflows. They are modular, composable, and built to plug directly into modern web infrastructure.

Below you'll find the official directory of Vercel published skills. Each skill is verified, documented, and ready to integrate, so you can quickly add powerful new capabilities to your agents and ship faster with confidence.

## Installing skills

Install any skill using the skills CLI:

```bash
npx skills add <owner/repo>
```

To install a specific skill from a repository with multiple skills:

```bash
npx skills add <owner/repo> --skill <skill-name>
```

Skills work with 18+ AI agents including Claude Code, GitHub Copilot, Cursor, Cline, and many others.

## React and Next.js

Skills for building performant React and Next.js applications.

## AI SDK

Skills for building AI-powered applications with the Vercel AI SDK.

## Design and UI

Skills for building accessible, performant user interfaces.

## Browser automation

Skills for automating browser interactions.

## Deployment

Skills for deploying applications to Vercel.

## Commerce

Skills for building commerce and payment experiences.

## Workflow

Skills for building durable, resilient workflows.

## JSON Render

Skills for the [JSON Render](https://github.com/vercel-labs/json-render) generative UI framework.

## Utility

General-purpose skills for agent workflows.

## Finding more skills

Browse the [skills.sh directory](https://skills.sh) to discover skills from Vercel and the community. You can also search for skills using the CLI:

```bash
npx skills find <query>
```


---

[View full sitemap](/docs/sitemap)
