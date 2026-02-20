---
title: Use a template
product: vercel
url: /docs/getting-started-with-vercel/template
type: tutorial
prerequisites:
  - /docs/getting-started-with-vercel
related:
  - /docs/git
  - /docs/deployments/builds
  - /docs/deployments/generated-urls
  - /docs/environment-variables
  - /docs/environment-variables/shared-environment-variables
summary: Create a new project on Vercel by using a template
---

# Use a template

Accelerate your development on Vercel with [Templates](/templates). This guide will show you how to use templates to fast-track project setup, leverage popular frontend frameworks, and maximize Vercel's features.

- ### Find a template
  From [https://vercel.com/templates](/templates), select the template you’d like to deploy. You can use the filters to select a template based on use case, framework, and other requirements.

  Not sure which one to use? How about [exploring Next.js](https://vercel.com/templates/next.js/nextjs-boilerplate).

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/templates-light.png)

- ### Deploy the template to Vercel
  Once you've selected a template, Click **Deploy** on the template page to start the process.

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/deploying-template-light.png)

- ### Connect your Git provider
  To ensure you can easily update your project after deploying it, Vercel will create a new repository with your chosen [Git provider](/docs/git). Every push to that Git repository will be deployed automatically.

  First, select the Git provider that you'd like to connect to. Once you’ve signed in, you’ll need to set the scope and repository name. At this point, Vercel will clone a copy of the source code into your Git account.

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/git-provider-light.png)

- ### Project deployment
  Once the project has been cloned to your git provider, Vercel will automatically start deploying the project. This starts with [building your project](/docs/deployments/builds), then [assigning the domain](/docs/deployments/generated-urls), and finally celebrating your deployed project with confetti.

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/deploy-template-light.png)

- ### View your dashboard
  At this point, you’ve created a **production** deployment, with its very own domain assigned. If you continue to your [dashboard](/dashboard), you can click on the domain to preview a live, accessible URL that is instantly available on the internet.

  ![Image](https://vercel.com/docs-assets/static/docs/getting-started-with-vercel/prod-view-light.png?lightbox)

- ### Clone the project to your machine
  Finally, you'll want to clone the source files to your local machine so that you can make some changes later. To do this from your dashboard, select the **Git repository** button and clone the repository.

> **💡 Note:** Because you used a template, we’ve automatically included any additional
> environment set up as part of the template. You can customize your project by
> configuring environment variables and build options.Environment Variables are key-value pairs that can be defined in your project
> settings for each [Environment](/docs/environment-variables#environments).
> Teams can also use [shared environment
> variables](/docs/environment-variables/shared-environment-variables) that are
> linked between multiple projects.Vercel automatically configures builds settings based on your framework, but
> you can [customize the build](/docs/deployments/configure-a-build) in your
> project settings or within a [vercel.json](/docs/project-configuration) file.

## Next Steps

Next, learn how to assign a domain to your new deployment.


---

[View full sitemap](/docs/sitemap)
