---
title: Deploying Turborepo to Vercel
product: turborepo
url: /docs/monorepos/turborepo
type: reference
prerequisites:
  - /docs/monorepos
related:
  - /docs/monorepos/remote-caching
  - /docs/getting-started-with-vercel/import
  - /docs/deployments/configure-a-build
  - /docs/project-configuration/project-settings
  - /docs/frameworks/more-frameworks
summary: Learn about Turborepo, a build system for monorepos that allows you to have faster incremental builds, content-aware hashing, and Remote Caching.
---

# Deploying Turborepo to Vercel

Turborepo is a high-performance build system for JavaScript and TypeScript codebases with:

- Fast incremental builds
- Content-aware hashing, meaning only the files you changed will be rebuilt
- [Remote Caching](/docs/monorepos/remote-caching) for sharing build caches with your team and CI/CD pipelines

And more. Read the [Why Turborepo](https://turborepo.com/docs#why-turborepo) docs to learn about the benefits of using Turborepo to manage your monorepos. To get started with Turborepo in your monorepo, follow Turborepo's [Quickstart](https://turborepo.com/docs) docs.

## Deploy Turborepo to Vercel

Follow the steps below to deploy your Turborepo to Vercel:

- ### Handling environment variables
  It's important to ensure you are managing environment variables (and files outside of packages and apps) correctly.

  If your project has environment variables, you'll need to create a list of them in your `turbo.json` so Turborepo knows to use different caches for different environments. For example, you can accidentally ship your staging environment to production if you don't tell Turborepo about your environment variables.

  Frameworks like Next.js inline build-time environment variables (e.g. `NEXT_PUBLIC_XXX`) in bundled outputs as strings. Turborepo will [automatically try to infer these based on the framework](https://turborepo.com/docs/core-concepts/caching#automatic-environment-variable-inclusion), but if your build inlines other environment variables or they otherwise affect the build output, you must [declare them in your Turborepo configuration](https://turborepo.com/docs/core-concepts/caching#altering-caching-based-on-environment-variables).

  You can control Turborepo's cache behavior (hashing) based on the values of both environment variables and the contents of files in a few ways. Read the [Caching docs on Turborepo](https://turborepo.com/docs/core-concepts/caching) for more information.
  > **💡 Note:** `env` and `globalEnv` key support is available in Turborepo version 1.5 or
  > later. You should update your Turborepo version if you're using an older
  > version.
  The following example shows a Turborepo configuration, that handles these suggestions:
  ```json filename="turbo.json"
  {
    "$schema": "https://turborepo.com/schema.json",
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "env": [
          // env vars will impact hashes of all "build" tasks
          "SOME_ENV_VAR"
        ],
        "outputs": ["dist/**"]
      },
      "web#build": {
        // override settings for the "build" task for the "web" app
        "dependsOn": ["^build"],
        "env": ["SOME_OTHER_ENV_VAR"],
        "outputs": [".next/**", "!.next/cache/**"]
      }
    },
    "globalEnv": [
      "GITHUB_TOKEN" // env var that will impact the hashes of all tasks,
    ],
    "globalDependencies": [
      "tsconfig.json" // file contents will impact the hashes of all tasks,
    ]
  }
  ```
  > **💡 Note:** In most monorepos, environment variables are usually used in applications
  > rather than in shared packages. To get higher cache hit rates, you should only
  > include environment variables in the app-specific tasks where they are used or
  > inlined.
  Once you've declared your environment variables, commit and push any changes you've made. When you update or add new inlined build-time environment variables, be sure to declare them in your Turborepo configuration.

- ### Import your Turborepo to Vercel
  > **💡 Note:** If you haven't already connected your monorepo to Turborepo, you can follow
  > the [quickstart](https://turborepo.com/docs) on the Turborepo docs to do so.
  [Create a new Project](/new) on the Vercel dashboard and [import](/docs/getting-started-with-vercel/import) your Turborepo project.

  ![Image](`/docs-assets/static/docs/concepts/deployments/git/config-project-light.png`)

  Vercel handles all aspects of configuring your monorepo, including setting [build commands](/docs/deployments/configure-a-build#build-command), the [Output Directory](/docs/deployments/configure-a-build#output-directory), the [Root Directory](/docs/deployments/configure-a-build#root-directory), the correct directory for workspaces, and the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step).

  The table below reflects the values that Vercel will set if you'd like to set them manually in your Dashboard or in the `vercel.json` of your application's directory:

  | **Field**          | **Command**                                                                              |
  | ------------------ | ---------------------------------------------------------------------------------------- |
  | Framework Preset   | [One of 35+ framework presets](/docs/frameworks/more-frameworks)                         |
  | Build Command      | `turbo run build` (requires version >=1.8) or `cd ../.. && turbo run build --filter=web` |
  | Output Directory   | Framework default                                                                        |
  | Install Command    | Automatically detected by Vercel                                                         |
  | Root Directory     | App location in repository (e.g. `apps/web`)                                             |
  | Ignored Build Step | `npx turbo-ignore --fallback=HEAD^1`                                                     |

## Using global `turbo`

Turborepo is also available globally when you deploy on Vercel, which means that you do **not** have to add `turbo` as a dependency in your application.

Thanks to [automatic workspace scoping](https://turborepo.com/blog/turbo-1-8-0#automatic-workspace-scoping) and [globally installed turbo](https://turborepo.com/blog/turbo-1-7-0#global-turbo), your [build command](/docs/deployments/configure-a-build#build-command) can be as straightforward as:

```bash
turbo build
```

The appropriate [filter](https://turborepo.com/docs/core-concepts/monorepos/filtering) will be automatically inferred based on the configured [root directory](/docs/deployments/configure-a-build#root-directory).

> **💡 Note:** To override this behavior and use a specific version of Turborepo, install the
> desired version of `turbo` in your project. [Learn
> more](https://turborepo.com/blog/turbo-1-7-0#global-turbo)

## Ignoring unchanged builds

You likely don't need to build a preview for every application in your monorepo on every commit. To ensure that only applications that have changed are built, ensure your project is configured to automatically [skip unaffected projects](/docs/monorepos#skipping-unaffected-projects).

## Setup Remote Caching for Turborepo on Vercel

You can optionally choose to connect your Turborepo to the [Vercel Remote Cache](/docs/monorepos/remote-caching) from your local machine, allowing you to share artifacts and completed computations with your team and CI/CD pipelines.

You do not need to host your project on Vercel to use Vercel Remote Caching. For more information, see the [Remote Caching](/docs/monorepos/remote-caching) doc. You can also use a custom remote cache. For more information, see the [Turborepo documentation](https://turborepo.com/docs/core-concepts/remote-caching#custom-remote-caches).

- ### Link your project to the Vercel Remote Cache
  First, authenticate with the Turborepo CLI **from the root of your monorepo**:
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
  Then, use [`turbo link`](https://turborepo.com/docs/reference/command-line-reference#turbo-link) to link your Turborepo to your [remote cache](/docs/monorepos/remote-caching#link-to-the-remote-cache). This command should be run **from the root of your monorepo**:
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
  Next, `cd` into each project in your Turborepo and run `vercel link` to link each directory within the monorepo to your Vercel Project.

  As a Team owner, you can also [enable caching within the Vercel Dashboard](/docs/monorepos/remote-caching#enable-and-disable-remote-caching-for-your-team).

- ### Test the caching
  Your project now has the Remote Cache linked. Run `turbo run build` to see the caching in action. Turborepo caches the filesystem output both locally and remote (cloud). To see the cached artifacts open `node_modules/.cache/turbo`.

  Now try making a change in a file and running `turbo run build` again.
  The build speed will have dramatically improved. This is because Turborepo will only rebuild the changed files.

  To see information about the [Remote Cache usage](/docs/limits/usage#artifacts), go to the **Artifacts** section of the **Usage** tab.

## Troubleshooting

### Build outputs cannot be found on cache hit

For Vercel to deploy your application, the outputs need to be present for your [Framework Preset](/docs/deployments/configure-a-build#framework-preset) after your application builds. If you're getting an error that the outputs from your build don't exist after a cache hit:

- Confirm that your outputs match [the expected Output Directory for your Framework Preset](/docs/monorepos/turborepo#import-your-turborepo-to-vercel). Run `turbo build` locally and check for the directory where you expect to see the outputs from your build
- Make sure the application outputs defined in the `outputs` key of your `turbo.json` for your build task are aligned with your Framework Preset. A few examples are below:

```json filename="turbo.json"
{
  "$schema": "https://turborepo.com/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        // Next.js
        ".next/**", "!.next/cache/**"
        // SvelteKit
        ".svelte-kit/**", ".vercel/**",
        // Build Output API
        ".vercel/output/**"
        // Other frameworks
        ".nuxt/**", "dist/**" "other-output-directory/**"
      ]
    }
  }
}
```

Visit [the Turborepo documentation](https://turborepo.com/docs/reference/configuration#outputs) to learn more about the `outputs` key.

### Unexpected cache misses

When using Turborepo on Vercel, all information used by `turbo` during the build process is automatically collected to help debug cache misses.

> **💡 Note:** Turborepo Run Summary is only available in Turborepo version `1.9` or later.
> To upgrade, use `npx @turbo/codemod upgrade`.

To view the Turborepo Run Summary for a deployment, use the following steps:

1. From your [dashboard](/dashboard), select your project and go to the **Deployments** tab.
2. Select a **Deployment** from the list to view the deployment details
3. Select the **Run Summary** button to the right of the **Building** section, under the **Deployment Status** heading:

![Image](`/docs-assets/static/docs/concepts/monorepos/turborepo/turbo-run-summary-cta.png`)

This opens a view containing a review of the build, including:

- All [tasks](https://turborepo.com/docs/core-concepts/caching) that were executed as part of the build
- The execution time and cache status for each task
- All data that `turbo` used to construct the cache key (the [task hash](https://turborepo.com/docs/core-concepts/caching#hashing))

> **💡 Note:** If a previous deployment from the same branch is available, the difference
> between the cache inputs for the current and previous build will be
> automatically displayed, highlighting the specific changes that caused the
> cache miss.

![Image](`/docs-assets/static/docs/concepts/monorepos/turborepo/turbo-run-summary.png`)

This information can be helpful in identifying exactly why a cache miss occurred, and can be used to determine if a cache miss is due to a change in the
project, or a change in the environment.

To change the comparison, select a different deployment from the dropdown, or search for a deployment ID. The summary data can also be downloaded for comparison with a local build.

> **💡 Note:** Environment variable values are encrypted when displayed in Turborepo Run
> Summary, and can only be compared with summary files generated locally when
> viewed by a team member with access to the projects environment variables.
> [Learn more](/docs/rbac/access-roles/team-level-roles)

## Limitations

Building a Next.js application that is using [Skew Protection](/docs/skew-protection) always results in a Turborepo cache miss. This occurs because Skew Protection for Next.js uses an environment variable that changes with each deployment, resulting in Turborepo cache misses. There can still be cache hits for the Vercel CDN Cache.

If you are using a version of Turborepo below 2.4.1, you may encounter issues with Skew Protection related to missing assets in production. We strongly recommend upgrading to Turborepo 2.4.1+ to restore desired behavior.


---

[View full sitemap](/docs/sitemap)
