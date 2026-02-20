---
title: Project Configuration
product: vercel
url: /docs/project-configuration
type: conceptual
prerequisites:
  []
related:
  - /docs/projects/project-dashboard
  - /docs/project-configuration/vercel-json
  - /docs/project-configuration/vercel-ts
  - /docs/project-configuration/global-configuration
  - /docs/project-configuration/general-settings
summary: Learn how to configure your Vercel projects using vercel.json, vercel.ts, or the dashboard to control builds, routing, functions, and more.
---

# Project Configuration

Vercel automatically detects your framework and sets sensible defaults for builds, deployments, and routing. Project configuration lets you override these defaults to control builds, routing rules, function behavior, scheduled tasks, image optimization, and more.

In addition to configuring your project through the [dashboard](/docs/projects/project-dashboard), you have the following options:

- [Static file-based configuration](/docs/project-configuration/vercel-json) - Static JSON configuration in your repository
- [Programmatic file-based configuration](/docs/project-configuration/vercel-ts) - Dynamic TypeScript configuration that runs at build time
- [Global CLI configuration](/docs/project-configuration/global-configuration) - System-wide Vercel CLI settings

Each method lets you control different aspects of your project.

## File-based configuration

File-based configuration lives in your repository and gets version-controlled with your code. You can use either [`vercel.json`](/docs/project-configuration/vercel-json) for static configuration or [`vercel.ts`](/docs/project-configuration/vercel-ts) for programmatic configuration that runs at build time. Both support the same properties, but `vercel.ts` lets you generate configuration dynamically using environment variables, API calls, or other build-time logic. You can only use one configuration file per project.

The table below shows all available configuration properties:

| Property                    |                               vercel.json                               |                               vercel.ts                               | Description                                         |
| --------------------------- | :---------------------------------------------------------------------: | :-------------------------------------------------------------------: | --------------------------------------------------- |
| **$schema**                 |   [View](/docs/project-configuration/vercel-json#schema-autocomplete)   |   [View](/docs/project-configuration/vercel-ts#schema-autocomplete)   | Enable IDE autocomplete and validation              |
| **buildCommand**            |      [View](/docs/project-configuration/vercel-json#buildcommand)       |      [View](/docs/project-configuration/vercel-ts#buildcommand)       | Override the build command for your project         |
| **bunVersion**              |       [View](/docs/project-configuration/vercel-json#bunversion)        |       [View](/docs/project-configuration/vercel-ts#bunversion)        | Specify which Bun version to use                    |
| **cleanUrls**               |        [View](/docs/project-configuration/vercel-json#cleanurls)        |        [View](/docs/project-configuration/vercel-ts#cleanurls)        | Remove `.html` extensions from URLs                 |
| **crons**                   |          [View](/docs/project-configuration/vercel-json#crons)          |          [View](/docs/project-configuration/vercel-ts#crons)          | Schedule functions to run at specific times         |
| **devCommand**              |       [View](/docs/project-configuration/vercel-json#devcommand)        |       [View](/docs/project-configuration/vercel-ts#devcommand)        | Override the development command                    |
| **fluid**                   |          [View](/docs/project-configuration/vercel-json#fluid)          |          [View](/docs/project-configuration/vercel-ts#fluid)          | Enable fluid compute for functions                  |
| **framework**               |        [View](/docs/project-configuration/vercel-json#framework)        |        [View](/docs/project-configuration/vercel-ts#framework)        | Specify the framework preset                        |
| **functions**               |        [View](/docs/project-configuration/vercel-json#functions)        |        [View](/docs/project-configuration/vercel-ts#functions)        | Configure function memory, duration, and runtime    |
| **headers**                 |         [View](/docs/project-configuration/vercel-json#headers)         |         [View](/docs/project-configuration/vercel-ts#headers)         | Add custom HTTP headers to responses                |
| **ignoreCommand**           |      [View](/docs/project-configuration/vercel-json#ignorecommand)      |      [View](/docs/project-configuration/vercel-ts#ignorecommand)      | Skip builds based on custom logic                   |
| **images**                  |         [View](/docs/project-configuration/vercel-json#images)          |         [View](/docs/project-configuration/vercel-ts#images)          | Configure image optimization                        |
| **installCommand**          |     [View](/docs/project-configuration/vercel-json#installcommand)      |     [View](/docs/project-configuration/vercel-ts#installcommand)      | Override the package install command                |
| **outputDirectory**         |     [View](/docs/project-configuration/vercel-json#outputdirectory)     |     [View](/docs/project-configuration/vercel-ts#outputdirectory)     | Specify the build output directory                  |
| **public**                  |         [View](/docs/project-configuration/vercel-json#public)          |         [View](/docs/project-configuration/vercel-ts#public)          | Make deployment logs and source publicly accessible |
| **redirects**               |        [View](/docs/project-configuration/vercel-json#redirects)        |        [View](/docs/project-configuration/vercel-ts#redirects)        | Redirect requests to different URLs                 |
| **bulkRedirectsPath**       |    [View](/docs/project-configuration/vercel-json#bulkredirectspath)    |    [View](/docs/project-configuration/vercel-ts#bulkredirectspath)    | Point to a file with bulk redirects                 |
| **regions**                 |         [View](/docs/project-configuration/vercel-json#regions)         |         [View](/docs/project-configuration/vercel-ts#regions)         | Deploy functions to specific regions                |
| **functionFailoverRegions** | [View](/docs/project-configuration/vercel-json#functionfailoverregions) | [View](/docs/project-configuration/vercel-ts#functionfailoverregions) | Set failover regions for functions                  |
| **rewrites**                |        [View](/docs/project-configuration/vercel-json#rewrites)         |        [View](/docs/project-configuration/vercel-ts#rewrites)         | Route requests to different paths or external URLs  |
| **trailingSlash**           |      [View](/docs/project-configuration/vercel-json#trailingslash)      |      [View](/docs/project-configuration/vercel-ts#trailingslash)      | Add or remove trailing slashes from URLs            |

## Global CLI configuration

[Global Configuration](/docs/project-configuration/global-configuration) affects how Vercel CLI behaves on your machine. These settings are stored in your user directory and apply across all projects.

## Configuration areas

For detailed information about specific configuration areas, see:

- [General Settings](/docs/project-configuration/general-settings) - Project name, Node.js version, build settings, and Vercel Toolbar
- [Project Settings](/docs/project-configuration/project-settings) - Overview of all project settings in the dashboard
- [Git Configuration](/docs/project-configuration/git-configuration) - Configure Git through vercel.json and vercel.ts
- [Git Settings](/docs/project-configuration/git-settings) - Manage Git connection, LFS, and deploy hooks
- [Security settings](/docs/project-configuration/security-settings) - Attack Challenge Mode, logs protection, fork protection, OIDC, and retention policies


---

[View full sitemap](/docs/sitemap)
