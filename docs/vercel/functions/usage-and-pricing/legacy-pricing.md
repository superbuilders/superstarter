---
title: Legacy Usage & Pricing for Functions
product: vercel
url: /docs/functions/usage-and-pricing/legacy-pricing
type: reference
prerequisites:
  - /docs/functions/usage-and-pricing
  - /docs/functions
related:
  - /docs/fluid-compute
  - /docs/limits/usage
  - /docs/functions/configuring-functions/memory
  - /docs/functions/usage-and-pricing
  - /docs/plans/hobby
summary: Learn about legacy usage and pricing for Vercel Functions.
---

# Legacy Usage & Pricing for Functions

> **⚠️ Warning:** **Legacy Billing Model**: This page describes the legacy billing model and
> relates to functions which  use Fluid Compute. All new projects
> use [Fluid Compute](/docs/fluid-compute) by default, which bills separately
> for active CPU time and provisioned memory time for more cost-effective and
> transparent pricing.

Functions using the Node.js runtime are measured in [GB-hours](/docs/limits/usage#execution), which is the [memory allocated](/docs/functions/configuring-functions/memory) for each Function in GB, multiplied by the time in hours they were running. For example, a function [configured](/docs/functions/configuring-functions/memory) to use 3GB of memory that executes for 1 second, would be billed at 3 GB-s, requiring 1,200 executions to reach a full GB-Hr.

A function can use up to 50 ms of CPU time per execution unit. If a function uses more than 50 ms, it will be divided into multiple 50 ms units for billing purposes.

See [viewing function usage](#viewing-function-usage) for more information on how to track your usage.

## Pricing

> **💡 Note:** This information relates to functions which  use Fluid Compute.
> Fluid Compute is the default for all new functions. To learn about pricing for
> functions that use Fluid Compute, see
> [Pricing](/docs/functions/usage-and-pricing).

The following table outlines the price for functions which do not use [Fluid Compute](/docs/fluid-compute).

Vercel Functions are available for free with the included usage limits:

| Resource             | Hobby Included     | Pro Included | On-demand with Pro              |
| -------------------- | ------------------ | ------------ | ------------------------------- |
| Function Duration    | First 100 GB-Hours | N/A          | $0.18 per 1 GB-Hour             |
| Function Invocations | First 100,000      | N/A          | $0.60 per 1,000,000 Invocations |

### Hobby

Vercel will send you emails as you are nearing your usage limits. On the Hobby plan you **will not pay for any additional usage**. However, your account may be paused if you do exceed the limits.

When your [Hobby team](/docs/plans/hobby) is set to **paused**, it remains in this state indefinitely unless you take action. This means **all** new and existing [deployments](/docs/deployments) will be paused.

> **💡 Note:** If you have reached this state, your application is likely a good candidate
> for a [Pro account](/docs/plans/pro-plan).

To unpause your account, you have two main options:

- **Contact Support**: You can reach out to our [support team](/help) to discuss the reason for the pause and potential resolutions
- **Transfer to a Pro team**:
  If your Hobby team is paused, you won't have the option to initiate a [Pro trial](/docs/plans/pro-plan/trials). Instead, you can set up a Pro team:
  1. [Create a Pro team account](/docs/accounts/create-a-team)
  2. Add a valid credit card to this account. Select the **Settings** tab, then select **Billing** and **Payment Method**

Once set up, a transfer modal will appear, prompting you to [transfer your previous Hobby projects](/docs/projects/overview#transferring-a-project) to this new team. After transferring, you can continue with your projects as usual.

### Pro

For teams on a Pro trial, the [trial will end](/docs/plans/pro-plan/trials#post-trial-decision) when your team reaches the [trial limits](/docs/plans/pro-plan/trials#trial-limitations).

Once your team exceeds the included usage, you will continue to be charged the on-demand costs going forward.

Pro teams can [set up Spend Management](/docs/spend-management#managing-your-spend-amount) to get notified or to automatically take action, such as [using a webhook](/docs/spend-management#configuring-a-webhook) or pausing your projects when your usage hits a set spend amount.

### Enterprise

Enterprise agreements provide custom usage and pricing for Vercel Functions, including:

- Custom [execution units](/docs/functions/runtimes/edge/edge-functions#managing-execution-units)
- Increased [maximum duration](/docs/functions/configuring-functions/duration) up to 900 seconds
- Multi-region deployments
- [Vercel Function failover](/docs/functions/configuring-functions/region#automatic-failover)

See [Vercel Enterprise plans](/docs/plans/enterprise) for more information.

## Viewing Function Usage

Usage metrics can be found in the [**Usage** tab](/dashboard/usage) on your [dashboard](/dashboard). Functions are invoked for every request that is served.

You can see the usage for **functions using the Node.js runtime** on the **Serverless Functions** section of the **Usage** tab.

| Metric               | Description                                                                                     | Priced                                                                                                                              | Optimize                                       |
| -------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Function Invocations | The number of times your Functions have been invoked                                            |  | [Learn More](#optimizing-function-invocations) |
| Function Duration    | The time your Vercel Functions have spent responding to requests                                |      | [Learn More](#optimizing-function-duration)    |
| Throttling           | The number of instances where Functions did not execute due to concurrency limits being reached | No                                                                                                                                  | N/A                                            |

## Managing function invocations

You are charged based on the number of times your [functions](/docs/functions) are invoked, including both successful and errored invocations, excluding cache hits. The number of invocations is calculated by the number of times your function is called, regardless of the response status code.

When using [Incremental Static Regeneration](/docs/incremental-static-regeneration) with Next.js, both the `revalidate` option for `getStaticProps` and `fallback` for `getStaticPaths` will result in a Function invocation on revalidation, not for every user request.

When viewing your Functions Invocations graph, you can group by **Ratio** to see a total of all invocations across your team's projects that finished [successfully](# "Successfully"), [errored](# "Errored"), or [timed out](# "Timeout").

Executing a Vercel Function will increase Edge Request usage as well. Caching your Vercel Function reduces the GB-hours of your functions but does not reduce the Edge Request usage that comes with executing it.

### Optimizing function invocations

- Use the **Projects** option to identify which projects have the most invocations and where you can optimize.
- Cache your responses using [caching in the CDN](/docs/cdn-cache#using-vercel-functions) and [Cache-Control headers](/docs/headers#cache-control-header) to reduce the number of invocations and speed up responses for users.
- See [How can I reduce my Serverless Execution usage on Vercel?](/kb/guide/how-can-i-reduce-my-serverless-execution-usage-on-vercel) for more general information on how to reduce your Vercel functions usage.

## Managing function duration

> **⚠️ Warning:** **Legacy Billing Model**: This describes the legacy Function duration billing
> model based on wall-clock time. For new projects, we recommend [Fluid
> Compute](/docs/functions/usage-and-pricing) which bills separately for active
> CPU time and provisioned memory time for more cost-effective and transparent
> pricing.

You are charged based on the duration your Vercel functions have run. This is sometimes called "wall-clock time", which refers to the *actual time* elapsed during a process, similar to how you would measure time passing on a wall clock. It includes all time spent from start to finish of the process, regardless of whether that time was actively used for processing or spent waiting for a streamed response. Function Duration is calculated in GB-Hours, which is the **memory allocated for each Function in GB** x **the time in hours they were running**.

For example, if a function [has](/docs/functions/configuring-functions/memory) 1.7 GB (1769 MB) of memory and is executed **1 million times** at a **1-second duration**:

- Total Seconds: 1M \* (1s) = 1,000,000 Seconds
- Total GB-Seconds: 1769/1024 GB \* 1,000,000 Seconds = 1,727,539.06 GB-Seconds
- Total GB-Hrs: 1,727,539.06 GB-Seconds / 3600 = 479.87 GB-Hrs
- The total Vercel Function Execution is 479.87 GB-Hrs.

To see your current usage, navigate to the **Usage** tab on your team's [Dashboard](/dashboard) and go to **Serverless Functions** > **Duration**. You can use the **Ratio** option to see the total amount of execution time across all projects within your team, including the completions, errors, and timeouts.

### Optimizing function duration

**Recommended: Upgrade to Fluid compute**

- **Enable [Fluid compute](/docs/fluid-compute)** for more cost-effective billing that separates active CPU time from provisioned memory time. This replaces the legacy wall-clock time billing model with transparent, usage-based pricing.

**Legacy optimization strategies:**

- Use the **Projects** option to identify which projects have the most execution time and where you can optimize.
- You can adjust the [maximum duration](/docs/functions/configuring-functions/duration) for your functions to prevent excessive run times.
- To reduce the GB-hours (Execution) of your functions, ensure you are [caching in the CDN](/docs/cdn-cache#using-vercel-functions) with Cache-Control headers. If using [Incremental Static Regeneration](/docs/incremental-static-regeneration), note that Vercel counts Function invocations on page revalidation towards both GB-hours and [Fast Origin Transfer](/docs/manage-cdn-usage#fast-origin-transfer).
- For troubleshooting issues causing functions to run longer than expected or timeout, see [What can I do about Vercel Serverless Functions timing out?](/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)

## Throttles

This counts the number of times that a request to your Functions could not be served because the [concurrency limit](/docs/functions/concurrency-scaling#automatic-concurrency-scaling) was hit.

While this is not a chargeable metric, it will cause a `503: FUNCTION_THROTTLED` error. To learn more, see [What should I do if I receive a 503 error on Vercel?](/kb/guide/what-should-i-do-if-i-receive-a-503-error-on-vercel).


---

[View full sitemap](/docs/sitemap)
