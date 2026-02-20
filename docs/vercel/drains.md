---
title: Working with Drains
product: vercel
url: /docs/drains
type: reference
prerequisites:
  []
related:
  - /docs/drains/using-drains
  - /docs/drains/reference/logs
  - /docs/drains/reference/traces
  - /docs/drains/reference/speed-insights
  - /docs/drains/reference/analytics
summary: Drains collect logs, traces, speed insights, and analytics from your applications. Forward observability data to custom endpoints or popular services.
---

# Working with Drains

> **🔒 Permissions Required**: Drains

Drains let you forward observability data from your applications to external services for debugging, performance optimization, analysis, and alerting, so that you can:

- Store observability data persistently in your preferred external services
- Process large volumes of telemetry data using your own tools
- Set up alerts based on application behavior patterns
- Build custom metrics and dashboards from your data

## Getting started with Drains

You can add Drains in two ways:

- Custom endpoints: [Configure](/docs/drains/using-drains#configuring-drains) any data type to send to a [custom HTTP endpoint](/docs/drains/using-drains#custom-endpoint)
- Native integrations: [Configure](/docs/drains/using-drains#configuring-drains) logs and trace data types to send to popular services like Dash0 and Braintrust using [native integrations](/docs/drains/using-drains#native-integrations)

Learn how to [manage your active drains](/docs/drains/using-drains#managing-your-active-drains).

## Data types

You can drain four types of data:

- **Logs**: Runtime, build, and static logs from your deployments (supports custom endpoints and native integrations)
- **Traces**: Distributed tracing data in OpenTelemetry format (supports custom endpoints and native integrations)
- **Speed Insights**: Performance metrics and web vitals (custom endpoints only)
- **Web Analytics**: Page views and custom events (custom endpoints only)

### Data type references

Each drain data type has specific formats, fields, and schemas. Review the reference documentation for [logs](/docs/drains/reference/logs), [traces](/docs/drains/reference/traces), [speed insights](/docs/drains/reference/speed-insights), and [analytics](/docs/drains/reference/analytics) to understand the data structure you'll receive from each data type.

## Security

You can secure your drains by checking for valid signatures and hiding IP addresses. Learn how to [add security to your drains](/docs/drains/security).

## Usage and pricing

Drains are available to all users on the [Pro](/docs/plans/pro-plan) and [Enterprise](/docs/plans/enterprise) plans. If you are on the [Hobby](/docs/plans/hobby) or [Pro Trial](/docs/plans/pro-plan/trials) plan, you'll need to [upgrade to Pro](/docs/plans/hobby#upgrading-to-pro) to access drains.

Drains usage is billed based on the pricing table below. Pricing is the same regardless of data type:

See [Optimizing Drains](/docs/pricing/observability#optimizing-drains-usage) for information on how to manage costs associated with Drains.

## More resources

For more information on Drains, check out the following resources:

- [Configure Drains](/docs/drains/using-drains)
- [Log Drains reference](/docs/drains/reference/logs)
- [Traces reference](/docs/drains/reference/traces)
- [Speed Insights reference](/docs/drains/reference/speed-insights)
- [Analytics reference](/docs/drains/reference/analytics)


---

[View full sitemap](/docs/sitemap)
