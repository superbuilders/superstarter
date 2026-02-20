---
title: OpenAI
product: vercel
url: /docs/agent-resources/integrations-for-models/openai
type: conceptual
prerequisites:
  - /docs/agent-resources/integrations-for-models
  - /docs/agent-resources
related:
  - /docs/environment-variables
summary: Learn about openai on Vercel.
---

# Vercel & OpenAI Integration

Vercel integrates with [OpenAI](https://platform.openai.com/overview) to enable developers to build fast, scalable, and secure [AI applications](https://vercel.com/ai).

You can integrate with [any OpenAI model](https://platform.openai.com/docs/models/overview) using the [AI SDK](https://sdk.vercel.ai), including the following OpenAI models:

- **GPT-4o**: Understand and generate natural language or code
- **GPT-4.5**: Latest language model with enhanced emotional intelligence
- **o3-mini**: Reasoning model specialized in code generation and complex tasks
- **DALL·E 3**: Generate and edit images from natural language
- **Embeddings**: Convert term into vectors

## Getting started

To help you get started, we have built a [variety of AI templates](https://vercel.com/templates/ai) integrating OpenAI with Vercel.

## Getting Your OpenAI API Key

Before you begin, ensure you have an [OpenAI account](https://platform.openai.com/signup). Once registered:

- ### Navigate to API Keys
  Log into your [OpenAI Dashboard](https://platform.openai.com/) and [view API keys](https://platform.openai.com/account/api-keys).

- ### Generate API Key
  Click on **Create new secret key**. Copy the generated API key securely.
  > **💡 Note:** Always keep your API keys confidential. Do not expose them in client-side code. Use [Vercel Environment Variables](/docs/environment-variables) for safe storage and do not commit these values to git.

- ### Set Environment Variable
  Finally, add the `OPENAI_API_KEY` environment variable in your project:
  ```shell filename=".env.local"
  OPENAI_API_KEY='sk-...3Yu5'
  ```

## Building chat interfaces with the AI SDK

Integrating OpenAI into your Vercel project is seamless with the [AI SDK](https://sdk.vercel.ai/docs).

Install the AI SDK in your project with your favorite package manager:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i ai
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i ai
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i ai
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i ai
    ```
  </Code>
</CodeBlock>

You can use the SDK to build AI applications with [React (Next.js)](https://sdk.vercel.ai/docs/getting-started/nextjs-app-router), [Vue (Nuxt)](https://sdk.vercel.ai/docs/getting-started/nuxt), [Svelte (SvelteKit)](https://sdk.vercel.ai/docs/getting-started/svelte), and [Node.js](https://sdk.vercel.ai/docs/getting-started/nodejs).

## Using OpenAI Functions with Vercel

The AI SDK also has **full support** for [OpenAI Functions (tool calling)](https://openai.com/blog/function-calling-and-other-api-updates).

Learn more about using [tools with the AI SDK](https://sdk.vercel.ai/docs/foundations/tools).


---

[View full sitemap](/docs/sitemap)
