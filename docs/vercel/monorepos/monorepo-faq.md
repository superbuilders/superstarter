---
title: Monorepos FAQ
product: vercel
url: /docs/monorepos/monorepo-faq
type: reference
prerequisites:
  - /docs/monorepos
related:
  - /docs/deployments/concurrent-builds
  - /docs/project-configuration
  - /docs/cli/project-linking
  - /docs/cli/global-options
  - /docs/environment-variables
summary: Learn the answer to common questions about deploying monorepos on Vercel.
---

# Monorepos FAQ

## How can I speed up builds?

Whether or not your deployments are queued depends on the amount of
Concurrent Builds you have available. Hobby plans are limited to 1
Concurrent Build, while Pro or Enterprise plans can customize the amount
on the "Billing" page in the team settings.

Learn more about [Concurrent Builds](/docs/deployments/concurrent-builds).

## How can I make my projects available on different paths under the same domain?

After having set up your monorepo as described above, each of the
directories will be a separate Vercel project, and therefore be available
on a separate domain.

If you'd like to host multiple projects under a single domain, you can
create a new project, assign the domain in the project settings, and proxy
requests to the other upstream projects. The proxy can be implemented
using a `vercel.json` file with the [rewrites](/docs/project-configuration#rewrites) property, where each
`source` is the path under the main domain and each `destination` is the
upstream project domain.

## How are projects built after I push?

Pushing a commit to a Git repository that is connected with multiple
Vercel projects will result in multiple deployments being created and
built in parallel for each.

## Can I share source files between projects? Are shared packages supported?

To access source files outside the Root Directory, enable the **Include source files outside of the Root Directory in the Build Step** option in the Root Directory section within the project settings.

For information on using Yarn workspaces, see [Deploying a Monorepo Using
Yarn Workspaces to Vercel](/kb/guide/deploying-yarn-monorepos-to-vercel).

Vercel projects created after August 27th 2020 23:50 UTC have this option
enabled by default.
If you're using Vercel CLI, at least version 20.1.0 is required.

## How can I use Vercel CLI without Project Linking?

Vercel CLI accepts environment variables instead of [project linking](/docs/cli/project-linking), which is useful for deployments from CI providers. Set the `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` environment variables:

```zsh filename="terminal"
VERCEL_ORG_ID=team_123 VERCEL_PROJECT_ID=prj_456 vercel
```

You can also use the `--project` flag to specify a project name or ID directly. If both are provided, the `--project` flag takes precedence over `VERCEL_PROJECT_ID`. See [CLI Global Options](/docs/cli/global-options#project) for the full precedence order.

Learn more about [Vercel CLI for custom workflows](/kb/guide/using-vercel-cli-for-custom-workflows).

## Can I use Turborepo on the Hobby plan?

Yes. Turborepo is available on **all** plans.

## Can I use Nx with environment variables on Vercel?

When using [Nx](https://nx.dev/getting-started/intro) on Vercel with
[environment variables](/docs/environment-variables), you may
encounter an issue where some of your environment variables are not being
assigned the correct value in a specific deployment.

This can happen if the environment variable is not initialized or defined
in that deployment. If that's the case, the system will look for a value
in an existing cache which may or may not be the value you would like to
use. It is a recommended practice to define all environment variables in
each deployment for all monorepos.

With Nx, you also have the ability to prevent the environment variable
from using a cached value. You can do that by using [Runtime Hash
Inputs](https://nx.dev/using-nx/caching#runtime-hash-inputs). For
example, if you have an environment variable `MY_VERCEL_ENV` in your project, you will add the
following line to your `nx.json` configuration
file:

```json filename="nx.json"
"runtimeCacheInputs": ["echo $MY_VERCEL_ENV"]
```


---

[View full sitemap](/docs/sitemap)
