---
title: Projects and deployments
product: vercel
url: /docs/getting-started-with-vercel/projects-deployments
type: tutorial
prerequisites:
  - /docs/getting-started-with-vercel
related:
  - /docs/projects/overview
  - /docs/monorepos
  - /docs/deployments
  - /docs/projects/project-dashboard
  - /docs/deployments/builds
summary: "Streamline your workflow with Vercel's project and deployment management. Boost productivity and scale effortlessly."
---

# Projects and deployments

To get started with Vercel, it's helpful to understand **projects** and **deployments**:

- **Projects**: A [project](/docs/projects/overview) is the application that you have deployed to Vercel. You can have multiple projects connected to a single repository (for example, a [monorepo](/docs/monorepos)), and multiple [deployments](/docs/deployments) for each project. You can view all your projects on the [dashboard](/dashboard), and configure your settings through the [project dashboard](/docs/projects/project-dashboard).
- **Deployments**: A [deployment](/docs/deployments) is the result of a successful [build](/docs/deployments/builds# "Build Step") of your project. A deployment is triggered when you import an existing project or template, or when you push a Git commit through your [connected integration](/docs/git) or use `vercel deploy` from the [CLI](/docs/cli). Every deployment [generates a URL automatically](/docs/deployments/generated-urls).

### More resources

To get started you'll create a new project by either **deploying a template** or **importing and deploying** an existing project:

- [Deploy a template](/docs/getting-started-with-vercel/template)
- [Import an existing project](/docs/getting-started-with-vercel/import)


---

[View full sitemap](/docs/sitemap)
