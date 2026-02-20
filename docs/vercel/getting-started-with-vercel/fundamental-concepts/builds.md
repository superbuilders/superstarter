---
title: How Vercel builds your application
product: vercel
url: /docs/getting-started-with-vercel/fundamental-concepts/builds
type: conceptual
prerequisites:
  - /docs/getting-started-with-vercel/fundamental-concepts
  - /docs/getting-started-with-vercel
related:
  - /docs/deployments/git
  - /docs/cli
  - /docs/rest-api
  - /docs/projects/project-configuration
  - /docs/builds/build-queues
summary: Learn how Vercel transforms your source code into optimized assets ready to serve globally.
---

# How Vercel builds your application

When you push code to Vercel, your source files need to be transformed into something that can actually run on the internet. This transformation is what we call the build process. It takes your React components, your API routes, your configuration files, and turns them into optimized HTML, JavaScript bundles, and server-side functions that Vercel's infrastructure can serve to users around the world.

This guide explains what happens during that transformation, from the moment Vercel receives your code to when your application is ready to handle its first request.

## Starting a build

A build begins when Vercel receives new code to deploy. This can happen when:

- you push a commit to a [connected Git repository](/docs/deployments/git)
- you trigger a build through the [Vercel CLI](/docs/cli)
- you deploy from the dashboard
- you deploy from the [REST API](/docs/rest-api)

When a build request arrives, Vercel first validates the request and checks your [project configuration](/docs/projects/project-configuration). [Providing there is availability](/docs/builds/build-queues), the build will start.

## The build environment

Each build runs in its own isolated virtual machine. Vercel provisions this environment on-demand, ensuring your build has dedicated resources and can't be affected by other builds running on the platform. The environment comes pre-configured with common [build tools and runtimes](/docs/deployments/build-image), including Node.js, Python, Ruby, and Go, so most projects can build without any special setup.

The isolation also provides security. Your source code, environment variables, and build artifacts remain private to your build. Once the build completes, the environment is destroyed.

## Understanding your project

Before running any commands, Vercel inspects your project to understand what it's working with. This inspection looks at your package files, configuration, and directory structure to detect which [framework](/docs/frameworks) you're using.

Framework detection matters because different frameworks have different build requirements. For example, a Next.js application needs `next build`, but a plain static site might not need a build command at all. By detecting your framework automatically, Vercel can apply sensible defaults without requiring you to configure anything.

When Vercel recognizes your framework, it applies a preset that configures the [install command](/docs/deployments/configure-a-build#install-command), [build command](/docs/deployments/configure-a-build#build-command), and [output directory](/docs/deployments/configure-a-build#output-directory). You can override any of these settings if your project has specific requirements, but most projects work with the defaults.

## Installing dependencies

With the environment ready and your project understood, Vercel begins the **build step** by installing dependencies. It detects your [package manager](/docs/deployments/build-image#package-manager-selection) by looking for lockfiles. For example, if it finds `pnpm-lock.yaml`, it uses pnpm. This detection ensures your dependencies install exactly as they do on your local machine, using the same package manager and respecting the same lockfile.

Vercel [caches](/docs/deployments/troubleshoot-a-build#caching) these installed dependencies between builds. When you push your next commit, the cache is restored before installation begins. If your lockfile hasn't changed, installation can complete in seconds rather than minutes. This caching is automatic and requires no configuration.

## Running the build

Once dependencies are installed, Vercel runs your build command. This is where the real transformation of files into build assets happens.

What occurs during this phase depends entirely on your framework. For a Next.js application, the build command compiles React components, pre-renders static pages, analyzes which routes need server-side rendering, and bundles everything for production. For a simpler static site generator, the build might just process markdown files into HTML.

During the build, your framework has access to [environment variables](/docs/projects/environment-variables) you've configured in your project settings. This allows the build to include API keys, feature flags, or other configuration that differs between environments. Preview deployments can use different variables than production, enabling you to test against staging backends before going live.

The build runs until completion or until it hits the [timeout limit](/docs/deployments/builds/overview#build-limits). If you want your build to run faster, you may need to optimize your build process or upgrade to a [build machine with more resources](/docs/deployments/builds/overview#build-machine-resources).

## Producing output

As your build command runs, it produces output files. These might be HTML pages, JavaScript bundles, CSS files, images, or compiled server-side code. Vercel needs to understand what each of these files is and how to serve them.

This is where the [Build Output API](/docs/build-output-api) comes in. It's a standardized format that describes everything Vercel needs to know about your built application. Your framework produces this output automatically. It specifies which files are static assets that can be cached globally, which files are [Vercel Functions](/docs/functions) that need to run on servers, and how requests should be routed between them.

The routing configuration is particularly important. It captures the [rewrites](/docs/rewrites), [redirects](/docs/redirects), and [headers](/docs/headers) from your framework configuration or [`vercel.json`](/docs/projects/project-configuration) file. This information becomes the metadata that Vercel's proxy uses to route incoming requests to the right resources.

## Finalizing the deployment

Once the build produces its output, Vercel uploads everything to the appropriate storage. Static assets go to globally distributed storage where they can be served from [CDN](/docs/cdn) locations close to your users. Vercel Functions are deployed to [compute regions](/docs/functions/configuring-functions/region) where they can handle dynamic requests.

The routing metadata propagates across Vercel's network, ensuring every point of presence knows how to handle requests for your new deployment. Finally, Vercel assigns a unique URL to the [deployment](/docs/deployments/overview) and, if this is a production deployment, updates your [production domain](/docs/projects/domains) to point to the new build.

Your application is now live. When users visit your site, their requests flow through the infrastructure described in [How requests flow through Vercel](/docs/getting-started-with-vercel/fundamental-concepts/infrastructure), hitting the cache for static content and invoking your functions for dynamic responses.

**Configure a Build**: Customize build commands, output directories, environment variables, and build machine resources. [Learn more →](/docs/deployments/configure-a-build)

**Build Output API**: Learn about the specification that enables any framework to deploy to Vercel. [Learn more →](/docs/build-output-api)


---

[View full sitemap](/docs/sitemap)
