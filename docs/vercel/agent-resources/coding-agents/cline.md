---
title: Cline
product: vercel
url: /docs/agent-resources/coding-agents/cline
type: conceptual
prerequisites:
  - /docs/agent-resources/coding-agents
  - /docs/agent-resources
related:
  - /docs/ai-gateway/capabilities/observability
summary: Learn about cline on Vercel.
---

# Cline

[Cline](https://cline.bot) is a VS Code extension that provides autonomous coding assistance. You can configure it to use AI Gateway for unified model access and spend monitoring.

## Configuring Cline

- ### Create an API key
  Go to the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard and click **API keys** to create a new API key.

- ### Install Cline
  Install the [Cline extension](https://marketplace.visualstudio.com/items?itemName=saoudrizwan.claude-dev) from the VS Code marketplace.

- ### Open Cline settings
  Open the Cline settings panel in VS Code.

- ### Configure AI Gateway
  In the settings panel:
  1. Select **Vercel AI Gateway** as your API Provider
  2. Paste your AI Gateway API Key
  3. Choose a model from the auto-populated catalog, or enter a specific model ID
  Cline automatically fetches all available models from AI Gateway. You can browse the full catalog on the [models page](https://vercel.com/ai-gateway/models).

- ### Start coding
  Your requests will now be routed through AI Gateway. You can verify this by checking your [AI Gateway Overview](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) in the Vercel dashboard.

- ### (Optional) Use specific model IDs
  Models follow the `creator/model-name` format. Check the [models catalog](https://vercel.com/ai-gateway/models) for the right slug to avoid "404 Model Not Found" errors.

- ### (Optional) Monitor usage and spend
  View your usage, spend, and request activity in the [**AI Gateway**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=Go+to+AI+Gateway) tab of the Vercel dashboard. The observability dashboard tracks:
  - Input and output token counts (including reasoning tokens)
  - Cached input and cache creation tokens
  - Latency metrics (average TTFT)
  - Per-project and per-model costs
  See the [observability documentation](/docs/ai-gateway/capabilities/observability) for more details.
  > **💡 Note:** Maintain separate API keys for different environments (dev, staging, production) to better track usage across your workflow.

## Troubleshooting

Common issues and solutions:

- **401 Unauthorized**: Verify you're sending the AI Gateway key to the AI Gateway endpoint
- **404 Model Not Found**: Copy the exact model ID from the models catalog
- **Slow first token**: Check dashboard average TTFT and consider streaming-optimized models


---

[View full sitemap](/docs/sitemap)
