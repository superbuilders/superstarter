---
title: Builds
product: vercel
url: /docs/builds
type: conceptual
prerequisites:
  []
related:
  - /docs/builds/managing-builds
  - /docs/cli
  - /docs/frameworks
  - /docs/deployments/configure-a-build
  - /docs/monorepos
summary: Understand how the build step works when creating a Vercel Deployment.
---

# Builds

> **💡 Note:** Turbo build machines are now enabled by default for new Pro projects - [Learn
> more](/docs/builds/managing-builds#larger-build-machines)

Vercel automatically performs a **build** every time you deploy your code, whether you're pushing to a Git repository, importing a project via the dashboard, or using the [Vercel CLI](/docs/cli). This process compiles, bundles, and optimizes your application so it's ready to serve to your users.

## Build infrastructure

When you initiate a build, Vercel creates a secure, isolated virtual environment for your project:

- Your code is built in a clean, consistent environment
- Build processes can't interfere with other users' applications
- Vercel maintains security through complete isolation
- Resources are efficiently allocated and cleaned up after use

This infrastructure handles millions of builds daily, supporting everything from individual developers to large enterprises, while maintaining strict security and performance standards.

Most frontend frameworks (like Next.js, SvelteKit, and Nuxt) are **auto-detected**, with defaults applied for Build Command, Output Directory, and other settings. To see if your framework is included, visit the [Supported Frameworks](/docs/frameworks) page.

## How builds are triggered

Builds can be initiated in the following ways:

1. **Push to Git**: When you connect a GitHub, GitLab, or Bitbucket repository, each commit to a tracked branch initiates a new build and deployment. By default, Vercel performs a *shallow clone* of your repo (`git clone --depth=10`) to speed up build times.

2. **Vercel CLI**: Running `vercel` locally deploys your project. By default, this creates a preview build unless you add the `--prod` flag (for production).

3. **Dashboard deploy**: Clicking **Deploy** in the dashboard or creating a new project also triggers a build.

## Build customization

Depending on your framework, Vercel automatically sets the **Build Command**, **Install Command**, and **Output Directory**. If needed, you can customize these in your project's **Settings**:

1. **Build Command**: Override the default (`npm run build`, `next build`, etc.) for custom workflows.

2. **Output Directory**: Specify the folder containing your final build output (e.g., `dist` or `build`).

3. **Install Command**: Control how dependencies are installed (e.g., `pnpm install`, `yarn install`) or skip installing dev dependencies if needed.

To learn more, see [Configuring a Build](/docs/deployments/configure-a-build).

## Skipping the build step

For static websites (HTML, CSS, and client-side JavaScript only), no build step is required. In those cases:

1. Set **Framework Preset** to **Other**.
2. Leave the build command blank.
3. (Optionally) override the **Output Directory** if you want to serve a folder other than `public` or `.`.

## Monorepos

When working in a **monorepo**, you can connect multiple Vercel projects within the same repository. By default, each project will build and deploy whenever you push a commit. Vercel can optimize this by:

1. **Skipping unaffected projects**: Vercel automatically detects whether a project's files (or its dependencies) have changed and skips deploying projects that are unaffected. This feature reduces unnecessary builds and doesn't occupy concurrent build slots. Learn more about [skipping unaffected projects](/docs/monorepos#skipping-unaffected-projects).

2. **Ignored build step**: You can also write a script that cancels the build for a project if no relevant changes are detected. This approach still counts toward your concurrent build limits, but may be useful in certain scenarios. See the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step) documentation for details.

For monorepo-specific build tools, see:

- [Turborepo](/docs/monorepos/turborepo)
- [Nx](/docs/monorepos/nx)

## Concurrency and queues

When multiple builds are requested, Vercel manages concurrency and queues for you:

1. **Concurrency Slots**: Each plan has a limit on how many builds can run at once. If all slots are busy, new builds wait until a slot is free.

2. **Branch-Based Queue**: If new commits land on the same branch, Vercel skips older queued builds and prioritizes only the most recent commit. This ensures that the latest changes are always deployed first.

3. **On-Demand Concurrency**: If you need more concurrent build slots or want certain production builds to jump the queue, consider enabling [On-Demand Concurrent Builds](/docs/deployments/managing-builds#on-demand-concurrent-builds).

## Environment variables

Vercel can automatically inject **environment variables** such as API keys, database connections, or feature flags during the build:

1. **Project-Level Variables**: Define variables under **Settings** for each environment (Preview, Production, or any custom environment).

2. **Pull Locally**: Use `vercel env pull` to download environment variables for local development. This command populates your `.env.local` file.

3. **Security**: Environment variables remain private within the build environment and are never exposed in logs.

## Ignored files and folders

Some files (e.g., large datasets or personal configuration) might not be needed in your deployment:

- Vercel automatically ignores certain files (like `.git`) for performance and security.
- You can read more about how to specify [ignored files and folders](/docs/builds/build-features#ignored-files-and-folders).

## Build output and deployment

Once the build completes successfully:

1. Vercel uploads your build artifacts (static files, Vercel Functions, and other assets) to the CDN.
2. A unique deployment URL is generated for **Preview** or updated for **Production** domains.
3. Logs and build details are available in the **Deployments** section of the dashboard.

If the build fails or times out, Vercel provides diagnostic logs in the dashboard to help you troubleshoot. For common solutions, see our [build troubleshooting](/docs/deployments/troubleshoot-a-build) docs.

## Global build infrastructure

Behind the scenes, Vercel manages a sophisticated global infrastructure that:

- Creates isolated build environments on-demand
- Handles automatic regional failover
- Manages hardware resources efficiently
- Pre-warms containers to improve build start times
- Synchronizes OS and runtime environments with your deployment targets

## Limits and resources

Vercel enforces certain limits to ensure reliable builds for all users:

- **Build timeout**: The maximum build time is **45 minutes**. If your build exceeds this limit, it will be terminated, and the deployment fails.
- **Build cache**: Each build cache can be up to **1 GB**. The [cache](/docs/deployments/troubleshoot-a-build#caching-process) is retained for one month. Restoring a build cache can speed up subsequent deployments.
- **Container resources**: Vercel creates a [build container](/docs/builds/build-image) with different resources depending on your plan:

  |            | Hobby   | Pro     | Enterprise |
  | ---------- | ------- | ------- | ---------- |
  | Memory     | 8192 MB | 8192 MB | Custom     |
  | Disk Space | 23 GB   | 23 GB   | Custom     |
  | CPUs       | 2       | 4       | Custom     |

For more information, visit [Build Container Resources](/docs/deployments/troubleshoot-a-build#build-container-resources) and [Cancelled Builds](/docs/deployments/troubleshoot-a-build#cancelled-builds-due-to-limits).

## Learn more about builds

To explore more features and best practices for building and deploying with Vercel:

- [Configure your build](/docs/builds/configure-a-build): Customize commands, output directories, environment variables, and more.
- [Troubleshoot builds](/docs/deployments/troubleshoot-a-build): Get help with build cache, resource limits, and common errors.
- [Manage builds](/docs/builds/managing-builds): Control how many builds run in parallel and prioritize critical deployments.
- [Working with Monorepos](/docs/monorepos): Set up multiple projects in a single repository and streamline deployments.

## Pricing


---

[View full sitemap](/docs/sitemap)
