---
title: Path Routing
product: vercel
url: /docs/microfrontends/path-routing
type: conceptual
prerequisites:
  - /docs/microfrontends
related:
  - /docs/instant-rollback
  - /docs/microfrontends/troubleshooting
  - /docs/projects/managing-projects
  - /docs/rewrites
  - /docs/feature-flags
summary: Learn about path routing on Vercel.
---

# Microfrontends path routing

Vercel handles routing to microfrontends directly in Vercel's network infrastructure, simplifying the setup and improving latency. When Vercel receives a request to a domain that uses microfrontends, we read the `microfrontends.json` file in the live deployment to decide where to route it.

![Image](`/docs-assets/static/docs/microfrontends/routing-diagram-light.png`)

You can also route paths to a different microfrontend based on custom application logic using middleware.

## Add a new path to a microfrontend

To route paths to a new microfrontend, modify your `microfrontends.json` file. In the `routing` section for the project, add the new path:

```json {8} filename="microfrontends.json"
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": {},
    "docs": {
      "routing": [
        {
          "paths": ["/docs/:path*", "/new-path-to-route"]
        }
      ]
    }
  }
}
```

The routing for this new path will take effect when the code is merged and the deployment is live. You can test the routing changes in Preview or pre-Production to make sure it works as expected before rolling out the change to end users.

Additionally, if you need to revert, you can use [Instant Rollback](/docs/instant-rollback) to rollback the project to a deployment before the routing change to restore the old routing rules.

> **⚠️ Warning:** Changes to separate microfrontends are not rolled out in lockstep. If you need
> to modify `microfrontends.json`, make sure that the new application can handle
> the requests before merging the change. Otherwise use
> [flags](#roll-out-routing-changes-safely-with-flags) to control whether the
> path is routed to the microfrontend.

### Supported path expressions

You can use following path expressions in `microfrontends.json`:

- `/path` - Constant path.
- `/:path` - Wildcard that matches a single path segment.
- `/:path/suffix` - Wildcard that matches a single path segment with a constant path at the end.
- `/prefix/:path*` - Path that ends with a wildcard that can match zero or more path segments.
- `/prefix/:path+` - Path that ends with a wildcard that matches one or more path segments.
- `/\\(a\\)` - Path is `/(a)`, special characters in paths are escaped with a backslash.
- `/:path(a|b)` - Path is either `/a` or `/b`.
- `/:path(a|\\(b\\))` - Path is either `/a` or `/(b)`, special characters are escaped with a backslash.
- `/:path((?!a|b).*)` - Path is any single path except `/a` or `/b`.
- `/prefix-:path-suffix` - Path that starts with `/prefix-`, ends with `-suffix`, and contains a single path segment.

The following are not supported:

- Conflicting or overlapping paths: Paths must uniquely map to one microfrontend
- Regular expressions not included above
- Wildcards that can match multiple path segments (`+`, `*`) that do not come at the end of the expression

To assert whether the path expressions will work for your path, use the [`validateRouting` test utility](/docs/microfrontends/troubleshooting#validaterouting) to add unit tests that ensure paths get routed to the correct microfrontend.

## Asset Prefix

An *asset prefix* is a unique prefix prepended to paths in URLs of static assets, like JavaScript, CSS, or images. This is needed so that URLs are unique across microfrontends and can be correctly routed to the appropriate project. Without this, these static assets may collide with each other and not work correctly.

When using `withMicrofrontends`, a default auto-generated asset prefix is automatically added. The default value is an obfuscated hash of the project name, like `vc-ap-b3331f`, in order to not leak the project name to users.

If you would like to use a human readable asset prefix, you can also set the asset prefix that is used in `microfrontends.json`.

```json filename="microfrontends.json"
"your-application": {
  "assetPrefix": "marketing-assets",
  "routing": [...]
}
```

> **⚠️ Warning:** Changing the asset prefix is not guaranteed to be backwards compatible. Make
> sure that the asset prefix that you choose is routed to the correct project in
> production before changing the `assetPrefix` field.

### Next.js

JavaScript and CSS URLs are automatically prefixed with the asset prefix, but content in the `public/` directory needs to be manually moved to a subdirectory with the name of the asset prefix.

## Setting a default route

Some functionality in the Vercel Dashboard, such as screenshots and links to the deployment domain, automatically links to the `/` path. Microfrontends deployments may not serve any content on the `/` path so that functionality may appear broken. You can set a default route in the dashboard so that the Vercel Dashboard instead always links to a valid route in the microfrontends deployment.

To update the default route, visit the **Microfrontends Settings** page.

1. Go to the **Settings** tab for your project
2. Click on the **Microfrontends** tab
3. Search for the **Default Route** setting
4. Enter a new default path (starting with `/`) such as `/docs` and click **Save**

![Image](`/docs-assets/static/docs/microfrontends/default-route-settings-light.png`)

Deployments created after this change will now use the provided path as the default route.

## Routing to externally hosted applications

If a microfrontend is not yet hosted on Vercel, you can [create a new Vercel project](/docs/projects/managing-projects#creating-a-project) to [rewrite requests](/docs/rewrites) to the external application. You will then use this Vercel project in your microfrontends configuration on Vercel.

## Routing changes safely with flags

> **💡 Note:** This is only compatible with Next.js.

If you want to dynamically control the routing for a path, you can use flags to make sure that the change is safe before enabling the routing change permanently. Instead of automatically routing the path to the microfrontend, the request will be sent to the default application which then decides whether the request should be routed to the microfrontend.

This is compatible with the [Flags SDK](https://flags-sdk.dev) or it can be used with custom feature flag implementations.

> **💡 Note:** If using this with the Flags SDK, make sure to share the same value of the
> `FLAGS_SECRET` environment between all microfrontends in the same group.

- ### Specify a flag name
  In your `microfrontends.json` file, add a name in the `flag` field for the group of paths:
  ```json {8} filename="microfrontends.json"
  {
    "$schema": "https://openapi.vercel.sh/microfrontends.json",
    "applications": {
      "web": {},
      "docs": {
        "routing": [
          {
            "flag": "name-of-feature-flag",
            "paths": ["/flagged-path"]
          }
        ]
      }
    }
  }
  ```
  Instead of being automatically routed to the `docs` microfrontend, requests to `/flagged-path` will now be routed to the default application to make the decision about routing.

- ### Add microfrontends middleware
  The `@vercel/microfrontends` package uses middleware to route requests to the correct location for flagged paths and based on what microfrontends were deployed for your commit. Only the default application needs microfrontends middleware.

  You can add it to your Next.js application with the following code:
  ```ts filename="middleware.ts"
  import type { NextRequest } from 'next/server';
  import { runMicrofrontendsMiddleware } from '@vercel/microfrontends/next/middleware';

  export async function middleware(request: NextRequest) {
    const response = await runMicrofrontendsMiddleware({
      request,
      flagValues: {
        'name-of-feature-flag': async () => { ... },
      }
    });
    if (response) {
      return response;
    }
  }

  // Define routes or paths where this middleware should apply
  export const config = {
    matcher: [
      '/.well-known/vercel/microfrontends/client-config', // For prefetch optimizations for flagged paths
      '/flagged/path',
    ],
  };
  ```
  Your middleware matcher should include `/.well-known/vercel/microfrontends/client-config`. This endpoint is used by the client to know which application the path is being routed to for prefetch optimizations. The client will make a request to this well known endpoint to fetch the result of the path routing decision for this session.
  > **💡 Note:** Make sure that any flagged paths are also configured in the [middleware
  > matcher](https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher)
  > so that middleware runs for these paths.
  Any function that returns `Promise<boolean>` can be used as the implementation of the flag. This also works directly with [feature flags](/docs/feature-flags) on Vercel.

  If the flag returns true, the microfrontends middleware will route the path to the microfrontend specified in `microfrontends.json`. If it returns false, the request will continue to be handled by the default application.

  We recommend setting up [`validateMiddlewareConfig`](/docs/microfrontends/troubleshooting#validatemiddlewareconfig) and [`validateMiddlewareOnFlaggedPaths`](/docs/microfrontends/troubleshooting#validatemiddlewareonflaggedpaths) tests to prevent many common middleware misconfigurations.

## Microfrontends domain routing

Vercel automatically determines which deployment to route a request to for the microfrontends projects in the same group. This allows developers to build and test any combination of microfrontends without having to build them all on the same commit.

Domains that use this microfrontends routing will have an M icon next to the name on the deployment page.

![Image](`/docs-assets/static/docs/microfrontends/mfe-domain-icon-light.png`)

Microfrontends routing for a domain is set when a domain is created or updated, for example when a deployment is built, promoted, or rolled back. The rules for routing are as follows:

### Custom domain routing

Domains assigned to the [production environment](/docs/deployments/environments#production-environment) will always route to each project's current production deployment.
This is the same deployment that would be reached by accessing the project's production domain. If a microfrontends project is [rolled back](/docs/instant-rollback) for example, then the microfrontends routing will route to the rolled back deployment.

Domains assigned to a [custom environment](/docs/deployments/environments#custom-environments) will route requests to other microfrontends to custom environments with the same name, or fallback based on the [fallback environment](/docs/microfrontends/managing-microfrontends#fallback-environment) configuration.

### Branch URL routing

Automatically generated branch URLs will route to the latest built deployment for the project on the branch. If no deployment exists for the project on the branch, routing will fallback based on the [fallback environment](/docs/microfrontends/managing-microfrontends#fallback-environment) configuration.

### Deployment URL routing

Automatically generated deployment URLs are fixed to the point in time they were created. Vercel will route requests to other microfrontends to deployments created for the same commit, or a previous commit from the branch if not built at that commit.

If there is no deployment for the commit or branch for the project at that point in time, routing will fallback to the deployment at that point in time for the [fallback environment](/docs/microfrontends/managing-microfrontends#fallback-environment).

## Identifying microfrontends by path

To identify which microfrontend is responsible for serving a specific path, you can use the [Deployment Summary](/docs/deployments#resources-tab-and-deployment-summary) or the [Vercel Toolbar](/docs/vercel-toolbar).

### Using the Vercel dashboard

1. Go to the **Project** page for the default microfrontend application.
2. Click on the **Deployment** for the production deployment.
3. Open the **[Deployment Summary](/docs/deployments#resources-tab-and-deployment-summary)** for the deployment.
4. Open up the Microfrontends accordion to see all paths that are served to that microfrontend. If viewing the default application, all paths for all microfrontends will be displayed.

![Image](`/docs-assets/static/docs/microfrontends/deployment-summary-2-light.png`)

### Using the Vercel Toolbar

1. On any page in the microfrontends group, open up the **[Vercel Toolbar](/docs/vercel-toolbar)**.
2. Open up the **Microfrontends Panel**.
3. Look through the **Directory** of each microfrontend to find the application that serves the path. If no microfrontends match, the path is served by the default application.

![Image](`/docs-assets/static/docs/microfrontends/toolbar/microfrontends-directory-3-light.png`)


---

[View full sitemap](/docs/sitemap)
