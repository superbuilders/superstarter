---
title: Fluid compute
product: vercel
url: /docs/fluid-compute
type: reference
prerequisites:
  []
related:
  - /docs/getting-started-with-vercel/fundamental-concepts/what-is-compute
  - /docs/functions/functions-api-reference/vercel-functions-package
  - /docs/functions/configuring-functions/region
  - /docs/project-configuration
  - /docs/functions/runtimes/node-js
summary: Learn about fluid compute, an execution model for Vercel Functions that provides a more flexible and efficient way to run your functions.
---

# Fluid compute

Fluid compute offers a blend of serverless flexibility and server-like capabilities. Unlike traditional [serverless architectures](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute#serverless), which can face issues such as cold starts and [limited functionalities](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute#serverless-disadvantages), fluid compute provides a hybrid solution. It overcomes the limitations of both serverless and server-based approaches, delivering the advantages of both worlds, including:

- [**Zero configuration out of the box**](/docs/fluid-compute#default-settings-by-plan): Fluid compute comes with preset defaults that automatically optimize your functions for both performance and cost efficiency.
- [**Optimized concurrency**](/docs/fluid-compute#optimized-concurrency): Optimize resource usage by handling multiple invocations within a single function instance. Can be used with the **Node.js** and **Python** runtimes.
- **Dynamic scaling**: Fluid compute automatically optimizes existing resources before scaling up to meet traffic demands. This ensures low latency during high-traffic events and cost efficiency during quieter periods.
- **Background processing**: After fulfilling user requests, you can continue executing background tasks using [`waitUntil`](/docs/functions/functions-api-reference/vercel-functions-package#waituntil). This allows for a responsive user experience while performing time-consuming operations like logging and analytics in the background.
- **Automatic cold start optimizations**: Reduces the effects of cold starts through [automatic bytecode optimization](/docs/fluid-compute#bytecode-caching), and function pre-warming on production deployments.
- **Cross-region and availability zone failover**: Ensure high availability by first failing over to [another availability zone (AZ)](/docs/functions/configuring-functions/region#automatic-failover) within the same region if one goes down. If all zones in that region are unavailable, Vercel automatically redirects traffic to the next closest region. Zone-level failover also applies to non-fluid deployments.
- **Error isolation**: Unhandled errors won't crash other concurrent requests running on the same instance, maintaining reliability without sacrificing performance.

See [What is compute?](/docs/getting-started-with-vercel/fundamental-concepts/what-is-compute) to learn more about fluid compute and how it compares to traditional serverless models.

## Enabling fluid compute

> **💡 Note:** As of April 23, 2025, fluid compute is enabled by default for new projects.

You can enable fluid compute through the Vercel dashboard or by configuring your `vercel.json` file for specific environments or deployments.

### Enable for entire project

To enable fluid compute through the dashboard:

1. Navigate to your project's [Functions Settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Ffunctions\&title=Go+to+Functions+Settings) in the dashboard
2. Locate the **Fluid Compute** section
3. Toggle the switch to enable fluid compute for your project
4. Click **Save** to apply the changes
5. Deploy your project for the changes to take effect

When you enable it through the dashboard, fluid compute applies to all deployments for that project by default.

### Enable for specific environments and deployments

You can programmatically enable fluid compute using the [`fluid` property](/docs/project-configuration#fluid) in your `vercel.json` file. This approach is particularly useful for:

- **Testing on specific environments**: Enable fluid compute only for custom environments environments when using branch tracking
- **Per-deployment configuration**: Test fluid compute on individual deployments before enabling it project-wide

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true
}
```

## Available runtime support

Fluid compute is available for the following runtimes:

- [Node.js](/docs/functions/runtimes/node-js)
- [Python](/docs/functions/runtimes/python)
- [Edge](/docs/functions/runtimes/edge)
- [Bun](/docs/functions/runtimes/bun)
- [Rust](/docs/functions/runtimes/rust)

## Optimized concurrency

Fluid compute allows multiple invocations to share a single function instance, this is especially valuable for AI applications, where tasks like fetching embeddings, querying vector databases, or calling external APIs can be [I/O-bound](# "What does I/O bound mean?"). By allowing concurrent execution within the same instance, you can reduce cold starts, minimize latency, and lower compute costs.

![Image](`/docs-assets/static/docs/fluid/serverless-active-light.avif`)

Vercel Functions prioritize existing idle resources before allocating new ones, reducing unnecessary compute usage. This in-function-concurrency is especially effective when multiple requests target the same function, leading to fewer total resources needed for the same workload.

Optimized concurrency in fluid compute is available when using Node.js or Python runtimes. See the [efficient serverless Node.js with in-function concurrency](/blog/serverless-servers-node-js-with-in-function-concurrency) blog post to learn more.

## Bytecode caching

When using [Node.js version 20+](/docs/functions/runtimes/node-js/node-js-versions), Vercel Functions use bytecode caching to reduce cold start times. This stores the compiled bytecode of JavaScript files after their first execution, eliminating the need for recompilation during subsequent cold starts.

As a result, the first request isn't cached yet. However, subsequent requests benefit from the cached bytecode, enabling faster initialization. This optimization is especially beneficial for functions that are not invoked that often, as they will see faster cold starts and reduced latency for end users.

Bytecode caching is only applied to production environments, and is not available in development or preview deployments.

> **💡 Note:** For [frameworks](/docs/frameworks) that output ESM, all CommonJS dependencies
> (for example, `react`, `node-fetch`) will be opted into bytecode caching.

## Isolation boundaries and global state

On traditional serverless compute, the isolation boundary refers to the separation of individual instances of a function to ensure they don't interfere with each other. This provides a secure execution environment for each function.

However, because each function uses a microVM for isolation, which can lead to slower start-up times, you can see an increase in resource usage due to idle periods when the microVM remains inactive.

Fluid compute uses a different approach to isolation. Instead of using a microVM for each function invocation, multiple invocations can share the same physical instance (a global state/process) concurrently. This allows functions to share resources and execute in the same environment, which can improve performance and reduce costs.

When [uncaught exceptions](https://nodejs.org/api/process.html#event-uncaughtexception) or [unhandled rejections](https://nodejs.org/api/process.html#event-unhandledrejection) happen in Node.js, Fluid compute logs the error and lets current requests finish before stopping the process. This means one broken request won't crash other requests running on the same instance and you get the reliability of traditional serverless with the performance benefits of shared resources.

## Default settings by plan

Fluid Compute includes default settings that vary by plan:

| **Settings**                                                                                 | **Hobby**                           | **Pro**                              | **Enterprise**                       |
| -------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------ | ------------------------------------ |
| [**CPU configuration**](/docs/functions/configuring-functions/memory#memory-/-cpu-type)      | Standard                            | Standard / Performance               | Standard / Performance               |
| [**Default / Max duration**](/docs/functions/limitations#max-duration)                       | 300s (5 minutes) / 300s (5 minutes) | 300s (5 minutes) / 800s (13 minutes) | 300s (5 minutes) / 800s (13 minutes) |
| [**Multi-region failover**](/docs/functions/configuring-functions/region#automatic-failover) |                       |                        |                    |
| [**Multi-region functions**](/docs/functions/runtimes#location)                              |                       | Up to 3                              | All                                  |

## Order of settings precedence

The settings you configure in your [function code](/docs/functions/configuring-functions), [dashboard](/dashboard), or [`vercel.json`](/docs/project-configuration) file will override the default fluid compute settings.

The following order of precedence determines which settings take effect. Settings you define later in the sequence will always override those defined earlier:

| **Precedence** | **Stage**          | **Explanation**                                                                                                                                    | **Can Override**                                                                                                                                                                    |
| -------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1              | **Function code**  | Settings in your function code always take top priority. These include max duration defined directly in your code.                                 | [`maxDuration`](/docs/functions/configuring-functions/duration)                                                                                                                     |
| 2              | **`vercel.json`**  | Any settings in your [`vercel.json`](/docs/project-configuration) file, like max duration, and region, will override dashboard and Fluid defaults. | [`maxDuration`](/docs/functions/configuring-functions/duration), [`region`](/docs/functions/configuring-functions/region)                                                           |
| 3              | **Dashboard**      | Changes made in the dashboard, such as max duration, region, or CPU, override Fluid defaults.                                                      | [`maxDuration`](/docs/functions/configuring-functions/duration), [`region`](/docs/functions/configuring-functions/region), [`memory`](/docs/functions/configuring-functions/memory) |
| 4              | **Fluid defaults** | These are the default settings applied automatically when fluid compute is enabled, and do not configure any other settings.                       |                                                                                                                                                                             |

## Pricing and usage

See the [fluid compute pricing](/docs/functions/usage-and-pricing) documentation for details on how fluid compute is priced, including active CPU, provisioned memory, and invocations.


---

[View full sitemap](/docs/sitemap)
