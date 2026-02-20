---
title: Remote Caching
product: vercel
url: /docs/monorepos/remote-caching
type: tutorial
prerequisites:
  - /docs/monorepos
related:
  - /docs/monorepos/turborepo
  - /docs/dashboard-features
  - /docs/rest-api
  - /docs/deployments/configure-a-build
  - /docs/accounts/team-members-and-roles
summary: Vercel Remote Cache allows you to share build outputs and artifacts across distributed teams.
---

# Remote Caching

> **🔒 Permissions Required**: Remote Cache

Remote Caching saves you time by ensuring you never repeat the same task twice, by automatically sharing a cache across your entire Vercel team.

When a team is working on the same PR, Remote Caching identifies the necessary artifacts (such as build and log outputs) and recycles them across machines in [external CI/CD](#use-remote-caching-from-external-ci/cd) and [during the Vercel Build process](#use-remote-caching-during-vercel-build).

This speeds up your workflow by avoiding the need to constantly re-compile, re-test, or re-execute your code if it is unchanged.

## Vercel Remote Cache

The first tool to leverage Vercel Remote Cache is [Turborepo](https://turborepo.com), a high-performance build system for JavaScript and TypeScript codebases. For more information on using Turborepo with Vercel, see the [Turborepo](/docs/monorepos/turborepo) guide, or [this video walkthrough of Remote Caching with Turborepo](https://youtu.be/_sB2E1XnzOY).

Turborepo caches the output of any previously run command such as testing and building, so it can replay the cached results instantly instead of rerunning them. Normally, this cache lives on the same machine executing the command.

With Remote Caching, you can share the Turborepo cache across your entire team and CI, resulting in even faster builds and days saved.

> **💡 Note:** Remote Caching is a powerful feature of Turborepo, but with great power comes
> great responsibility. Make sure you are caching correctly first and
> double-check the [handling of environment
> variables](/docs/monorepos/turborepo#step-0:-cache-environment-variables). You
> should also remember that Turborepo treats logs as artifacts, so be aware of
> what you are printing to the console.

The Vercel Remote Cache can also be used with any build tool by integrating with the [Remote Cache SDK](https://github.com/vercel/remote-cache).
This provides plugins and examples for popular monorepo build tools like [Nx](https://github.com/vercel/remote-cache/tree/main/packages/remote-nx) and [Rush](https://github.com/vercel/remote-cache/tree/main/packages/remote-rush).

## Get started

For this guide, your monorepo should be using [Turborepo](/docs/monorepos/turborepo). Alternatively, use `npx create-turbo` to set up a starter monorepo with [Turborepo](https://turborepo.com/docs#examples).

- ### Enable and disable Remote Caching for your team
  Remote Caching is **automatically enabled on Vercel** for organizations with Turborepo enabled on their monorepo.

  As an Owner, you can enable or disable Remote Caching from your team settings.
  1. From the [Vercel Dashboard](/dashboard), select your team from the [scope selector](/docs/dashboard-features#scope-selector).
  2. Select the **Settings** tab and go to the **Billing** section
  3. From the **Remote Caching** section, toggle the switch to enable or disable the feature.

- ### Authenticate with Vercel
  Once your Vercel project is using Turborepo, authenticate the Turborepo CLI with your Vercel account:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>
  If you are connecting to an SSO-enabled Vercel team, you should provide your Team slug as an argument:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>

- ### Link to the remote cache
  **To enable Remote Caching and connect to the Vercel Remote Cache**, every member of that team that wants to use Remote Caching should run the following in the root of the monorepo:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>
  You will be prompted to enable Remote Caching for the current repo. Enter `Y` for yes to enable Remote Caching.

  Next, select the team scope you'd like to connect to. Selecting the scope tells Vercel who the cache should be shared with and allows for ease of [billing](#billing-information). Once completed, Turborepo will use Vercel Remote Caching to store your team's cache artifacts.
  > **⚠️ Warning:** If you run these commands but the owner has [disabled Remote
  > Caching](#enabling-and-disabling-remote-caching-for-your-team) for your team,
  > Turborepo will present you with an error message: "Please contact your account
  > owner to enable Remote Caching on Vercel."

- ### Unlink the remote cache
  To disable Remote Caching and unlink the current directory from the Vercel Remote Cache, run:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i 
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i 
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i 
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i 
      ```
    </Code>
  </CodeBlock>
  This is run on a per-developer basis, so each developer that wants to unlink the remote cache must run this command locally.

- ### Test the cache
  Once your project has the remote cache linked, run `turbo run build` to see the caching in action. Turborepo caches the filesystem output both locally and remote (cloud). To see the cached artifacts open `.turbo/cache`.

  Now try making a change in any file and running `turbo run build` again.
  The build speed will have dramatically improved, because Turborepo will only rebuild the changed packages.

## Use Remote Caching during Vercel Build

When you run `turbo` commands during a Vercel Build, Remote Caching will be automatically enabled. No additional configuration is required. Your `turbo` task artifacts will be shared with all of your Vercel projects (and your Team Members). For more information on how to deploy applications using Turborepo on Vercel, see the [Turborepo](/docs/monorepos/turborepo) guide.

## Use Remote Caching from external CI/CD

To use Vercel Remote Caching with Turborepo from an external CI/CD system, you can set the following environment variables in your CI/CD system:

- `TURBO_TOKEN`: A [Vercel Access Token](/docs/rest-api#authentication)
- `TURBO_TEAM`: The slug of the Vercel team to share the artifacts with

When these environment variables are set, Turborepo will use Vercel Remote Caching to store task artifacts.

## Usage

Vercel Remote Cache is free for all plans, subject to fair use guidelines.

| **Plan**   | **Fair use upload limit** | **Fair use artifacts request limit** |
| ---------- | ------------------------- | ------------------------------------ |
| Hobby      | 100GB / month             | 100 / minute                         |
| Pro        | 1TB / month               | 10000 / minute                       |
| Enterprise | 4TB / month               | 10000 / minute                       |

### Artifacts

| Metric                                                                    | Description                                                                | Priced | Optimize                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| [**Number of Remote Cache Artifacts**](#number-of-remote-cache-artifacts) | The number of uploaded and downloaded artifacts using the Remote Cache API | No     | N/A                                                            |
| **Total Size of Remote Cache Artifacts**                                  | The size of uploaded and downloaded artifacts using the Remote Cache API   | No     | [Learn More](#optimizing-total-size-of-remote-cache-artifacts) |
| [**Time Saved**](#time-saved)                                             | The time saved by using artifacts cached on the Vercel Remote Cache API    | No     | N/A                                                            |

Artifacts are blobs of data or files that are uploaded and downloaded using the [Vercel Remote Cache API](/docs/monorepos/remote-caching), including calls made using [Turborepo](/docs/monorepos/turborepo#setup-remote-caching-for-turborepo-on-vercel) and the [Remote Cache SDK](https://github.com/vercel/remote-cache). Once uploaded, artifacts can be downloaded during the [build](/docs/deployments/configure-a-build) by any [team members](/docs/accounts/team-members-and-roles).

Vercel automatically expires uploaded artifacts after 7 days to avoid unbounded cache growth.

#### Time Saved

Artifacts get annotated with a task duration, which is the time required for the task to run and generate the artifact. The time saved is the sum of that task duration for each artifact multiplied by the number of times that artifact is reused from a cache.

- **Remote Cache**: The time saved by using artifacts cached on the Vercel Remote Cache API
- **Local Cache**: The time saved by using artifacts cached on your local filesystem cache

#### Number of Remote Cache Artifacts

When your team enables [Vercel Remote Cache](/docs/monorepos/remote-caching#enable-and-disable-remote-caching-for-your-team), Vercel will automatically cache [Turborepo](/docs/monorepos/turborepo) outputs (such as files and logs) and create cache artifacts from your builds. This can help speed up your builds by reusing artifacts from previous builds. To learn more about what is cached, see the Turborepo docs on [caching](https://turborepo.com/docs/core-concepts/caching).

For other monorepo implementations like [Nx](/docs/monorepos/nx), you need to manually configure your project using the [Remote Cache SDK](https://github.com/vercel/remote-cache) after you have enabled Vercel Remote Cache.

You are not charged based on the number of artifacts, but rather the size in GB downloaded.

#### Optimizing total size of Remote Cache artifacts

Caching only the files needed for the task will improve cache restoration performance.

For example, the `.next` folder contains your build artifacts. You can avoid caching the `.next/cache` folder since it is only used for development and will not speed up your production builds.

## Billing information

Vercel Remote Cache is free for all plans, subject to [fair use guidelines](#usage).

### Pro and Enterprise

Remote Caching can only be enabled by [team owners](/docs/rbac/access-roles#owner-role). When Remote Caching is enabled, anyone on your team with the [Owner](/docs/rbac/access-roles#owner-role), [Member](/docs/rbac/access-roles#member-role), or [Developer](/docs/rbac/access-roles#developer-role) role can run the `npx turbo link` command for the Turborepo. If Remote Caching is disabled, linking will prompt the developer to request an owner to enable it first.

## More resources

- [Use this SDK to manage Remote Cache Artifacts](https://github.com/vercel/remote-cache)


---

[View full sitemap](/docs/sitemap)
