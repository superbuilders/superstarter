---
title: Roo Code
product: vercel
url: /docs/agent-resources/coding-agents/roo-code
type: conceptual
prerequisites:
  - /docs/agent-resources/coding-agents
  - /docs/agent-resources
related:
  - /docs/ai-gateway/capabilities/observability
summary: Learn about roo code on Vercel.
---

# Roo Code

[Roo Code](https://roocode.com) is a VS Code extension that brings AI coding assistance directly into your editor. You can configure it to use AI Gateway for unified model access and spend monitoring.

## Configuring Roo Code

- ### Create an API key
  Go to the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard and click **API keys** to create a new API key.

- ### Install Roo Code
  Install the [Roo Code extension](https://marketplace.visualstudio.com/items?itemName=RooVeterinaryInc.roo-cline) from the VS Code marketplace.

- ### Open Roo Code settings
  Click the gear icon in the Roo Code panel to open the settings.

- ### Configure AI Gateway
  In the Roo Code settings panel, configure the connection:
  1. Select **Vercel AI Gateway** as your API Provider
  2. Paste your AI Gateway API Key
  3. Choose a model from the available models
  > **💡 Note:** Roo Code automatically updates to include the models available on AI Gateway. Browse the full catalog on the [models page](https://vercel.com/ai-gateway/models).

- ### Start coding
  Your requests will now be routed through AI Gateway. You can verify this by checking your [AI Gateway Overview](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in the Vercel dashboard.
  > **💡 Note:** Prompt caching is supported for Claude and GPT models, which can reduce costs by reusing previously processed prompts.

- ### (Optional) Monitor usage and spend
  View your usage, spend, and request activity in the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard. See the [observability documentation](/docs/ai-gateway/capabilities/observability) for more details.


---

[View full sitemap](/docs/sitemap)
