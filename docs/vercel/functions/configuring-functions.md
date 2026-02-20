---
title: Configuring Functions
product: vercel
url: /docs/functions/configuring-functions
type: how-to
prerequisites:
  - /docs/functions
related:
  - /docs/functions/runtimes
  - /docs/project-configuration
  - /docs/functions/configuring-functions/region
  - /docs/functions/limitations
  - /docs/functions/configuring-functions/duration
summary: Learn how to configure the runtime, region, maximum duration, and memory for Vercel Functions.
---

# Configuring Functions

You can configure Vercel functions in many ways, including the runtime, region, maximum duration, and memory.

With different configurations, particularly the runtime configuration, there are a number of trade-offs and limits that you should be aware of. For more information, see the [runtimes](/docs/functions/runtimes) comparison.

## Runtime

The runtime you select for your function determines the infrastructure, APIs, and other abilities of your function.

With Vercel, you can configure the runtime of a function in any of the following ways:

- **Node.js**: When working with a TypeScript or JavaScript function, you can use the Node.js runtime by setting a config option within the function. For more information, see the [runtimes](/docs/functions/runtimes).
- **Ruby**, **Python**, **Go**: These have similar functionality and limitations as Node.js functions. The configuration for these runtimes gets based on the file extension.
- **Community runtimes**: You can specify any other [runtime](/docs/functions/runtimes#community-runtimes), by using the [`functions`](/docs/project-configuration#functions) property in your `vercel.json` file.

See [choosing a runtime](/docs/functions/runtimes) for more information.

## Region

Your function should execute in a location close to your data source. This minimizes latency, or delay, thereby enhancing your app's performance. How you configure your function's region, depends on the runtime used.

See [configuring a function's region](/docs/functions/configuring-functions/region) for more information.

## Maximum duration

The maximum duration for your function defines how long a function can run for, allowing for more predictable billing.

Vercel Functions have a default duration that's dependent on your plan, but you can configure this as needed, [up to your plan's limit](/docs/functions/limitations#max-duration).

See [configuring a function's duration](/docs/functions/configuring-functions/duration) for more information.

## Memory

Vercel Functions use an infrastructure that allows you to adjust the memory size.

See [configuring a function's memory](/docs/functions/configuring-functions/memory) for more information.


---

[View full sitemap](/docs/sitemap)
