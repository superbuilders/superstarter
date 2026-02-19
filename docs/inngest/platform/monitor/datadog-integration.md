# Datadog integration

Inngest has a native Datadog integration which publishes metrics from your Inngest environment to your Datadog account. This enables you to monitor your Inngest functions and configure alerts based on your Inngest metrics. No Datadog agent configuration is required.

![The Inngest Datadog integration](/assets/docs-markdown/platform/monitor/datadog-integration/example-dashboard-2025-05-23.png "The default dashboard for the Inngest Datadog integration")

The Datadog integration comes with a default dashboard that you can use to monitor your Inngest functions.

## Setup

Navigate to the Inngest integration's page in the Datadog dashboard:

[Open Datadog integration](https://app.datadoghq.com/integrations/inngest)

> **Info:** If you have multiple Inngest organizations, please use the "Switch organization" button located in the user menu in the Inngest dashboard to ensure that you have the correct organization selected.

Click the "**Install integration**" button at the top right.

![The Datadog integration's install page](/assets/docs-markdown/platform/monitor/datadog-integration/datadog-install-integration.png "The Datadog integration's install page")

Now click "**Connect Accounts**" to connect your Inngest account to Datadog. This will open an authentication flow. You will be asked to authorize Inngest to access your Datadog account.

![The Datadog integration's connect accounts page](/assets/docs-markdown/platform/monitor/datadog-integration/datadog-connect-accounts.png "The Datadog integration's connect accounts page")

Once you have connected your Inngest account to Datadog, you will be redirected to [the Datadog integration page in the Inngest dashboard](https://app.inngest.com/settings/integrations/datadog). The connected Inngest environment will begin setup which may take up to 60 seconds to complete.

Here you can connect additional Inngest environments to connect to Datadog as well as add add additional Datadog accounts to send metrics to.

You will see the granularity and delay of the metrics that will be sent to Datadog based on your Inngest [billing plan](/pricing).

![The Datadog integration page](/assets/docs-markdown/platform/monitor/datadog-integration/inngest-dashboard-post-setup.png)

> **Info:** The setup process may take up to 60 seconds to complete. You can refresh the page to see the status of the setup.

Once the setup is complete, you can navigate to [the Dashboards tab in the Datadog dashboard](https://app.datadoghq.com/dashboard/lists?q=Inngest) and located the newly installed "Inngest" dashboard.

This dashboard (pictured at the top of this page), gives some default visualizations to help you get started. You can also create your own custom dashboards to monitor your Inngest functions using the `inngest.*` metrics.

## Metrics

The integration publishes several metrics including the metrics below. You can also view a full list of metrics available from the integration's "Data Collected" tab:

| **Metric Name**                                         | **Description**                                                                              |                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- |
| **inngest.function\_run.scheduled.total**(count)        | Function runs scheduled during the time interval *Unit: run*                                 | environment, function         |
| **inngest.function\_run.started.total**(count)          | Function runs that started during the time interval *Unit: run*                              | environment, function         |
| **inngest.function\_run.ended.total**(count)            | Function runs that ended during the time interval *Unit: run*                                | status, environment, function |
| **inngest.function\_run.rate\_limited.total**(count)    | Function runs that did not execute due to rate limiting during the time interval *Unit: run* | environment, function         |
| **inngest.step.output\_bytes.total**(count)             | Bytes used by step outputs during the time interval *Unit: byte*                             | environment, function         |
| **inngest.sdk.req\_scheduled.total**(count)             | Step executions scheduled during the time interval *Unit: step*                              | environment, function         |
| **inngest.sdk.req\_started.total**(count)               | Step executions started during the time interval *Unit: step*                                | environment, function         |
| **inngest.sdk.req\_ended.total**(count)                 | Step executions that ended during the time interval *Unit: step*                             | environment, function, status |
| **inngest.steps.scheduled**(gauge)                      | Steps currently scheduled *Unit: step*                                                       | environment, function         |
| **inngest.steps.running**(gauge)                        | Steps currently running *Unit: step*                                                         | environment, function         |
| **inngest.steps.sleeping**(gauge)                       | Steps currently sleeping *Unit: step*                                                        | environment, function         |
| **inngest.metric\_export\_integration\_healthy**(gauge) | Indicates the Inngest integration successfully sent metrics to Datadog *Unit: success*       |                               |

## Granularity and delay

The Datadog integration is available to all paid plans and is subject to the following limits.

| Plan       | Granularity | Delay      |
| ---------- | ----------- | ---------- |
| Basic      | 15 minutes  | 15 minutes |
| Pro        | 5 minutes   | 5 minutes  |
| Enterprise | 1 minute    | Immediate  |