---
title: Import an existing project
product: vercel
url: /docs/getting-started-with-vercel/import
type: tutorial
prerequisites:
  - /docs/getting-started-with-vercel
related:
  - /docs/frameworks
  - /docs/git/vercel-for-github
  - /docs/git/vercel-for-gitlab
  - /docs/git/vercel-for-bitbucket
  - /docs/deployments/configure-a-build
summary: Create a new project on Vercel by importing your existing frontend project, built on any of our supported frameworks.
---

# Import an existing project

Your existing project can be any web project that outputs static HTML content (such as a website that contains HTML, CSS, and JavaScript). When you use any of Vercel's [supported frameworks](/docs/frameworks), we'll automatically detect and set the optimal build and deployment configurations for your framework.

- ### Connect to your Git provider
  On the [New Project](/new) page, under the **Import Git Repository** section, select the Git provider that you would like to import your project from.

  Follow the prompts to sign in to either your [GitHub](/docs/git/vercel-for-github), [GitLab](/docs/git/vercel-for-gitlab), or [BitBucket](/docs/git/vercel-for-bitbucket) account.

- ### Import your repository
  Find the repository in the list that you would like to import and select **Import**.

- ### Optionally, configure any settings
  Vercel will automatically detect the framework and any necessary build settings. However, you can also configure the Project settings at this point including the [build and output settings](/docs/deployments/configure-a-build#build-and-development-settings) and [Environment Variables](/docs/environment-variables). These can also be set later.
  - To update the [framework](/docs/deployments/configure-a-build#framework-preset), [build command](/docs/deployments/configure-a-build#build-command), [output directory](/docs/deployments/configure-a-build#output-directory), [install command](/docs/deployments/configure-a-build#install-command), or [development command](/docs/deployments/configure-a-build#development-command), expand the **Build & Output Settings** section and update as needed.
  - To set environment variables, expand the **Environment Variables** section and either paste or copy them in.
  - You can also configure additional properties by adding a **[vercel.json](/docs/project-configuration)** to your project. You can either do this now, before you deploy, or add it later and redeploy your project.

- ### Deploy your project
  Press the **Deploy** button. Vercel will create the Project and deploy it based on the chosen configurations.

- ### Enjoy the confetti!
  To view your deployment, select the Project in the dashboard and then select the **Domain**. This page is now visible to anyone who has the URL.

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/prod-view-light.png)

## Next Steps

Next, learn how to assign a domain to your new deployment.


---

[View full sitemap](/docs/sitemap)
