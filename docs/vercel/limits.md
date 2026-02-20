---
title: Limits
product: vercel
url: /docs/limits
type: reference
prerequisites:
  []
related:
  - /docs/functions/runtimes
  - /docs/deployments/concurrent-builds
  - /docs/builds/managing-builds
  - /docs/cron-jobs/usage-and-pricing
  - /docs/image-optimization/legacy-pricing
summary: This reference covers a list of all the limits and limitations that apply on Vercel.
---

# Limits

## General limits

To prevent abuse of our platform, we apply the following limits to all accounts.

|                                                                                           | Hobby                                                                              | Pro                                                             | Enterprise                                                      |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------- |
| Projects                                                                                  | 200                                                                                | Unlimited                                                       | Unlimited                                                       |
| Deployments Created per Day                                                               | 100                                                                                | 6000                                                            | Custom                                                          |
| Serverless Functions Created per Deployment                                               | [Framework-dependent\*](/docs/functions/runtimes#functions-created-per-deployment) | ∞                                                               | ∞                                                               |
| [Proxied Request Timeout](#proxied-request-timeout) (Seconds)                             | 120                                                                                | 120                                                             | 120                                                             |
| Deployments Created from CLI per Week                                                     | 2000                                                                               | 2000                                                            | Custom                                                          |
| [Vercel Projects Connected per Git Repository](#connecting-a-project-to-a-git-repository) | 10                                                                                 | 60                                                              | Custom                                                          |
| [Routes created per Deployment](#routes-created-per-deployment)                           | 2048                                                                               | 2048                                                            | Custom                                                          |
| [Build Time per Deployment](#build-time-per-deployment) (Minutes)                         | 45                                                                                 | 45                                                              | 45                                                              |
| [Static File uploads](#static-file-uploads)                                               | 100 MB                                                                             | 1 GB                                                            | N/A                                                             |
| [Concurrent Builds](/docs/deployments/concurrent-builds)                                  | 1                                                                                  | 12                                                              | Custom                                                          |
| Disk Size (GB)                                                                            | 23                                                                                 | 23 up to [64](/docs/builds/managing-builds#build-machine-types) | 23 up to [64](/docs/builds/managing-builds#build-machine-types) |
| Cron Jobs (per project)                                                                   | [100\*](/docs/cron-jobs/usage-and-pricing)                                         | 100                                                             | 100                                                             |

## Included usage

|                                                                                           | Hobby       | Pro  |
| ----------------------------------------------------------------------------------------- | ----------- | ---- |
| Active CPU                                                                                | 4 CPU-hrs   | N/A  |
| Provisioned Memory                                                                        | 360 GB-hrs  | N/A  |
| Invocations                                                                               | 1 million   | N/A  |
| Fast Data Transfer                                                                        | 100 GB      | 1 TB |
| Fast Origin Transfer                                                                      | Up to 10 GB | N/A  |
| Build Execution                                                                           | 100 Hrs     | N/A  |
| [Image Optimization Source Images](/docs/image-optimization/legacy-pricing#source-images) | 1000 Images | N/A  |

For Teams on the Pro plan, you can pay for [usage](/docs/limits#additional-resources) on-demand.

## On-demand resources for Pro

For members of our Pro plan, we offer an included credit that can be used across all resources and a pay-as-you-go model for additional consumption, giving you greater flexibility and control over your usage. The typical monthly usage guidelines above are still applicable, while extra usage will be automatically charged at the following rates:

| Resource | Price | Included (Pro) |
|----------|-------|----------------|
| [Fast Data Transfer](/docs/pricing/regional-pricing) | Regional | First 1 TB |
| [Function Invocations](/docs/functions/usage-and-pricing#managing-function-invocations) | $0.60 per 1,000,000 Invocations | First 1,000,000 |
| [Fast Origin Transfer](/docs/pricing/regional-pricing) | Regional | N/A |
| [Edge Requests](/docs/pricing/regional-pricing) | Regional | First 10,000,000 |
| [Image Optimization Source Images (Legacy)](/docs/image-optimization/legacy-pricing#source-images) | $5.00 per 1,000 Images | First 5,000 |
| [Edge Request Additional CPU Duration](/docs/pricing/regional-pricing) | Regional | 1 Hour |
| [Edge Config Reads](/docs/edge-config/using-edge-config) | $3.00 | First 1,000,000 |
| [Edge Config Writes](/docs/edge-config/using-edge-config) | $1.00 | First 1,000 |
| [Web Analytics Events](/docs/analytics/limits-and-pricing#what-is-an-event-in-vercel-web-analytics) | $0.00003 per Event | First 100,000 Events |
| [Image Optimization Transformations](/docs/image-optimization) | Regional | 10K/month |
| [Image Optimization Cache Reads](/docs/image-optimization) | Regional | 600K/month |
| [Speed Insights Data Points](/docs/speed-insights/metrics#understanding-data-points) | $0.65 | First 10,000 |
| [Image Optimization Cache Writes](/docs/image-optimization) | Regional | 200K/month |
| [WAF Rate Limiting](/docs/vercel-firewall/vercel-waf/rate-limiting) | Regional | First 1,000,000 Allowed Requests |
| [Monitoring Events](/docs/monitoring/limits-and-pricing#how-are-events-counted) | $1.20 per 1,000,000 Events | 250,000 Included |
| [Observability Plus Events](/docs/observability#tracked-events) | $1.20 per 1,000,000 Data Events | 1,000,000 Included |
| [OWASP CRS per request number](/docs/vercel-firewall/vercel-waf/managed-rulesets) | Regional | N/A |
| [OWASP CRS per request size](/docs/vercel-firewall/vercel-waf/managed-rulesets) | Regional | 4KB of each inspected request |
| [Blob Storage Size](/docs/vercel-blob/usage-and-pricing#pricing) | Regional | 5GB/month |
| [Blob Simple Operations](/docs/vercel-blob/usage-and-pricing#pricing) | Regional | First 100,000 |
| [Blob Advanced Operations](/docs/vercel-blob/usage-and-pricing#pricing) | Regional | First 10,000 |
| [Blob Data Transfer](/docs/vercel-blob/usage-and-pricing#pricing) | Regional | First 100 GB |
| [Private Data Transfer](/docs/connectivity/static-ips) | Regional | N/A |
| [Workflow Storage](/docs/workflow#pricing) | $0.00069 per GB-Hour | Based on usage |
| [Workflow Steps](/docs/workflow#pricing) | $2.50 per 100,000 Steps | Based on usage |
| [Drains](/docs/drains#usage-and-pricing) | $0.50 per 1 GB | N/A |
| [ISR Reads](/docs/runtime-cache) | Regional | First 10,000,000 |
| [ISR Writes](/docs/runtime-cache) | Regional | First 2,000,000 |


## Pro trial limits

See the [Pro trial limitations](/docs/plans/pro-plan/trials#trial-limitations) section for information on the limits that apply to Pro trials.

## Routes created per deployment

The limit of "Routes created per Deployment" encapsulates several options that can be configured on Vercel:

- If you are using a `vercel.json` configuration file, each [rewrite](/docs/project-configuration#rewrites), [redirect](/docs/project-configuration#redirects), or [header](/docs/project-configuration#headers) is counted as a Route
- If you are using the [Build Output API](/docs/build-output-api/v3), you might configure [routes](/docs/build-output-api/v3/configuration#routes) for your deployments

Note that most frameworks will create Routes automatically for you. For example, Next.js will create a set of Routes corresponding to your use of [dynamic routes](https://nextjs.org/docs/routing/dynamic-routes), [redirects](https://nextjs.org/docs/app/building-your-application/routing/redirecting), [rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites) and [custom headers](https://nextjs.org/docs/api-reference/next.config.js/headers).

## Build time per deployment

The maximum duration of the [Build Step](/docs/deployments/configure-a-build) is 45 minutes.
When the limit is reached, the Build Step will be interrupted and the Deployment will fail.

### Build container resources

Every build container has a fixed amount of resources available to it. You can find the resources available for each build machine type [here](/docs/builds/managing-builds#larger-build-machines).

For more information on troubleshooting these, see [Build container resources](/docs/deployments/troubleshoot-a-build#build-container-resources).

## Static file uploads

When using the CLI to deploy, the maximum size of the source files that can be uploaded is limited to 100 MB for Hobby and 1 GB for Pro. If the size of the source files exceeds this limit, the deployment will fail.

### Build cache maximum size

The maximum size of the Build's cache is 1 GB. It is retained for one month and it applies at the level of each [Build cache key](/docs/deployments/troubleshoot-a-build#caching-process).

## Monitoring

Check out [the limits and pricing section](/docs/observability/monitoring/limits-and-pricing) for more details about the limits of the [Monitoring](/docs/observability/monitoring) feature on Vercel.

## Logs

There are two types of logs: **build logs** and **runtime logs**. Both have different behaviors when storing logs.

[Build logs](/docs/deployments/logs) are stored indefinitely for each deployment.

[Runtime logs](/docs/runtime-logs) are stored for **1 hour** on Hobby, **1 day** on Pro, and for **3 days** on Enterprise accounts. To learn more about these log limits, [read here](/docs/runtime-logs#limits).

## Environment variables

The maximum number of [Environment Variables](/docs/environment-variables) per environment per [Project](/docs/projects/overview)
is `1000`. For example, you cannot have more than `1000` Production Environment Variables.

The total size of your Environment Variables, names and values, is limited to **64KB** for projects using Node.js, Python, Ruby, Go, Java, and .NET runtimes. This limit is the total allowed for each deployment, and is also the maximum size of any single Environment Variable. For more information, see the [Environment Variables](/docs/environment-variables#environment-variable-size) documentation.

If you are using [System Environment Variables](/docs/environment-variables/system-environment-variables), the framework-specific ones (i.e. those prefixed by the framework name) are exposed only during the Build Step, but not at runtime. However, the non-framework-specific ones are exposed at runtime. Only the Environment Variables that are exposed at runtime are counted towards the size limit.

## Domains

|                     | Hobby | Pro         | Enterprise  |
| ------------------- | ----- | ----------- | ----------- |
| Domains per Project | 50    | Unlimited\* | Unlimited\* |

- To prevent abuse, Vercel implements soft limits of 100,000 domains per project for the Pro plan and 1,000,000 domains for the Enterprise plan. These limits are flexible and can be increased upon request. If you need more domains, please [contact our support team](/help) for assistance.

## Files

The maximum number of files that can be uploaded when creating a CLI [Deployment](/docs/deployments) is `15,000` for source files. Deployments that contain more files than the limit will fail at the [build step](/docs/deployments/configure-a-build).

Although there is no upper limit for output files created during a build, you can expect longer build times as a result of having many thousands of output files (100,000 or more, for example). If the build time exceeds 45 minutes then the build will fail.

We recommend using [Incremental Static Regeneration](/docs/incremental-static-regeneration) (ISR) to help reduce build time. Using ISR will allow you pre-render a subset of the total number of pages at build time, giving you faster builds and the ability to generate pages on-demand.

## Proxied request timeout

The amount of time (in seconds) that a proxied request (`rewrites` or `routes` with an external destination) is allowed to process an HTTP request. The maximum timeout is **120 seconds** (2 minutes).
If the external server does not reply until the maximum timeout is reached, an error with the message `ROUTER_EXTERNAL_TARGET_ERROR` will be returned.

## WebSockets

[Vercel Functions](/docs/functions) do not support acting as a WebSocket server.

We recommend third-party [solutions](/kb/guide/publish-and-subscribe-to-realtime-data-on-vercel) to enable realtime communication for [Deployments](/docs/deployments).

## Web Analytics

Check out the [Limits and Pricing section](/docs/analytics/limits-and-pricing) for more details about the limits of Vercel Web Analytics.

## Speed Insights

Check out the [Limits and Pricing](/docs/speed-insights/limits-and-pricing) doc for more details about the limits of the Speed Insights feature on Vercel.

## Cron Jobs

Check out the Cron Jobs [limits](/docs/cron-jobs/usage-and-pricing) section for more information about the limits of Cron Jobs on Vercel.

## Vercel Functions

The limits of Vercel functions are based on the [runtime](/docs/functions/runtimes) that you use.

For example, different runtimes allow for different [bundle sizes](/docs/functions/runtimes#bundle-size-limits), [maximum duration](/docs/functions/runtimes/edge#maximum-execution-duration), and [memory](/docs/functions/runtimes#memory-size-limits).

## Connecting a project to a Git repository

​Vercel does not support connecting a project on your Hobby team to Git repositories owned by Git organizations. You can either switch to an existing Team or create a new one.

The same limitation applies in the Project creation flow when importing an existing Git repository or when cloning a Vercel template to a new Git repository as part of your Git organization.

## Reserved variables

See the [Reserved Environment Variables](/docs/environment-variables/reserved-environment-variables) docs for more information.

## Rate limits

**Rate limits** are hard limits that apply to the platform when performing actions that require a response from our [API](/docs/rest-api#api-basics).

The **rate limits** table consists of the following four columns:

- **Description** - A brief summary of the limit which, where relevant, will advise what type of plan it applies to.
- **Limit** - The amount of actions permitted within the amount of time (**Duration**) specified.
- **Duration** - The amount of time (seconds) in which you can perform the specified amount of actions. Once a rate limit is hit, it will be reset after the **Duration** has expired.
- **Scope** - How the rate limit is applied:
  - `owner` - Rate limit applies to the team or to an individual user, depending on the resource.
  - `user` - Rate limit applies to an individual user.
  - `team` - Rate limit applies to the team.

### Rate limit examples

Below are five examples that provide further information on how rate limits work.

#### Domain deletion

You are able to delete up to `60` domains every `60` seconds (1 minute). Should you hit the rate limit, you will need to wait another minute before you can delete another domain.

#### Team deletion

You are able to delete up to `20` teams every `3600` seconds (1 hour). Should you hit the rate limit, you will need to wait another hour before you can delete another team.

#### Username change

You are able to change your username up to `6` times every `604800` seconds (1 week). Should you hit the rate limit, you will need to wait another week before you can change your username again.

#### Builds per hour (Hobby)

You are able to build `32` [Deployments](/docs/deployments) every `3600` seconds (1 hour). Should you hit the rate limit, you will need to wait another hour before you can build a deployment again.

> **💡 Note:** Using Next.js or any similar framework to build your deployment is classed as
> a build. Each Vercel Function is also classed as a build. Hosting static files
> such as an index.html file is not classed as a build.

#### Deployments per day (Hobby)

You are able to deploy `100` times every `86400` seconds (1 day). Should you hit the rate limit, you will need to wait another day before you can deploy again.

***

| Description | Limit | Duration (Seconds) | Scope |
|-------------|-------|-------------------|-------|
| Abuse report creation per minute. | 200 | 60 | `owner` |
| Artifacts requests per minute (Free). | 100 | 60 | `owner` |
| Requests per minute to fetch the microfrontends groups for a team. | 30 | 60 | `owner` |
| Requests per minute to fetch the microfrontends config for a team. | 30 | 60 | `owner` |
| Requests per minute to fetch the deployment of the best default app. | 30 | 60 | `owner` |
| Artifacts requests per minute (Paid). | 10000 | 60 | `owner` |
| Project production deployment per minute. | 500 | 60 | `user` |
| Project expiration updates per minute. | 100 | 60 | `owner` |
| Project release configuration updates per minute. | 100 | 60 | `owner` |
| Project domains get per minute. | 500 | 60 | `user` |
| Get project domains count per minute. | 100 | 60 | `user` |
| Project domains verification per minute. | 100 | 60 | `user` |
| Project branches get per minute. | 100 | 60 | `user` |
| Project branches get search per minute. | 500 | 60 | `user` |
| Project domain creation, update, or remove per minute. | 100 | 60 | `owner` |
| Project protection bypass creation, update, or remove per minute. | 100 | 60 | `owner` |
| Listing Deployment Protection Exceptions per minute | 250 | 60 | `owner` |
| Project environment variable retrieval per minute. | 500 | 60 | `owner` |
| Project environment variable updates per minute. | 120 | 60 | `owner` |
| Team enable new standard protection for all projects updates per minute. | 10 | 60 | `owner` |
| Project environment variable creation per minute. | 120 | 60 | `owner` |
| Project environment variable deletions per minute. | 60 | 60 | `owner` |
| Project client certificate uploads per minute. | 5 | 60 | `owner` |
| Project client certificate deletions per minute. | 5 | 60 | `owner` |
| Project client certificate retrievals per minute. | 300 | 60 | `owner` |
| Project environment variable batch deletions per minute. | 60 | 60 | `owner` |
| Project environment variable pulls per minute. | 500 | 60 | `owner` |
| Custom deployment suffix changes per hour. | 5 | 3600 | `owner` |
| Deploy hook triggers per hour. | 60 | 3600 | `owner` |
| Deployments retrieval per minute. | 500 | 60 | `user` |
| Deployments retrieval per minute (Enterprise). | 2000 | 60 | `user` |
| Deployments per day (Free). | 100 | 86400 | `owner` |
| Deployments per day (Pro). | 6000 | 86400 | `owner` |
| Deployments per day (Enterprise). | 24000 | 86400 | `owner` |
| Deployments per hour (Free). | 100 | 3600 | `owner` |
| Deployments per hour (Pro). | 450 | 3600 | `owner` |
| Deployments per hour (Enterprise). | 1800 | 3600 | `owner` |
| Deployments per five minutes (Free). | 60 | 300 | `owner` |
| Deployments per five minutes (Pro). | 120 | 300 | `owner` |
| Deployments per five minutes (Enterprise). | 300 | 300 | `owner` |
| Deployment user access check per minute. | 100 | 60 | `user` |
| Deployment undeletes per minute. | 100 | 60 | `owner` |
| Skipped deployments per minute. | 100 | 60 | `user` |
| AI domain search per minute. | 20 | 60 | `user` |
| Domains deletion per minute. | 100 | 60 | `owner` |
| Domain price per minute. | 100 | 60 | `user` |
| Domains retrieval per minute. | 200 | 60 | `user` |
| Domains retrieval per minute. | 500 | 60 | `user` |
| Domain's transfer auth code. | 50 | 60 | `user` |
| Domain's transfer auth code. | 10 | 60 | `user` |
| Domain contact verification status retrieval per minute. | 20 | 60 | `user` |
| Domains dns config retrieval per minute. | 500 | 60 | `user` |
| Domains update per minute. | 60 | 60 | `owner` |
| Domains creation per hour. | 120 | 3600 | `owner` |
| Domain delegation requests per day. | 20 | 86400 | `owner` |
| Automatic domain delegation requests per minute. | 10 | 60 | `owner` |
| Enterprise domain delegation requests per minute. | 10 | 60 | `owner` |
| Domains record update per minute. | 50 | 60 | `owner` |
| Domains record creation per hour. | 100 | 3600 | `owner` |
| Domains status retrieval per minute. | 150 | 60 | `owner` |
| Domains availability retrieval per minute. | 60 | 60 | `user` |
| Domain verification record retrieval per minute. | 60 | 60 | `owner` |
| Domain ownership claim attempts per minute. | 10 | 60 | `owner` |
| Domain save attempts per minute. | 20 | 60 | `user` |
| Domain unsave attempts per minute. | 20 | 60 | `user` |
| Events retrieval per minute. | 60 | 60 | `user` |
| Event types listing per minute. | 60 | 60 | `user` |
| Events retrieval per minute. | 10 | 60 | `user` |
| Download Audit Log exports per minute. | 5 | 60 | `user` |
| Setup up Audit Log Stream per minute | 10 | 60 | `user` |
| Plan retrieval per minute. | 120 | 60 | `owner` |
| Plan update per hour. | 60 | 3600 | `owner` |
| Requests to self-unblock per hour. | 5 | 3600 | `owner` |
| Team deletion per hour. | 20 | 3600 | `user` |
| Team retrieval per minute. | 600 | 60 | `user` |
| Team retrieval per minute. | 600 | 60 | `user` |
| Team update per hour. | 100 | 3600 | `user` |
| Requests per minute to patch the microfrontends groups for a team. | 10 | 60 | `user` |
| Team SSO configuration per hour. | 100 | 3600 | `user` |
| Team creation per day (Free). | 5 | 86400 | `user` |
| Team creation per day (Paid). | 25 | 86400 | `user` |
| Team slug creation per hour. | 200 | 3600 | `user` |
| Team slug update per week. | 6 | 604800 | `owner` |
| Team exclusivity creation per team per hour. | 10 | 3600 | `owner` |
| Team exclusivity update per team per hour. | 10 | 3600 | `owner` |
| Team exclusivity delete per team per hour. | 10 | 3600 | `owner` |
| Team exclusivity list per user per minute. | 120 | 60 | `user` |
| Git exclusivity get per user per minute. | 120 | 60 | `user` |
| Preview Deployment Suffix updates per day. | 10 | 86400 | `owner` |
| Team member deletion per ten minutes. | 500 | 600 | `owner` |
| Team member retrieval per minute. | 120 | 60 | `owner` |
| Team member update per ten minutes. | 40 | 600 | `owner` |
| Team member creation per hour (Free). | 50 | 3600 | `owner` |
| Team member creation per hour (Paid). | 150 | 3600 | `owner` |
| Team member creation per hour (Enterprise). | 300 | 3600 | `owner` |
| Team member creation (batch) | 1 | 1 | `owner` |
| Team invite requests per hour. | 10 | 3600 | `user` |
| Team invite retrieval per minute. | 120 | 60 | `owner` |
| Requests to bulk update project retention per minute. | 1 | 60 | `owner` |
| Requests to list teams eligible for merge per minute. | 60 | 60 | `user` |
| Requests to get the status of a merge per minute. | 120 | 60 | `user` |
| Requests to create merge plans per minute. | 20 | 60 | `user` |
| Requests to create merge plans per minute. | 20 | 60 | `user` |
| Organizations retrieval per minute. | 120 | 60 | `user` |
| User retrieval per minute. | 500 | 60 | `owner` |
| User update per minute. | 60 | 60 | `owner` |
| Username update per week. | 6 | 604800 | `owner` |
| Uploads per day (Free). | 5000 | 86400 | `owner` |
| Uploads per day (Pro). | 40000 | 86400 | `owner` |
| Uploads per day (Enterprise). | 80000 | 86400 | `owner` |
| Token retrieval per minute. | 120 | 60 | `owner` |
| Token creation per hour. | 32 | 3600 | `owner` |
| Token deletion per five minutes. | 50 | 300 | `owner` |
| Payment method update per day. | 10 | 86400 | `owner` |
| Payment method setup per hour | 10 | 3600 | `owner` |
| Balance due retrieval per minute. | 70 | 60 | `owner` |
| Upcoming invoice retrieval per minute. | 70 | 60 | `owner` |
| Invoice Settings updates per ten minutes. | 10 | 600 | `owner` |
| Concurrent Builds updates per ten minutes. | 10 | 600 | `owner` |
| Monitoring updates per ten minutes. | 10 | 600 | `owner` |
| Web Analytics updates per ten minutes. | 10 | 600 | `owner` |
| Preview Deployment Suffix updates per ten minutes. | 10 | 600 | `owner` |
| Advanced Deployment Protection updates per ten minutes. | 10 | 600 | `owner` |
| Retry payment per ten minutes. | 25 | 600 | `owner` |
| Alias retrieval per ten minutes. | 300 | 600 | `user` |
| Alias creation per ten minutes. | 120 | 600 | `owner` |
| Aliases list per minute. | 500 | 60 | `user` |
| Aliases deletion per minute. | 100 | 60 | `owner` |
| Certificate deletion per ten minutes. | 60 | 600 | `owner` |
| Certificate retrieval per minute. | 500 | 60 | `user` |
| Certificate update per hour. | 30 | 3600 | `owner` |
| Certificate creation per hour. | 30 | 3600 | `owner` |
| User supplied certificate update per hour. | 30 | 60 | `owner` |
| Deployments list per minute. | 1000 | 60 | `user` |
| Deployments configuration list per minute. | 100 | 60 | `owner` |
| Deployments deletion per ten minutes. | 200 | 600 | `owner` |
| Integration job creation per five minutes. | 100 | 300 | `owner` |
| Integration retrieval per minute (All). | 100 | 60 | `user` |
| Integration retrieval per minute (Single). | 100 | 60 | `user` |
| Integration creation per minute. | 120 | 3600 | `user` |
| Integration update per minute. | 120 | 3600 | `user` |
| Integration deletion per minute. | 120 | 3600 | `user` |
| Integration deployment action updates per minute. | 100 | 60 | `user` |
| Marketplace integration installations per minute. | 120 | 3600 | `user` |
| Marketplace integration uninstallations per minute. | 120 | 3600 | `user` |
| Marketplace integration secrets rotation requests per minute. | 120 | 60 | `user` |
| Marketplace integration transfers per minute. | 120 | 3600 | `user` |
| Marketplace purchase provisions per minute. | 120 | 3600 | `user` |
| Resource drains retrieval per minute. | 100 | 60 | `user` |
| Marketplace config retrieval per minute. | 100 | 60 | `ip` |
| Marketplace config updates per minute. | 20 | 60 | `owner` |
| Marketplace featured image uploads per minute. | 10 | 60 | `user` |
| Integration product get per minute. | 120 | 60 | `user` |
| Integration products get per minute. | 120 | 60 | `user` |
| Integration product delete per minute. | 120 | 3600 | `user` |
| Integration product create per minute. | 120 | 3600 | `user` |
| Integration product create per minute. | 120 | 3600 | `user` |
| Integration product billing plans retrieval per minute. | 120 | 3600 | `user` |
| Integration installation billing plans retrieval per minute. | 120 | 3600 | `user` |
| Integration resource billing plans retrieval per minute. | 120 | 3600 | `user` |
| Integration resource usage retrieval per minute. | 120 | 3600 | `user` |
| Store-to-project connection per minute. | 120 | 3600 | `user` |
| Integration SSO redirect URI create per minute. | 20 | 60 | `user` |
| Integration MCP access token requests. | 2 | 60 | `user` |
| Integration MCP access token requests when cached. | 200 | 60 | `user` |
| MCP domain search requests per minute per IP. | 100 | 60 | `user` |
| Installation Resource secrets update per minute. | 240 | 60 | `user` |
| Installation Resource import per minute. | 100 | 60 | `user` |
| Installation account info retrieval per minute. | 60 | 60 | `user` |
| Installation event create per minute. | 60 | 60 | `user` |
| Integration favorite retrieval per minute. | 100 | 60 | `user` |
| Integration favorite update per minute. | 120 | 3600 | `user` |
| Integration configuration creation per minute. | 120 | 3600 | `owner` |
| Integration authorization creation per minute. | 120 | 3600 | `user` |
| Integration configuration retrieval per minute (All). | 200 | 60 | `user` |
| Integration configuration retrieval per minute (Single). | 120 | 60 | `user` |
| Most recent integration configuration retrieval per minute (Single). | 60 | 60 | `user` |
| Integration configuration permissions retrieval per minute (All). | 60 | 60 | `user` |
| Integration configuration update per minute. | 120 | 3600 | `owner` |
| Integration associated user transfers per minute. | 120 | 3600 | `user` |
| Integration configuration deletion per minute. | 120 | 3600 | `owner` |
| Integration metadata retrieval per minute. | 300 | 60 | `user` |
| Integration metadata creation per minute. | 300 | 60 | `user` |
| Integration metadata deletion per minute. | 60 | 60 | `user` |
| Integration logs retrieval per minute. | 100 | 60 | `user` |
| Integration logs creation per minute. | 20 | 60 | `user` |
| Integration logs deletion per minute. | 60 | 60 | `user` |
| Integration webhooks retrieval per minute. | 100 | 60 | `user` |
| Integration webhooks retrieval per minute. | 100 | 60 | `user` |
| Integration webhooks retrieval per minute. | 100 | 60 | `user` |
| Integration webhooks creation per minute. | 20 | 60 | `user` |
| Integration webhooks deletion per minute. | 60 | 60 | `user` |
| Integration app install status retrieval per minute. | 60 | 60 | `user` |
| Membership info retrievals per minute for an installation. | 1000 | 60 | `owner` |
| Membership info retrievals per minute for a user. | 60 | 60 | `user` |
| List of memberships retrieval per minute for a user. | 60 | 60 | `user` |
| Integration resource usage retrieval per minute. | 120 | 60 | `user` |
| Installation prepayment balance submissions per minute. | 10 | 60 | `user` |
| Installation billing data submissions per minute. | 10 | 60 | `user` |
| Installation invoice submissions per minute. | 10 | 60 | `user` |
| Marketplace installation updates per minute | 10 | 60 | `user` |
| Installation resources retrieval per minute. | 1000 | 60 | `user` |
| Installation resource deletion per minute. | 100 | 60 | `user` |
| Installation invoice retrieval per minute. | 60 | 60 | `user` |
| Integration resource retrieval per minute. | 1000 | 60 | `user` |
| Start resource import per minute. | 60 | 60 | `user` |
| Complete resource import per minute. | 60 | 60 | `user` |
| Integration payment method retrieval per minute. | 60 | 60 | `user` |
| Integration payment method update per minute. | 60 | 60 | `user` |
| Admin users for the installation. | 60 | 60 | `user` |
| Update admin users for the installation. | 60 | 60 | `user` |
| Create authorization for a marketplace purchase. | 30 | 60 | `user` |
| Check marketplace authorization state. | 500 | 60 | `user` |
| Get installation statistics for a marketplace integration. | 500 | 60 | `user` |
| Get installation statistics for a marketplace integration. | 500 | 60 | `user` |
| Get billing summary for a marketplace integration. | 500 | 60 | `user` |
| Get invoices by month for a marketplace integration. | 500 | 60 | `user` |
| Webhooks updates per minute. | 60 | 60 | `user` |
| Webhooks tests per minute. | 60 | 60 | `user` |
| Log Drain retrieval per minute. | 100 | 60 | `user` |
| Log Drain creation per minute. | 20 | 60 | `user` |
| Log Drain deletion per minute. | 60 | 60 | `user` |
| Log Drain test per minute. | 30 | 60 | `user` |
| Log Drain update per minute. | 30 | 60 | `user` |
| Drain create per minute. | 30 | 60 | `user` |
| Drain delete per minute. | 30 | 60 | `user` |
| Drain retrieval per minute. | 100 | 60 | `user` |
| Drain update per minute. | 30 | 60 | `user` |
| Drain test per minute. | 30 | 60 | `user` |
| Runtime Logs retrieval per minute. | 100 | 60 | `user` |
| Request Logs retrieval per minute. | 240 | 60 | `user` |
| Logs UI preset creation per minute. | 100 | 60 | `user` |
| Logs UI preset reads per minute. | 100 | 60 | `user` |
| Logs UI preset edits per minute. | 100 | 60 | `user` |
| Log Drain retrieval per minute. | 100 | 60 | `user` |
| Suggested teams retrieval per minute. | 30 | 60 | `user` |
| Integration installed retrieval per minute (All). | 20 | 60 | `user` |
| Integration otel endpoint creation/updates per minute. | 20 | 60 | `user` |
| Integration otel endpoint retrieval per minute. | 100 | 60 | `user` |
| Integration otel endpoint deletion per minute. | 60 | 60 | `user` |
| Check retrieval per minute. | 500 | 60 | `user` |
| Check retrieval per minute. | 500 | 60 | `user` |
| Checks retrieval per minute. | 300 | 60 | `owner` |
| Check retrieval per minute. | 300 | 60 | `owner` |
| Check runs retrieval per minute. | 500 | 60 | `owner` |
| Check runs for check retrieval per minute. | 500 | 60 | `owner` |
| Check runs retrieval per minute. | 500 | 60 | `owner` |
| State retrieval per minute. | 500 | 60 | `user` |
| Deployment integrations skip action. | 200 | 60 | `user` |
| Edge Config writes per day (Paid). | 480 | 86400 | `owner` |
| Edge Config writes per month (Free). | 250 | 2592000 | `owner` |
| Edge Config token changes per day. | 500 | 86400 | `owner` |
| Edge Config deletions per 5 minutes. | 60 | 300 | `owner` |
| Edge Configs reads per minute. | 500 | 60 | `owner` |
| Edge Config reads per minute. | 500 | 60 | `owner` |
| Edge Config Items reads per minute. | 20 | 60 | `owner` |
| Edge Config schema reads per minute. | 500 | 60 | `owner` |
| Edge Config schema updates per minute. | 60 | 60 | `owner` |
| Edge Config backup queries per minute. | 100 | 60 | `owner` |
| Edge Config backup retrievals per minute. | 60 | 60 | `owner` |
| Endpoint Verification retrieval per minute. | 100 | 60 | `user` |
| Secure Compute networks created per hour. | 5 | 3600 | `owner` |
| Secure Compute networks deleted per hour. | 25 | 3600 | `owner` |
| Secure Compute network lists per minute. | 250 | 60 | `owner` |
| Secure Compute network reads per minute. | 250 | 60 | `owner` |
| Secure Compute network updates per hour. | 25 | 3600 | `owner` |
| Recents create per minute. | 100 | 60 | `user` |
| Recents delete per minute. | 100 | 60 | `user` |
| Recents get retrieval per minute. | 100 | 60 | `user` |
| Update notification settings preferences. | 20 | 60 | `user` |
| Stores get retrieval per minute. | 200 | 60 | `user` |
| Accept storage terms of service. | 100 | 60 | `user` |
| Store get retrieval per minute. | 400 | 60 | `user` |
| Access credentials per minute. | 1000 | 60 | `user` |
| Blob stores create per minute. | 100 | 60 | `user` |
| Blob stores update per minute. | 100 | 60 | `user` |
| Blob stores delete per minute. | 100 | 60 | `user` |
| Postgres stores create per minute. | 100 | 60 | `user` |
| Postgres stores update per minute. | 100 | 60 | `user` |
| Postgres stores delete per minute. | 100 | 60 | `user` |
| Postgres stores warm-up per minute. | 100 | 60 | `user` |
| Stores connect per minute. | 100 | 60 | `user` |
| Stores disconnect per minute. | 100 | 60 | `user` |
| Integration stores create per minute. | 100 | 60 | `user` |
| Integration stores update per minute. | 100 | 60 | `user` |
| Integration stores delete per minute. | 100 | 60 | `user` |
| Integration stores repl commandse per minute. | 100 | 60 | `user` |
| Stores rotate default store token set per minute. | 100 | 60 | `user` |
| Transfer Stores per minute. | 100 | 60 | `user` |
| Vercel Blob Simple Operations per minute for Hobby plan. | 1200 | 60 | `team` |
| Vercel Blob Simple Operations per minute for Pro plan. | 7200 | 60 | `team` |
| Vercel Blob Simple Operations per minute for Enterprise plan. | 9000 | 60 | `team` |
| Vercel Blob Advanced Operations per minute for Hobby plan. | 900 | 60 | `team` |
| Vercel Blob Advanced Operations per minute for Pro plan. | 4500 | 60 | `team` |
| Vercel Blob Advanced Operations per minute for Enterprise plan. | 7500 | 60 | `team` |
| Ip Blocking create per minute. | 60 | 60 | `user` |
| Ip Blocking list executed per minute. | 100 | 60 | `user` |
| Ip Blocking reads executed per minute. | 100 | 60 | `user` |
| Ip Blocking delete per minute. | 100 | 60 | `user` |
| IP Bypass reads per minute. | 100 | 60 | `user` |
| IP Bypass updates per minute. | 30 | 60 | `user` |
| Attack Status | 20 | 60 | `user` |
| Project Bulk Redirect AI generations per minute | 60 | 60 | `owner` |
| Project Bulk Redirect reads per minute | 200 | 60 | `owner` |
| Project Bulk Redirect mutations per minute | 30 | 60 | `owner` |
| Project Bulk Redirect version reads per minute | 500 | 60 | `owner` |
| Project Bulk Redirect version updates per minute | 20 | 60 | `owner` |
| Project Bulk Redirect settings reads per minute | 300 | 60 | `owner` |
| Project Bulk Redirect settings updates per minute | 10 | 60 | `owner` |
| Project Routes reads per minute | 200 | 60 | `owner` |
| Project Routes mutations per minute | 60 | 60 | `owner` |
| Project Routes version reads per minute | 500 | 60 | `owner` |
| Project Routes version updates per minute | 20 | 60 | `owner` |
| Project Routes AI generations per minute | 60 | 60 | `owner` |
| Vade review configuration requests per minute. | 30 | 60 | `owner` |
| Vade tasks retrieval requests per minute. | 100 | 60 | `owner` |
| Vade runtime fix trigger requests per minute. | 100 | 60 | `owner` |
| Vade apply patch requests per minute. | 30 | 60 | `owner` |
| Vade ignore patch requests per minute. | 30 | 60 | `owner` |
| Vade code generation and follow-up requests per minute. | 20 | 60 | `owner` |
| Vade code threads retrieval requests per minute. | 100 | 60 | `owner` |
| Vade code messages retrieval requests per minute. | 100 | 60 | `owner` |
| Vade audit retrieval requests per minute. | 250 | 60 | `owner` |
| Vade audit creation requests per minute. | 30 | 60 | `owner` |
| Vade apply trial credits requests per minute. | 10 | 60 | `owner` |
| Vade automations creation requests per minute. | 30 | 60 | `owner` |
| Vade automations list requests per minute. | 250 | 60 | `owner` |
| Vade automations retrieval requests per minute. | 250 | 60 | `owner` |
| Vade automations update requests per minute. | 60 | 60 | `owner` |
| Vade automations deletion requests per minute. | 30 | 60 | `owner` |
| Vade automation manual trigger requests per minute. | 30 | 60 | `owner` |
| Vade automation runs retrieval requests per minute. | 250 | 60 | `owner` |
| Manual AI code review requests per minute. | 30 | 60 | `owner` |


---

[View full sitemap](/docs/sitemap)
