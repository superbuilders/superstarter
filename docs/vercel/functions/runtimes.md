---
title: Runtimes
product: vercel
url: /docs/functions/runtimes
type: reference
prerequisites:
  - /docs/functions
related:
  - /docs/functions
  - /docs/cdn
  - /docs/functions/runtimes/node-js
  - /docs/functions/runtimes/bun
  - /docs/functions/runtimes/python
summary: Runtimes transform your source code into Functions, which are served by our CDN. Learn about the official runtimes supported by Vercel.
---

# Runtimes

Vercel supports multiple runtimes for your functions. Each runtime has its own set of libraries, APIs, and functionality that provides different trade-offs and benefits.

Runtimes transform your source code into [Functions](/docs/functions), which are served by our [CDN](/docs/cdn).

## Official runtimes

Vercel Functions support the following official runtimes:

| Runtime                                     | Description                                                                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Node.js](/docs/functions/runtimes/node-js) | The Node.js runtime takes an entrypoint of a Node.js function, builds its dependencies (if any) and bundles them into a Vercel Function.                    |
| [Bun](/docs/functions/runtimes/bun)         | The Bun runtime takes an entrypoint of a Bun function, builds its dependencies (if any) and bundles them into a Vercel Function.                            |
| [Python](/docs/functions/runtimes/python)   | The Python runtime takes in a Python program that defines a singular HTTP handler and outputs it as a Vercel Function.                                      |
| [Rust](/docs/functions/runtimes/rust)       | The Rust runtime takes an entrypoint of a Rust function using the `vercel_runtime` crate and compiles it into a Vercel Function.                            |
|                            | The Go runtime takes in a Go program that defines a singular HTTP handler and outputs it as a Vercel Function.                                              |
| [Ruby](/docs/functions/runtimes/ruby)       | The Ruby runtime takes in a Ruby program that defines a singular HTTP handler and outputs it as a Vercel Function.                                          |
| [Wasm](/docs/functions/runtimes/wasm)       | The Wasm runtime takes in a pre-compiled WebAssembly program and outputs it as a Vercel Function.                                                           |
| [Edge](/docs/functions/runtimes/edge)       | The Edge runtime is built on top of the V8 engine, allowing it to run in isolated execution environments that don't require a container or virtual machine. |

## Community runtimes

If you would like to use a language that Vercel does not support by default, you can use a community runtime by setting the [`functions` property](/docs/project-configuration#functions) in `vercel.json`. For more information on configuring other runtimes, see [Configuring your function runtime](/docs/functions/configuring-functions/runtime#other-runtimes).

The following community runtimes are recommended by Vercel:

| Runtime | Runtime Module | Docs                                     |
| ------- | -------------- | ---------------------------------------- |
| Bash    | `vercel-bash`  | https://github.com/importpw/vercel-bash  |
| Deno    | `vercel-deno`  | https://github.com/vercel-community/deno |
| PHP     | `vercel-php`   | https://github.com/vercel-community/php  |

You can create a community runtime by using the [Runtime API](https://github.com/vercel/vercel/blob/main/DEVELOPING_A_RUNTIME.md). Alternatively, you can use the [Build Output API](/docs/build-output-api/v3).

## Features

- **Location**: Deployed as region-first, [can customize location](/docs/functions/configuring-functions/region#setting-your-default-region). Pro and Enterprise teams can set [multiple regions](/docs/functions/configuring-functions/region#project-configuration)
- [**Failover**](/docs/functions/runtimes#failover-mode): Automatic failover to [defined regions](/docs/functions/configuring-functions/region#node.js-runtime-failover)
- [**Automatic concurrency scaling**](/docs/functions/concurrency-scaling#automatic-concurrency-scaling): Auto-scales up to 30,000 (Hobby and Pro) or 100,000+ (Enterprise) concurrency
- [**Isolation boundary**](/docs/functions/runtimes#isolation-boundary): microVM
- [**File system support**](/docs/functions/runtimes#file-system-support): Read-only filesystem with writable `/tmp` scratch space up to 500 MB
- [**Archiving**](/docs/functions/runtimes#archiving): Functions are archived when not invoked
- [**Functions created per deployment**](/docs/functions/runtimes#functions-created-per-deployment): Hobby: Framework-dependent, Pro and Enterprise: No limit

### Location

Location refers to where your functions are **executed**. Vercel Functions are region-first, and can be [deployed](/docs/functions/configuring-functions/region#project-configuration) to up to **3** regions on Pro or **18** on Enterprise. Deploying to more regions than your plan allows for will cause your deployment to fail before entering the [build step](/docs/deployments/configure-a-build).

### Failover mode

Vercel's failover mode refers to the system's behavior when a function fails to execute because of data center downtime.

Vercel provides [redundancy](/docs/regions#outage-resiliency) and automatic failover for Vercel Functions using the Edge runtime. For Vercel Functions on the Node.js runtime, you can use the [`functionFailoverRegions` configuration](/docs/project-configuration#functionfailoverregions) in your `vercel.json` file to specify which regions the function should automatically failover to.

### Isolation boundary

In Vercel, the isolation boundary refers to the separation of individual instances of a function to ensure they don't interfere with each other. This provides a secure execution environment for each function.

With traditional serverless infrastructure, each function uses a microVM for isolation, which provides strong security but also makes them slower to start and more resource intensive.

### File system support

Filesystem support refers to a function's ability to read and write to the filesystem. Vercel functions have a read-only filesystem with writable `/tmp` scratch space up to 500 MB.

### Archiving

Vercel Functions are archived when they are not invoked:

- **Within 2 weeks** for [Production Deployments](/docs/deployments)
- **Within 48 hours** for [Preview Deployments](/docs/deployments/environments#preview-environment-pre-production)

Archived functions will be unarchived when they're invoked, which can make the initial [cold start](/docs/infrastructure/compute#cold-and-hot-boots "Cold start") time at least 1 second longer than usual.

### Functions created per deployment

When using [Next.js](/docs/frameworks/nextjs) or [SvelteKit](/docs/frameworks/sveltekit) on Vercel, dynamic code (APIs, server-rendered pages, or dynamic `fetch` requests) will be bundled into the fewest number of Vercel Functions possible, to help reduce cold starts. Because of this, it's unlikely that you'll hit the limit of 12 bundled Vercel Functions per deployment.

When using other [frameworks](/docs/frameworks), or Vercel Functions [directly without a framework](/docs/functions), every API maps directly to one Vercel Function. For example, having five files inside `api/` would create five Vercel Functions. For Hobby, this approach is limited to 12 Vercel Functions per deployment.

## Caching data

A runtime can retain an archive of up to **100 MB** of the filesystem at build time. The cache key is generated as a combination of:

- Project name
- [Team ID](/docs/accounts#find-your-team-id) or User ID
- Entrypoint path (e.g., `api/users/index.go`)
- Runtime identifier including version (e.g.: `@vercel/go@0.0.1`)

The cache will be invalidated if any of those items changes. You can bypass the cache by running `vercel -f`.

## Environment variables

You can use [environment variables](/docs/environment-variables#environment-variable-size) to manage dynamic values and sensitive information affecting the operation of your functions. Vercel allows developers to define these variables either at deployment or during runtime.

You can use a total of **64 KB** in environments variables per-deployment on Vercel. This limit is for all variables combined, and so no single variable can be larger than **64 KB**.

## Vercel features support

The following features are supported by Vercel Functions:

### Secure Compute

Vercel's [Secure Compute](/docs/secure-compute) feature offers enhanced security for your Vercel Functions, including dedicated IP addresses and VPN options. This can be particularly important for functions that handle sensitive data.

### Streaming

Streaming refers to the ability to send or receive data in a continuous flow.

The Node.js runtime supports streaming by default. Streaming is also supported when using the [Python runtime](/docs/functions/streaming-functions#streaming-python-functions).

Vercel Functions have a [maximum duration](/docs/functions/configuring-functions/duration), meaning that it isn't possible to stream indefinitely.

Node.js and Edge runtime streaming functions support the [`waitUntil` method](/docs/functions/functions-api-reference/vercel-functions-package#waituntil), which allows for an asynchronous task to be performed during the lifecycle of the request. This means that while your function will likely run for the same amount of time, your end-users can have a better, more interactive experience.

### Cron jobs

[Cron jobs](/docs/cron-jobs) are time-based scheduling tools used to automate repetitive tasks. When a cron job is triggered through the [cron expression](/docs/cron-jobs#cron-expressions), it calls a Vercel Function.

### Vercel Storage

From your function, you can communicate with a choice of [data stores](/docs/storage). To ensure low-latency responses, it's crucial to have compute close to your databases. Always deploy your databases in regions closest to your functions to avoid long network roundtrips. For more information, see our [best practices](/docs/storage#locate-your-data-close-to-your-functions) documentation.

### Edge Config

An [Edge Config](/docs/edge-config) is a global data store that enables experimentation with feature flags, A/B testing, critical redirects, and IP blocking. It enables you to read data at the edge without querying an external database or hitting upstream servers.

### Tracing

Vercel supports [Tracing](/docs/tracing) that allows you to send OpenTelemetry traces from your Vercel Functions to any application performance monitoring (APM) vendors.


---

[View full sitemap](/docs/sitemap)
