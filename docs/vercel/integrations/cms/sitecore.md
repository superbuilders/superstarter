---
title: Vercel and Sitecore XM Cloud Integration
product: vercel
url: /docs/integrations/cms/sitecore
type: tutorial
prerequisites:
  - /docs/integrations/cms
  - /docs/integrations
related:
  - /docs/security/deployment-protection
summary: Integrate Vercel with Sitecore XM Cloud to deploy your content.
---

# Vercel and Sitecore XM Cloud Integration

[Sitecore XM Cloud](https://www.sitecore.com/products/xm-cloud) is a CMS platform designed for both developers and marketers. It utilizes a headless architecture, which means content is managed independently from its presentation layer. This separation allows for content delivery across various channels and platforms.

This guide outlines the steps to integrate a headless JavaScript application on Vercel with Sitecore XM Cloud. In this guide, you will learn how to set up a new XM Cloud project in the XM Cloud Deploy app. Then, you will create a standalone Next.js JSS application that can connect to a new or an existing XM Cloud website. By the end, you'll understand how to create a new XM Cloud website and the steps necessary for connecting a Next.js application and deploying to Vercel.

The key parts you will learn from this guide are:

1. Configuring the GraphQL endpoint for content retrieval from Sitecore XM Cloud
2. Utilizing the Sitecore Next.js for JSS library for content integration
3. Setting up environment variables in Vercel for Sitecore API key, GraphQL endpoint, and JSS app name

## Setting up an XM Cloud project, environment, and website

- ### Access XM Cloud Deploy app
  Log in to your XM Cloud Deploy app account.

- ### Initiate project creation
  Navigate to the **Projects** page and select **Create project**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project.png`)

- ### Select project foundation
  In the **Create new project** dialog, select **Start from the XM Cloud starter foundation**. Proceed by selecting **Next**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal.png`)

- ### Select starter template
  Select the XM Cloud Foundation starter template and select **Next**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-next.png`)

- ### Name your project
  Provide a name for your project in the **Project name** field and select **Next**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-name.png`)

- ### Select source control provider
  Choose your source control provider and select **Next**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-provider.png`)

- ### Set up source control connection
  If you haven't already set up a connection, create a new source control connection and follow the instructions provided by your source control provider.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-connection.png`)

- ### Specify repository name
  In the **Repository name** field, provide a unique name for your new repository and select **Next**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-repo.png`)

- ### Configure environment details
  - Specify the environment name in the **Environment name** field
  - Determine if the environment is a production environment using the **Production environment** drop-down menu
  - Decide if you want automatic deployments upon commits to the linked repository branch using the **Trigger deployment on commit to branch** drop-down menu
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-modal-env.png`)

- ### Finalize setup
  Select **Create and deploy**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-deploy.png`)

- ### Create a new website
  - When the deployment finishes, select **Go to XM Cloud**
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-project-click.png`)
  - Under Sites, select **Create Website**
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-website.png`)
  - Select **Basic Site**
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-website-basic.png`)
  - Enter a name for your site in the **Site name** field
  - Select **Create website**
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-website-name.png`)

- ### Publish the site
  - Select the **Open in Pages** option on the newly created website
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-website-open.png`)
  - Select **Publish** > **Publish item with all sub-items**
  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-create-website-publish.png`)

## Creating a Next.js JSS application

To help get you started, we built a [template](https://vercel.com/templates/next.js/sitecore-starter) using Sitecore JSS for Next.js with JSS SXA headless components. This template includes only the frontend Next.js application that connects to a new or existing hosted XM Cloud website. Note that it omits the Docker configuration for running XM Cloud locally. For details on local XM Cloud configuration, refer to Sitecore's [documentation](https://doc.sitecore.com/xmc/en/developers/xm-cloud/walkthrough--setting-up-your-full-stack-xm-cloud-local-development-environment.html).

Sitecore also offers a [JSS app initializer](https://doc.sitecore.com/xmc/en/developers/xm-cloud/the-jss-app-initializer.html) and templates for other popular JavaScript frameworks. You can also use the JSS application that's part of the XM Cloud starter foundation mentioned in the previous section.

You can either deploy the template above to Vercel with one-click, or use the steps below to clone it to your machine and deploy it locally.

- ### Clone the repository
  You can clone the repo using the following command:
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

- ### Retrieve your API key, GraphQL endpoint, and JSS app name
  Next, navigate to your newly created XM Cloud site under **Sites** and select **Settings**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/sitecore-dashboard.png`)

  Under the **Developer Settings** tab select **Generate API Key**.

  ![Image](`/docs-assets/static/docs/integrations/sitecore/developer-settings.png`)

  Save the `SITECORE_API_KEY`, `JSS_APP_NAME`, and `GRAPH_QL_ENDPOINT` values – you'll need them for the next step.

- ### Configure your Next.js JSS application
  Next, add the `JSS_APP_NAME`, `GRAPH_QL_ENDPOINT` , `SITECORE_API_KEY`, and `SITECORE_API_HOST` values as environment variables for running locally. Create a new `.env.local` file in your application, copy the contents of `.env.example` and set the 4 environment variables.
  ```shell filename=".env.local"
  JSS_APP_NAME='your-jss-app-name'
  GRAPH_QL_ENDPOINT='your-graphql-endpoint'
  SITECORE_API_KEY='your-sitecore-api-key'
  SITECORE_API_HOST='host-from-endpoint'
  ```

- ### Start your application
  You can now start your application with the following command:
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

## How it works

Sitecore XM Cloud offers a GraphQL endpoint for its sites, serving as the primary mechanism for both retrieving and updating content. The Sitecore JSS library for Next.js provides the necessary components and tools for rendering and editing Sitecore data.

Through this integration, content editors can log into XM Cloud to not only modify content but also adjust the composition of pages.

The frontend application hosted on Vercel establishes a connection to Sitecore XM Cloud using the `GRAPH_QL_ENDPOINT` to determine the data source and the `SITECORE_API_KEY` to ensure secure access to the content.

With these components in place, developers can seamlessly integrate content from Sitecore XM Cloud into a Next.js application on Vercel.

> **💡 Note:** Vercel Deployment Protection is enabled for new projects by
> [default](/changelog/deployment-protection-is-now-enabled-by-default-for-new-projects)
> which limits access to preview and production URLs. This may impact Sitecore
> Experience Editor and Pages functionality. Refer to Deployment Protection
> [documentation](/docs/security/deployment-protection) and Sitecore XM Cloud
> [documentation](https://doc.sitecore.com/xmc/en/developers/xm-cloud/use-vercel-s-deployment-protection-feature-with-jss-apps.html)
> for more details and integration steps.

## Deploying to Vercel

- ### Push to Git
  Ensure your integrated application code is pushed to your git repository.
  ```shell filename="terminal"
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin [repository url]
  git push -u origin main
  ```

- ### Import to Vercel
  Log in to your Vercel account (or create one) and import your project into Vercel using the [import flow](https://vercel.com/new).

  ![Image](`/docs-assets/static/docs/integrations/sitecore/import-vercel-light.png`)

- ### Configure environment variables
  Add the `FETCH_WITH`, `JSS_APP_NAME`, `GRAPH_QL_ENDPOINT` , `SITECORE_API_KEY`, and `SITECORE_API_HOST` environment variables to the **Environment Variables** section.
  ```shell filename=".env.local"
  JSS_APP_NAME='your-jss-app-name'
  GRAPH_QL_ENDPOINT='your-graphql-endpoint'
  SITECORE_API_KEY='your-sitecore-api-key'
  SITECORE_API_HOST='host-from-endpoint'
  FETCH_WITH='GraphQL'
  ```
  Select "Deploy" and your application will be live on Vercel!

  ![Image](`/docs-assets/static/docs/integrations/sitecore/success-vercel-light.png`)


---

[View full sitemap](/docs/sitemap)
