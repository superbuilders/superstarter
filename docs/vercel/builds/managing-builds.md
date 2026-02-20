---
title: Managing Builds
product: vercel
url: /docs/builds/managing-builds
type: how-to
prerequisites:
  - /docs/builds
related:
  - /docs/fluid-compute
  - /docs/cdn
  - /docs/plans/pro-plan
  - /docs/builds/build-queues
  - /docs/projects/overview
summary: Vercel allows you to increase the speed of your builds when needed in specific situations and workflows.
---

# Managing Builds

> **💡 Note:** Turbo build machines are now enabled by default for new Pro projects - [Learn
> more](/docs/builds/managing-builds#larger-build-machines)

When you build your application code, Vercel runs compute to install dependencies, run your build script, and sends the build output to our [Compute](/docs/fluid-compute) and [CDN](/docs/cdn).

By default, we enable our fastest build settings for Pro customers' new projects: [Turbo build machines](#larger-build-machines) and [On-Demand Concurrent Builds](#on-demand-concurrent-builds).

- If you're on a Hobby plan and looking for faster builds, we recommend [upgrading to Pro](/docs/plans/pro-plan).
- If you're on an Enterprise plan, build machines are managed as a part of your contract.

[Visit Build Diagnostics in the Observability tab of the Vercel Dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fobservability%2Fbuild-diagnostics\&title=Visit+Build+Diagnostics) to find your build durations. You can also use this table to quickly identify which solution fits your needs:

| Your situation                                | Solution                                                              | Best for                         |
| --------------------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| Builds are slow or running out of resources   | [Enhanced/Turbo build machines](#larger-build-machines)               | Large apps, complex dependencies |
| Builds are frequently queued                  | [On-demand Concurrent Builds](#on-demand-concurrent-builds)           | Teams with frequent deployments  |
| Specific projects are frequently queued       | [Project-level on-demand](#project-level-on-demand-concurrent-builds) | Fast-moving projects             |
| Occasional urgent deploy stuck in queue       | [Force an on-demand build](#force-an-on-demand-build)                 | Ad-hoc critical fixes            |
| Production builds stuck behind preview builds | [Prioritize production builds](#prioritize-production-builds)         | All production-heavy workflows   |

## Larger build machines

> **🔒 Permissions Required**: Enhanced and Turbo build machines

For Pro and Enterprise customers, we offer two higher-tier build machines with more vCPUs, memory, and disk space than Standard. Turbo build machines are enabled by default for new Pro projects.

| Build machine type | Number of vCPUs | Memory (GB) | Disk size (GB) |
| ------------------ | --------------- | ----------- | -------------- |
| Standard           | 4               | 8           | 23             |
| Enhanced           | 8               | 16          | 56             |
| Turbo              | 30              | 60          | 64             |

You can set the build machine type in the **Build and Deployment** section of your settings [for your team](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbuild-and-deployment%23build-machines\&title=Set+team+level+build+machines) or [for individual projects](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fbuild-and-deployment%23build-machine\&title=Configure+your+build+machine).

When your team uses Enhanced or Turbo machines, it'll contribute to the "Build Minutes" item of your bill.

Enterprise customers who have Enhanced build machines enabled via contract will always use them by default. You can view if you have this enabled in [the Build Machines section of the Build and Deployment tab in your Team Settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbuild-and-deployment%23build-machines\&title=Configure+your+build+machines). To update your build machine preferences, you need to contact your account manager.

## On-demand concurrent builds

> **🔒 Permissions Required**: On-demand concurrent builds

On-demand concurrent builds allow your builds to skip the queue and run immediately. By default, projects have on-demand concurrent builds enabled with full concurrency. Learn more about [concurrency modes](/docs/builds/build-queues#with-on-demand-concurrent-builds).

You are charged for on-demand concurrent builds based on the number of concurrent builds required to allow the builds to proceed as explained in [usage and limits](#usage-and-limits).

### Project-level on-demand concurrent builds

When you enable on-demand build concurrency at the level of a project, any queued builds in that project will automatically be allowed to proceed. You can choose to [run all builds immediately or limit to one active build per branch](/docs/builds/build-queues#with-on-demand-concurrent-builds).

You can configure this on the project's [**Build and Deployment Settings**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fbuild-and-deployment\&title=Go+to+Build+and+Deployment+Settings) page:

#### \['Dashboard'

1. From your Vercel dashboard, select the project you wish to enable it for.
2. Select the **Settings** tab, and go to the **Build and Deployment** section of your [Project Settings](/docs/projects/overview#project-settings).
3. Under **On-Demand Concurrent Builds**, select one of the following:
   - **Run all builds immediately**: Skip the queue for all builds
   - **Run up to one build per branch**: Limit to one active build per branch
4. The Turbo option is selected by default with 30 vCPUs and 60 GB of memory. You can switch to [Enhanced or Standard build machines](#larger-build-machines) with fewer cores and memory.
5. Click **Save**.

#### 'cURL'

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```bash filename="cURL"
curl --request PATCH \
  --url https://api.vercel.com/v9/projects/YOUR_PROJECT_ID?teamId=YOUR_TEAM_ID \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "resourceConfig": {
      "elasticConcurrencyEnabled": true,
      "buildQueue": {
        "configuration": "SKIP_NAMESPACE_QUEUE"
      }
    }
  }'
```

Set `configuration` to one of:

- `SKIP_NAMESPACE_QUEUE`: Run all builds immediately
- `WAIT_FOR_NAMESPACE_QUEUE`: Limit to one active build per branch

#### 'SDK']

To create an Authorization Bearer token, see the [access token](/docs/rest-api/reference/welcome#creating-an-access-token) section of the API documentation.

```ts filename="updateProject"
import { Vercel } from '@vercel/sdk';

const vercel = new Vercel({
  bearerToken: '<YOUR_BEARER_TOKEN_HERE>',
});

async function run() {
  const result = await vercel.projects.updateProject({
    idOrName: 'YOUR_PROJECT_ID',
    teamId: 'YOUR_TEAM_ID',
    requestBody: {
      resourceConfig: {
        elasticConcurrencyEnabled: true,
        buildQueue: {
          configuration: 'SKIP_NAMESPACE_QUEUE',
        },
      },
    },
  });

  console.log(result);
}

run();
```

Set `configuration` to one of:

- `SKIP_NAMESPACE_QUEUE`: Run all builds immediately
- `WAIT_FOR_NAMESPACE_QUEUE`: Limit to one active build per branch

### Force an on-demand build

For individual deployments, you can force build execution using the **Start Building Now** button. Regardless of the reason why this build was queued, it will proceed.

1. Select your project from the [dashboard](/dashboard).

2. From the top navigation, select the **Deployments** tab.

3. Find the queued deployment that you would like to build from the list. You can use the **Status** filter to help find it. You have 2 options:
   - Select the three dots to the right of the deployment and select **Start Building Now**.
   - Click on the deployment list item to go to the deployment's detail page and click **Start Building Now**.

4. **Confirm** that you would like to build this deployment in the **Start Building Now** dialog.

## Optimizing builds

Some other considerations to take into account when optimizing your builds include:

- [Understand](/docs/deployments/troubleshoot-a-build#understanding-build-cache) and [manage](/docs/deployments/troubleshoot-a-build#managing-build-cache) the build cache. By default, Vercel caches the dependencies of your project, based on your framework, to speed up the build process
- You may choose to [Ignore the Build Step](/docs/project-configuration/project-settings#ignored-build-step) on redeployments if you know that the build step is not necessary under certain conditions
- Use the most recent version of your runtime, particularly Node.js, to take advantage of the latest performance improvements. To learn more, see [Node.js](/docs/functions/runtimes/node-js#default-and-available-versions)

## Prioritize production builds

> **🔒 Permissions Required**: Prioritize production builds

If a build has to wait for queued preview deployments to finish, it can delay the production release process. When Vercel queues builds, we'll processes them in chronological order ([FIFO Order](# "FIFO - First In First Out")).

> **💡 Note:** For any new projects created after December 12, 2024, Vercel will prioritize
> production builds by default.

To ensure that changes to the [production environment](/docs/deployments/environments#production-environment) are prioritized over [preview deployments](/docs/deployments/environments#preview-environment-pre-production) in the queue, you can enable **Prioritize Production Builds**:

1. From your Vercel dashboard, select the project you wish to enable it for
2. Select the **Settings** tab, and go to the [**Build and Deployment** section](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fbuild-and-deployment\&title=Prioritize+Production+Builds+Setting) of your [Project Settings](/docs/projects/overview#project-settings)
3. Under **Prioritize Production Builds**, toggle the switch to **Enabled**

## Usage and limits

The on-demand build usage is based on the amount of time it took for a deployment to build when using a concurrent build. In Billing, usage of Enhanced and Turbo machines contributes to "Build Minutes".

### Pro plan

Builds are priced in $ per minute of build time and are based on the type of build machines used. There is no charge for using the Standard build machines without on-demand concurrency.

| Build machine type                                                     | Price per build minute |
| ---------------------------------------------------------------------- | ---------------------- |
| Standard (billed **only** when On-Demand Concurrent Builds is enabled) | $0.014                 |
| Enhanced (always billed)                                               | $0.030                 |
| Turbo (always billed)                                                  | $0.113                 |

### Enterprise plan

On-demand concurrent builds are priced in [MIUs](/docs/pricing/understanding-my-invoice#managed-infrastructure-units-miu) per minute of build time used and the rate depends on the number of contracted concurrent builds and the machine type.

| Concurrent builds contracted | Cost ([MIU](/docs/pricing/understanding-my-invoice#managed-infrastructure-units-miu) per minute) for Standard build machines | Cost ([MIU](/docs/pricing/understanding-my-invoice#managed-infrastructure-units-miu) per minute) for Enhanced build machines | Cost ([MIU](/docs/pricing/understanding-my-invoice#managed-infrastructure-units-miu) per minute) for Turbo build machines |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1-5                          | 0.014 MIUs                                                                                                                   | 0.030 MIUs                                                                                                                   | 0.113 MIUs                                                                                                                |
| 6-10                         | 0.012 MIUs                                                                                                                   | 0.026 MIUs                                                                                                                   | 0.098 MIUs                                                                                                                |
| 10+                          | 0.010 MIUs                                                                                                                   | 0.022 MIUs                                                                                                                   | 0.083 MIUs                                                                                                                |


---

[View full sitemap](/docs/sitemap)
