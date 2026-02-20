---
title: Observability
product: vercel
url: /docs/ai-gateway/capabilities/observability
type: integration
prerequisites:
  - /docs/ai-gateway/capabilities
  - /docs/ai-gateway
related:
  - /docs/observability/observability-plus
summary: Learn how to monitor and debug your AI Gateway requests.
---

# Observability

The AI Gateway logs spend, model usage, and observability metrics related to your requests, which you can use to monitor and debug.

You can view these details in the [**AI Gateway Overview**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway\&title=AI+Gateway) tab of your Vercel dashboard:

- **Usage**: Graphs and metrics to track your AI Gateway usage and cost
- **Requests**: Summaries by project, API key, and a detailed log of all requests

You can view these metrics in two ways:

- **Team level**: Stay in your team scope to see aggregated metrics across all projects
- **Project level**: Use the new dashboard view and select a specific project from the top project dropdown to see project-specific metrics

## Usage

The **Usage** section displays four metrics to help you monitor your AI Gateway activity. For extended timeframes and further retention, you need [Observability Plus](/docs/observability/observability-plus).

![Image](https://vercel.com/docs-assets/static/docs/ai-gateway/overview-observability/graphs-light.png)

### Requests by Model

The **Requests by Model** chart shows the number of requests made to each model over time. This can help you identify which models are being used most frequently and whether there are any spikes in usage.

### Time to First Token (TTFT)

The **Time to First Token** chart shows the average time it takes for the AI Gateway to return the first token of a response. This can help you understand the latency of your requests and identify any performance issues.

### Input/Output Token Counts

The **Input/Output Token Counts** chart shows the number of input and output tokens for each request. This can help you understand the size of the requests being made and the responses being returned.

### Spend

The **Spend** chart shows the total amount spent on AI Gateway requests over time. This can help you monitor your spending and identify any unexpected costs.

## Requests

The **Requests** section displays summaries by project, API key, and a detailed log of all requests. Each summary includes request count, average tokens, P75 duration, P75 TTFT, and cost for the specified time frame.

### Projects

View usage grouped by project. Use this view to associate usage and spend with specific projects. Click into a project for more detailed information.

![Image](https://vercel.com/docs-assets/static/docs/ai-gateway/overview-observability/projects-summary-light.png)

### API keys

View usage grouped by API key. Use this view to track usage by a specific person or part of your organization. Click into an API key for more detailed information.

![Image](https://vercel.com/docs-assets/static/docs/ai-gateway/overview-observability/apikeys-summary-light.png)

### Logs

View a detailed log of all requests made to the AI Gateway, including all token types and the cost for each request. You can sort or export the logs for the selected time frame.

![Image](https://vercel.com/docs-assets/static/docs/ai-gateway/overview-observability/requests-log-light.png)

## Team scope

By default, when you access the **AI Gateway Overview** tab, you view metrics for all requests made across all projects in your team. This is useful for monitoring the overall usage and performance of the AI Gateway.

## Project scope

To view metrics for a specific project, you can access the project scope in two ways:

1. Select the project from the top project dropdown in the dashboard
2. Click into the project from the **Projects** view in the **Requests** section

Once in project scope, you'll see the same metrics filtered to show only the activity for that specific project.


---

[View full sitemap](/docs/sitemap)
