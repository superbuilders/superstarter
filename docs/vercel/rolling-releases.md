---
title: Rolling Releases
product: vercel
url: /docs/rolling-releases
type: conceptual
prerequisites:
  []
related:
  - /docs/speed-insights
  - /docs/instant-rollback
  - /docs/skew-protection
  - /docs/project-configuration/project-settings
  - /docs/cli/promote
summary: Learn how to use Rolling Releases for more cautious deployments.
---

# Rolling Releases

> **🔒 Permissions Required**: Rolling Releases

Rolling Releases allow you to roll out new deployments to a small fraction of your users before promoting them to everyone.

Once Rolling Releases is enabled, new deployments won't be immediately served to 100% of traffic. Instead, Vercel will direct a configurable fraction of
your visitors, for example, 5%, to the new deployment. The rest of your traffic will be routed to your previous production deployment.

You can leave your rollout in this state for as long as you want, and Vercel will show you a breakdown of key metrics, such as [Speed Insights](/docs/speed-insights),
between the canary and current deployment. You can also compare these deployments with other metrics you gather with your own observability dashboards. When you're ready,
or when a configurable period of time has passed, you can promote the prospective deployment to 100% of traffic. At any point, you can use
[Instant Rollback](/docs/instant-rollback) to revert from the current release candidate.

## Configuring Rolling Releases

1. From your [dashboard](/dashboard), navigate to your **Project Settings**.
2. Select **Build & Deployment** in the left sidebar.
3. Scroll to the **Rolling Releases** section.

> **⚠️ Warning:** We highly recommend enabling [Skew Protection](/docs/skew-protection) with
> Rolling Releases. This ensures that every user, whether they get the prior
> deployment or the release candidate, communicates with the backend code from
> the matching deployment. Without Skew Protection, users may experience
> inconsistencies between client and server versions during rollouts.

Once you've enabled Rolling Releases, you need to configure two or more stages for your release. Stages are the distinct
traffic ratios you want to serve as your release candidate rolls out. Each stage must send a larger fraction of traffic
to the release candidate. The last stage must always be 100%, representing the full promotion of the
release candidate. Many projects only need two stages, with a single fractional stage before final promotion, but you can
configure more stages as needed.

> **💡 Note:** A stage configured for 0% of traffic is a special case. Vercel will not
> automatically direct any visitors to the release candidate in this case, but
> it can be accessed by forcing a value for the rolling release cookie. See
> [setting the rolling release cookie](#setting-the-rolling-release-cookie) for
> more information.

Once Rolling Releases are configured for the project, any subsequent rollout will use the project's current rolling
release configuration. Each new rollout clones the rolling release configuration. Therefore, editing the configuration
will not impact any rollouts that are currently in progress.

## Managing Rolling Releases

You can manage Rolling releases on the [project's settings page](/docs/project-configuration/project-settings) or via the API or CLI.

### Starting a rolling release

When you enable Rolling Releases in your [project's settings](/docs/project-configuration/project-settings), any action that promotes a deployment to production will initiate
a new rolling release. This includes:

- Pushing a commit to your git branch, if your project automatically promotes new commits.
- Selecting the **Promote** menu option on a deployment on the **Deployments** page.
- Promoting a deployment [via the CLI](/docs/cli/promote).

The rolling release will proceed to its first stage, sending a portion of traffic to the release candidate.

If a rolling release is in progress when one of the **promote** actions triggers, the project's
state won't change. The active rolling release must be resolved (either completed or aborted) before starting
a new one.

### Observability

While a rolling release is in progress, it will be prominently indicated in several locations:

- The Deployments page has a section summarizing the current rolling release status.
- The release candidate is badged "Canary" in the Deployments list, and indicates the fraction of traffic it is receiving.

Furthermore, the **Observability** tab for your project has a Rolling Releases section. This lets you examine Vercel-gathered
metrics about the actual traffic mix between your deployments and comparative performance differences between them.
You can use these metrics to help you decide whether you want to advance or abort a rolling release.

#### Metrics stored outside of Vercel

You may have observability metrics gathered by platforms other than Vercel. To use these metrics to help make
decisions about rolling releases, you will need to ensure that these metrics can distinguish between behaviors
observed on the base deployment and ones on the canary. The easiest way to do this is to propagate Vercel's deployment
ID to your other observability systems.

### Advancing a rolling release

Both the Deployments page and the Rolling Releases Observability tab have controls to change the state of the current release
with a button to advance the release to its next stage. If the next stage is the final stage, the release candidate will be fully
promoted to be your current production deployment, and the project exits the rolling release state.

### Aborting a rolling release

If the metrics on the release candidate are unacceptable to you, there are several ways to abort the rolling release:

- Use the Abort button on the Rolling Releases page.
- Use [Instant Rollback](/docs/instant-rollback) to roll back to any prior deployment, including the base deployment for the current rolling release.

This will leave your project in a rolled-back state, as with Instant Rollback. When you're ready, you can select any deployment to promote
to initiate a new rolling release. The project will exit rollback status once that rolling release completes.

## Understanding Rolling Releases

Rolling Releases should work out-of-the-box for most projects, but the implementation details may be significant for some users.

When a user requests a page from a project's production deployment with an active rolling release, Vercel assigns this user to a random bucket that is stored
in a cookie on the client. We use client-identifying information such as the client's IP address to perform this bucket assignment. This allows the same
device to see the same deployment even when in incognito mode. It also ensures that in race conditions such as
multiple simultaneous requests from the same client, all requests resolve to the same target deployment.

Vercel divides buckets between the two releases at the fraction requested in the current rolling release stage. When the rolling release
advances to a later stage, clients assigned to some buckets will now be assigned to a different deployment, and will receive the new
deployment at that time.

Note that while we attempt to divide user sessions among the two deployments at the configured fraction, not all users behave the same.
If a particularly high-traffic user is placed into one bucket, the observed fraction of total requests between the two deployments may
not match the requested fraction. Likewise, note that randomized assignment based on hashing may not achieve precisely the desired
diversion rate, especially when the number of sessions is small.

### Why Rolling Releases needs Skew Protection

Rolling Releases impact which deployment a user gets when they make a page load. Skew Protection ensures that backend API requests made
from a particular deployment are served by a backend implementation from the same deployment.

When a new user loads a page from a project with an active rolling release, they might receive a page from either deployment. Skew
Protection ensures that, whichever deployment they are served, their backend calls are consistent with the page that they loaded.

If the rolling release stage is advanced, the user may be eligible for a new deployment. On their next page load or refresh, they
will fetch that page from the new deployment. Until they refresh, Skew Protection will continue to ensure that they use backends
consistent with the page they are currently on.

### Setting the Rolling Release cookie

You can modify the Rolling Release cookie on a client by issuing a request that includes a special query parameter.
Requests that include `vcrrForceStable=true` in the URL will always get the base release for the current rolling release.
Likewise, `vcrrForceCanary=true` will force the cookie to target the current canary, including for a rolling release stage
configured for 0% of traffic.

This forced cookie is good only for the duration of a single rolling release. When that rolling release is completed or aborted
and a new rolling release starts, the cookie will get re-processed to a random value.

> **⚠️ Warning:** Be aware that anybody is capable of setting `vcrrForceCanary=true` on a URL.
> 0% canaries are not served by default, but they are not securely hidden from
> users.

## Manage rolling releases programmatically with the REST API

The Rolling Releases REST API allows you to programmatically manage rolling release configurations and monitor active releases. Common use cases include:

- **CI/CD integration**: Automate rolling release workflows as part of your deployment pipeline
- **Monitoring and observability**: Track the status and progress of active rolling releases
- **Update configuration**: Enable/disable rolling releases, add/remove stages, and more
- **Custom tooling**: Build internal dashboards or tools that interact with rolling release data

For detailed API specifications, request/response schemas, and code examples:

- [API reference](/docs/rest-api/rolling-release)
- [Examples using the SDK](/docs/rest-api/sdk/examples/rolling-releases)


---

[View full sitemap](/docs/sitemap)
