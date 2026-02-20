---
title: Vercel Functions Limits
product: vercel
url: /docs/functions/limitations
type: reference
prerequisites:
  - /docs/functions
related:
  - /docs/functions/configuring-functions/duration
  - /docs/fluid-compute
  - /docs/functions/runtimes
  - /docs/functions/concurrency-scaling
  - /docs/functions/regions
summary: Learn about the limits and restrictions of using Vercel Functions with the Node.js runtime.
---

# Vercel Functions Limits

The table below outlines the limits and restrictions of using Vercel Functions with the Node.js runtime:

| Feature                                                                          | Node.js                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Maximum memory](/docs/functions/limitations#memory-size-limits)                 | Hobby: 2 GB, Pro and Ent: 4 GB                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Maximum duration](/docs/functions/limitations#max-duration)                     | Hobby: 300s (default) - [configurable up to 300s](/docs/functions/configuring-functions/duration), Pro: 300s (default) - [configurable](/docs/functions/configuring-functions/duration) up to 800s, Ent: 300s (default) - [configurable](/docs/functions/configuring-functions/duration) up to 800s. If [fluid compute](/docs/fluid-compute) is enabled, these values are increased across plans. See [max durations](/docs/functions/limitations#max-duration) for more information. |
| [Size](/docs/functions/runtimes#bundle-size-limits) (after gzip compression)     | 250 MB                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [Concurrency](/docs/functions/concurrency-scaling#automatic-concurrency-scaling) | Auto-scales up to 30,000 (Hobby and Pro) or 100,000+ (Enterprise) concurrency                                                                                                                                                                                                                                                                                                                                                                                                         |
| [Cost](/docs/functions/runtimes)                                                 | Pay for active CPU time and provisioned memory time                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| [Regions](/docs/functions/runtimes#location)                                     | Executes region-first, [can customize location](/docs/functions/regions#select-a-default-serverless-region). Enterprise teams can set [multiple regions](/docs/functions/regions#set-multiple-serverless-regions)                                                                                                                                                                                                                                                               |
| [API Coverage](/docs/functions/limitations#api-support)                          | Full Node.js coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| [File descriptors](/docs/functions/limitations#file-descriptors)                 | 1,024 shared across concurrent executions (including runtime usage)                                                                                                                                                                                                                                                                                                                                                                                                                   |

## Functions name

The following limits apply to the function's name when using [Node.js runtime](/docs/functions/runtimes/node-js):

- Maximum length of 128 characters. This includes the extension of the file (e.g. `apps/admin/api/my-function.js` is 29 characters)
- No spaces are allowed. Replace them with a `-` or `_` (e.g. `api/my function.js` isn't allowed)

## Bundle size limits

Vercel places restrictions on the maximum size of the deployment bundle for functions to ensure that they execute in a timely manner.

For Vercel Functions, the maximum uncompressed size is **250 MB** including layers which are automatically used depending on [runtimes](/docs/functions/runtimes). These limits are [enforced by AWS](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html).

You can use [`includeFiles` and `excludeFiles`](/docs/project-configuration#functions) to specify items which may affect the function size, however the limits cannot be configured. These configurations are not supported in Next.js, instead use [`outputFileTracingIncludes`](https://nextjs.org/docs/app/api-reference/next-config-js/output).

## Max duration

This refers to the longest time a function can process an HTTP request before responding.

While Vercel Functions have a default duration, this duration can be extended using the [maxDuration config](/docs/functions/configuring-functions/duration). If a Vercel Function doesn't respond within the duration, a 504 error code ([`FUNCTION_INVOCATION_TIMEOUT`](/docs/errors/FUNCTION_INVOCATION_TIMEOUT)) is returned.

With [fluid compute](/docs/fluid-compute) enabled, Vercel Functions have the following defaults and maximum limits (applies to the Node.js and Python runtimes):

### Node.js and python runtimes

|            | Default          | Maximum           |
| ---------- | ---------------- | ----------------- |
| Hobby      | 300s (5 minutes) | 300s (5 minutes)  |
| Pro        | 300s (5 minutes) | 800s (13 minutes) |
| Enterprise | 300s (5 minutes) | 800s (13 minutes) |

### Edge runtime

Vercel Functions using the [Edge runtime](/docs/functions/runtimes/edge) must begin sending a response within 25 seconds to maintain streaming capabilities beyond this period, and can continue [streaming](/docs/functions/streaming-functions) data for up to 300 seconds.

## Memory size limits

Vercel Functions have the following defaults and maximum limits:

|                 | Default       | Maximum       |
| --------------- | ------------- | ------------- |
| Hobby           | 2 GB / 1 vCPU | 2 GB / 1 vCPU |
| Pro /Enterprise | 2 GB / 1 vCPU | 4 GB / 2 vCPU |

Users on Pro and Enterprise plans can [configure the default memory size](/docs/functions/configuring-functions/memory#setting-your-default-function-memory-/-cpu-size) for all functions in the dashboard.

The maximum size for a Function includes your JavaScript code, imported libraries and files (such as fonts), and all files bundled in the function.

If you reach the limit, make sure the code you are importing in your function is used
and is not too heavy. You can use a package size checker tool like [bundle](https://bundle.js.org/) to
check the size of a package and search for a smaller alternative.

## Request body size

In Vercel, the request body size is the maximum amount of data that can be included in the body of a request to a function.

The maximum payload size for the request body or the response body of a Vercel Function is **4.5 MB**. If a Vercel Function receives a payload in excess of the limit it will return an error [413: `FUNCTION_PAYLOAD_TOO_LARGE`](/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE). See [How do I bypass the 4.5MB body size limit of Vercel Functions](/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions) for more information.

## File descriptors

File descriptors are unique identifiers that the operating system uses to track and manage open resources like files, network connections, and I/O streams. Think of them as handles or references that your application uses to interact with these resources. Each time your code opens a file, establishes a network connection, or creates a socket, the system assigns a file descriptor to track that resource.

Vercel Functions have a limit of **1,024 file descriptors** shared across all concurrent executions. This limit includes file descriptors used by the runtime itself, so the actual number available to your application code will be strictly less than 1,024.

File descriptors are used for:

- Open files
- Network connections (TCP sockets, HTTP requests)
- Database connections
- File system operations

If your function exceeds this limit, you might encounter errors related to "too many open files" or similar resource exhaustion issues.

To manage file descriptors effectively, consider the following:

- Close files, database connections, and HTTP connections when they're no longer needed
- Use connection pooling for database connections
- Implement proper resource cleanup in your function code

## API support

|                        | Node.js runtime (and more)                               |
| ---------------------- | -------------------------------------------------------- |
| Geolocation data       | [Yes](/docs/headers/request-headers#x-vercel-ip-country) |
| Access request headers | Yes                                                      |
| Cache responses        | [Yes](/docs/cdn-cache#using-vercel-functions)            |

## Cost and usage

The Hobby plan offers functions for free, within [limits](/docs/limits). The Pro plan extends these limits, and charges usage based on active CPU time and provisioned memory time for Vercel Functions.

Active CPU time is based on the amount of CPU time your code actively consumes, measured in milliseconds. Waiting for I/O (e.g. calling AI models, database queries) does not count towards active CPU time. Provisioned memory time is based on the memory allocated to your function instances multiplied by the time they are running.

It is important to make sure you've set a reasonable [maximum duration](/docs/functions/configuring-functions/duration) for your function. See "Managing usage and pricing for [Vercel Functions](/docs/pricing/serverless-functions)" for more information.

## Environment variables

If you have [fluid compute](/docs/fluid-compute) enabled, the following environment variables are not accessible and you cannot log them:

- `AWS_EXECUTION_ENV`
- `AWS_LAMBDA_EXEC_WRAPPER`
- `AWS_LAMBDA_FUNCTION_MEMORY_SIZE`
- `AWS_LAMBDA_FUNCTION_NAME`
- `AWS_LAMBDA_FUNCTION_VERSION`
- `AWS_LAMBDA_INITIALIZATION_TYPE`
- `AWS_LAMBDA_LOG_GROUP_NAME`
- `AWS_LAMBDA_LOG_STREAM_NAME`
- `AWS_LAMBDA_RUNTIME_API`
- `AWS_XRAY_CONTEXT_MISSING`
- `AWS_XRAY_DAEMON_ADDRESS`
- `LAMBDA_RUNTIME_DIR`
- `LAMBDA_TASK_ROOT`
- `_AWS_XRAY_DAEMON_ADDRESS`
- `_AWS_XRAY_DAEMON_PORT`
- `_HANDLER`
- `_LAMBDA_TELEMETRY_LOG_FD`


---

[View full sitemap](/docs/sitemap)
