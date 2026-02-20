---
title: Using Drains
product: vercel
url: /docs/drains/using-drains
type: how-to
prerequisites:
  - /docs/drains
related:
  - /docs/plans/pro-plan
  - /docs/plans/enterprise
  - /docs/integrations
  - /docs/drains/reference/logs
  - /docs/drains/reference/traces
summary: Learn how to configure drains to forward observability data to custom HTTP endpoints and add integrations.
---

# Using Drains

> **🔒 Permissions Required**: Drains

You can add drains to your project by following the configuration steps below. When you configure the destination, choose between sending data to a [custom HTTP endpoint](#custom-endpoint) and using a [native integration](#native-integrations) or an [external integration](#external-integrations) to send your data to popular services.

## Configuring Drains

Teams on [Pro](/docs/plans/pro-plan) and [Enterprise](/docs/plans/enterprise) plans can configure drains to forward observability data. You can send logs, traces, speed insights, and analytics data to a custom HTTP endpoint or use integrations from the [Vercel Marketplace](/marketplace) to send logs and traces data to popular services.

- ### Add a drain
  From the Vercel dashboard, go to **Team Settings > Drains** and click **Add Drain**.

- ### Choose data type
  Select the type of observability data you want to drain:
  - **Logs**: Runtime, build and static logs from your deployments
  - **Traces**: Distributed tracing data using OpenTelemetry Protocol
  - **Speed Insights**: Performance metrics and web vitals
  - **Web Analytics**: Page views and custom events
  At any time, you can also add an [external integration](#external-integrations) to available [connectable account](/docs/integrations#connectable-accounts) log drain integrations by clicking the **External Integrations** link on the top right of the **Add Drain** side bar.

- ### Configure the drain
  Provide a name for your drain and select which projects should send data to your endpoint. You can choose all projects or select specific ones.

  The drain type determines which configuration options you can set:
  - **Log**: Configure the [log source](/docs/drains/reference/logs#log-sources), [environment](/docs/drains/reference/logs#log-environments), and advanced sampling rate controls.
  - **Trace**: Configure the project and advanced sampling rate controls.
  - **Speed Insights**: Configure the project and a basic sampling rate.
  - **Web Analytics**: Configure the project and a basic sampling rate.
  Configure the sampling rate to control the volume of data sent to your drain. This can help manage costs when you have high traffic volumes. For detailed log source, environment, and sampling options, see [Additional configuration for logs](/docs/drains/reference/logs#log-sources).

- ### Configure the sampling rules (optional)
  For **Log** and **Trace** drains, add sampling rules to define how much data reaches your destination:
  1. If no rules exist, click **Add sampling rule**.
  2. Choose the environment you want to sample from.
  3. Set the sampling percentage.
  4. (Optional) Specify a request path prefix. Leave it blank to apply the rule to every path.
  Example workflows:
  - Launch-day monitoring: sample **100%** of production traffic when you launch a new feature, then decrease to **10%** once traffic stabilizes.
  - Static coverage: always collect **5%** from `/docs` so you can spot regressions on a static documentation site.
  Rules run from top to bottom. Requests that match a rule use that rule’s sampling rate, and any other requests are dropped. If you do not add rules, the drain forwards **100%** of data to the destination.

- ### Configure destination
  Choose how you want to receive your drain data by selecting either the [**Custom Endpoint**](#custom-endpoint) or [**Native Integrations**](#native-integrations) tab.
  #### Custom endpoint
  Configure a custom HTTP endpoint to receive drain data for any data type.

  **Endpoint URL**

  This is the URL of the endpoint we will send your data to. The request will be sent over HTTPS using the POST method. Make sure your endpoint responds with a 200 OK status code.

  **Format**

  Choose the delivery format based on your data type:
  - **Logs**: JSON or NDJSON (see [Logs reference](/docs/drains/reference/logs))
  - **Traces**: JSON or Protobuf (see [Traces reference](/docs/drains/reference/traces))
  - **Speed Insights**: JSON or NDJSON (see [Speed Insights reference](/docs/drains/reference/speed-insights))
  - **Web Analytics**: JSON or NDJSON (see [Analytics reference](/docs/drains/reference/analytics))
  **Signature Verification Secret (Optional)**

  You can secure your endpoint by comparing the `x-vercel-signature` header with this secret. See [Securing your Drains](/docs/drains/security#secure-drains) for implementation details.

  A secret will be automatically generated for you, and you can change it and provide your own secret at any time.

  **Custom Headers (Optional)**

  Add custom headers for authentication, identification, or routing purposes. Common use cases include:
  - **Authentication**: Bearer tokens, API keys, or custom auth headers
  - **Routing**: Headers to route requests to specific services or regions
  - **Identification**: Custom headers to identify the source or type of data
  - **Content negotiation**: Headers to specify preferred response formats
  Format headers as `Header-Name: Header-Value` with one header per line.
  #### Native integrations
  Native integrations are available for log and traces data. You have 2 options:
  1. Installed Products

     If you've already installed a marketplace integration product that supports drains, you can select it here. The integration will handle endpoint configuration automatically.

  2. Available Products

     Browse and install available product integrations for this drain type:

     - Click **Install** on any available product. This opens the Marketplace integration creation page in a new window.
     - Update the default product name if needed and select a subscription plan
     - Click **Create** and click **Done** once the integration has been created
     - Go back to the Project's settings Drains page and select your newly created integration
  You can also add a Drain from your team's **Integrations** tab
  - Select the installed integration from the list. (Trace data shows under "Observability" and log data shows under "Logging")
  - Click **Manage** and select your installed product
  - Under **Drains**, click **Add Drain**
  - Configure which project you would like to send data from and click **Create Drain**

- ### Create the drain
  Once you have configured all settings, click **Create Drain**. If you configured a custom endpoint, it will be tested automatically when you create the drain. Vercel will immediately start forwarding data based on your configuration.

  You can test your endpoint anytime by clicking the  **Test** button to ensure it receives the data correctly.

## Logs and traces correlation

Vercel automatically correlates logs with distributed traces when you setup [Tracing](/docs/tracing). Any logs generated during traced requests are enriched with correlation identifiers:

- `traceId` - The trace identifier
- `spanId` - The span identifier

This correlation happens automatically without code changes. For example, this log:

```js
console.log('User logged in', { userId: 123 });
```

Will be automatically enriched with [trace and span identifiers](/docs/drains/reference/logs#json-format-fields).

**Limitations**: Only applies to user code logs during traced requests, not build-time logs.

## Drain integrations

You can create Drains with native integrations for the following data types by using [native integrations](#native-integrations) during the configuration step:

- **Log drains**: [Logging services](https://vercel.com/marketplace/category/logging) like [Dash0](https://vercel.com/marketplace/dash0)
- **Trace drains**: [Observability services](https://vercel.com/marketplace/category/observability) like [Braintrust](https://vercel.com/marketplace/braintrust) for OpenTelemetry trace streaming

### External integrations

1. From the Vercel dashboard, go to **Team Settings > Drains** and click **Add Drain**.
2. Click the **External Integrations** link on the top right of the **Add Drain** side modal.
3. From the **External Integration Log Drains** modal, select the installed or available external integration you would like to use and follow the steps to create the drain to that service.

Learn more about [native integrations](/docs/integrations#native-integrations) and [external (connectable accounts) integrations](/docs/integrations#connectable-accounts).

## Errored Drains

Occasionally your drain endpoints can return an error. If more than 80% of drain deliveries fail or the number of failures exceed 50 for the past hour, we will send a notification email and indicate the error status on your Drains page.

![Image](https://vercel.com/front/docs/logs/drain-error-light.png)

## Managing your active Drains

1. From your team's [dashboard](/dashboard), select the **Settings** tab
2. Select **Drains** from the sidebar
3. In available Drains, click on the  menu on the right and click **Pause** to pause a drain or **Resume** to resume it
4. In available Drains, click on the  menu on the right and click **Delete** to delete a drain

## More resources

For more information on Drains and how to use them, check out the following resources:

- [Drains overview](/docs/drains)
- [Log Drains reference](/docs/drains/reference/logs)
- [Traces reference](/docs/drains/reference/traces)
- [Speed Insights reference](/docs/drains/reference/speed-insights)
- [Analytics reference](/docs/drains/reference/analytics)


---

[View full sitemap](/docs/sitemap)
