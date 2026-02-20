---
title: Vercel and Contentful Integration
product: vercel
url: /docs/integrations/cms/contentful
type: tutorial
prerequisites:
  - /docs/integrations/cms
  - /docs/integrations
related:
  - /docs/vercel-toolbar
summary: Integrate Vercel with Contentful to deploy your content.
---

# Vercel and Contentful Integration

[Contentful](https://contentful.com/) is a headless CMS that allows you to separate the content management and presentation layers of your web application. This integration allows you to deploy your content from Contentful to Vercel.

This quickstart guide uses the [Vercel Contentful integration](/marketplace/contentful) to allow streamlined access between your Contentful content and Vercel deployment. When you use the template, you'll be automatically prompted to install the Integration during deployment.

If you already have a Vercel deployment and a Contentful account, you should [install the Contentful Integration](/marketplace/contentful) to connect your Space to your Vercel project. To finish, the important parts that you need to know from the QuickStart are:

- Getting your [Space ID](#retrieve-your-contentful-space-id) and [Content Management API Token](#create-a-content-management-api-token)
- [Importing your content model](#import-the-content-model)
- [Adding your Contentful environment variables](#add-environment-variables) to your Vercel project

## Getting started

To help you get started, we built a [template](https://vercel.com/templates/next.js/nextjs-blog-preview-mode) using Next.js, Contentful, and Tailwind CSS.

You can either deploy the template above to Vercel with one click, or use the steps below to clone it to your machine and deploy it locally:

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

- ### Create a Contentful Account
  Next, create a new account on [Contentful](https://contentful.com/) and make an empty "space". This is where your content lives. We also created a sample content model to help you get started quickly.

  If you have an existing account and space, you can use it with the rest of these steps.

- ### Retrieve your Contentful Space ID
  The Vercel integration uses your Contentful Space ID to communicate with Contentful. To find this, navigate to your Contentful dashboard and select **Settings** > **API Keys**. Click on **Add API key** and you will see your Space ID in the next screen.

  ![Image](`/docs-assets/static/docs/integrations/contentful/api-section.png`)

- ### Create a Content Management API token
  You will also need to create a Content Management API token for Vercel to communicate back and forth with the Contentful API. You can get that by going to **Settings** > **API Keys** > **Content management tokens**.

  ![Image](`/docs-assets/static/docs/integrations/contentful/content-management-tokens.png`)

  Click on **Generate personal token** and a modal will pop up. Give your token a name and click on **Generate**.
  > **💡 Note:** Avoid sharing this token because it allows both read and write access to your
  > Contentful space. Once the token is generated copy the key and save remotely
  > as it will not be accessible later on. If lost, a new one must be created.

- ### Import the Content Model
  Use your Space ID and Content Management Token in the command below to import the pre-made content model into your space using our setup Node.js script. You can do that by running the following command:
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

## Adding Content in Contentful

Now that you've created your space in Contentful, add some content!

- ### Publish Contentful entries
  You'll notice the new author and post entries for the example we've provided. Publish each entry to make this fully live.

- ### Retrieve your Contentful Secrets
  Now, let's save the Space ID and token from earlier to add as Environment Variables for running locally. Create a new `.env.local` file in your application:
  ```shell filename="terminal"
  CONTENTFUL_SPACE_ID='your-space-id'
  CONTENTFUL_ACCESS_TOKEN='your-content-api-token'
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
  Your project should now be running on `http://localhost:3000`.

## How it works

Next.js is designed to integrate with any data source of your choice, including Content Management Systems. Contentful provides a helpful GraphQL API, which you can both query and mutate data from. This allows you to decouple your content from your frontend. For example:

```js
async function fetchGraphQL(query) {
  return fetch(
    `https://graphql.contentful.com/content/v1/repos/${process.env.CONTENTFUL_SPACE_ID}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.CONTENTFUL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ query }),
    },
  ).then((response) => response.json());
}
```

This code allows you to fetch data on the server from your Contentful instance. Each space inside Contentful has its own ID (e.g. `CONTENTFUL_SPACE_ID`) which you can add as an Environment Variable inside your Next.js application.

This allows you to use secure values you don't want to commit to git, which are only evaluated on the server (e.g. `CONTENTFUL_ACCESS_TOKEN`).

## Deploying to Vercel

Now that you have your application wired up to Contentful, you can deploy it to Vercel to get your site online. You can either use the Vercel CLI or the Git integrations to deploy your code. Let’s use the Git integration.

- ### Publish your code to Git
  Push your code to your git repository (e.g. GitHub, GitLab, or BitBucket).
  ```shell filename="terminal"
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin
  git push -u origin master
  ```

- ### Import your project into Vercel
  Log in to your Vercel account (or create one) and import your project into Vercel using the [import flow](https://vercel.com/new).

  ![Image](`/docs-assets/static/docs/integrations/contentful/import-to-vercel.png`)

  Vercel will detect that you are using Next.js and will enable the correct settings for your deployment.

- ### Add Environment Variables
  Add the `CONTENTFUL_SPACE_ID` and `CONTENTFUL_ACCESS_TOKEN` Environment Variables from your `.env.local` file by copying and pasting it under the **Environment Variables** section.
  ```shell filename="terminal"
  CONTENTFUL_SPACE_ID='your-space-id'
  CONTENTFUL_ACCESS_TOKEN='your-content-api-token'
  ```
  ![Image](`/docs-assets/static/docs/integrations/contentful/add-env-vars.png`)

  Click "Deploy" and your application will be live on Vercel!

  ![Image](`/docs-assets/static/docs/integrations/contentful/deployed.png`)

### Content Link

> **🔒 Permissions Required**: Content Link

Content Link enables you to edit content on websites using headless CMSs by providing links on elements that match a content model in the CMS. This real-time content visualization allows collaborators to make changes without needing a developer's assistance.

You can enable Content Link on a preview deployment by selecting  **Edit Mode** in the [Vercel Toolbar](/docs/vercel-toolbar) menu.

The corresponding model in the CMS determines an editable field. You can hover over an element to display a link in the top-right corner of the element and then select the link to open the related CMS field for editing.

You don't need any additional configuration or code changes on the page to use this feature.

To implement Content Link in your project, follow the steps in [Contentful's documentation](https://www.contentful.com/developers/docs/tools/vercel/content-source-maps-with-vercel/).


---

[View full sitemap](/docs/sitemap)
