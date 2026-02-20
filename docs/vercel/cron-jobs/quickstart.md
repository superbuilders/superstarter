---
title: Getting started with cron jobs
product: vercel
url: /docs/cron-jobs/quickstart
type: tutorial
prerequisites:
  - /docs/cron-jobs
related:
  - /docs/projects/overview
  - /docs/functions
  - /docs/project-configuration
  - /docs/cron-jobs
  - /docs/deployments/environments
summary: Learn how to schedule cron jobs to run at specific times or intervals.
---

# Getting started with cron jobs

This guide will help you get started with using cron jobs on Vercel. Cron jobs are scheduled tasks that run at specific times or intervals. They are useful for automating tasks. You will learn how to create a cron job that runs every day at 5 am UTC by creating a Vercel Function and configuring it in your `vercel.json` file.

## Prerequisites

- [A Vercel account](/signup)
- [A project](/docs/projects/overview#creating-a-project) with a [Vercel Function](/docs/functions)

- ### Create a function
  This function contains the code that will be executed by the cron job. This example uses a simple function that returns the user's region.
  > For \['nextjs']:
  ```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs
  export function GET(request: Request) {
    return new Response('Hello from Vercel!');
  }
  ```
  ```js v0="build" filename="app/api/hello/route.js" framework=nextjs
  export function GET(request) {
    return new Response('Hello from Vercel!');
  }
  ```
  ```ts filename="api/hello.ts" framework=other
  export function GET(request: Request) {
    return new Response('Hello from Vercel!');
  }
  ```
  ```js filename="api/hello.js" framework=other
  export function GET(request) {
    return new Response('Hello from Vercel!');
  }
  ```
  ```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs-app
  export function GET(request: Request) {
    return new Response('Hello from Vercel!');
  }
  ```
  ```js v0="build" filename="app/api/hello/route.js" framework=nextjs-app
  export function GET(request) {
    return new Response('Hello from Vercel!');
  }
  ```

- ### Create or update your `vercel.json` file
  Create or go to your [`vercel.json`](/docs/project-configuration#functions) file and add the following code:
  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "crons": [
      {
        "path": "/api/hello",
        "schedule": "0 5 * * *"
      }
    ]
  }
  ```
  The `crons` property is an array of cron jobs. Each cron job has two properties:
  - The `path`, which must start with `/`
  - The `schedule` property, which must be a string that represents a [cron expression](/docs/cron-jobs#cron-expressions). In this example, the job is scheduled to execute every day at 5:00 am UTC

- ### Deploy your project.
  When you deploy your project, Vercel's build process creates the cron job. Vercel invokes cron jobs only for [production](/docs/deployments/environments#production-environment) deployments and not for [preview](/docs/deployments/environments#preview-environment-pre-production) deployments

  You can also deploy to your production domain using the CLI:
  ```bash filename="terminal"
  vercel deploy --prod
  ```

Your cron job is now active and will call the `/api/hello` path every day at 5:00 am UTC.

## Next steps

Now that you have created a cron job, you can learn more about how to manage and configure them:

- [Learn about managing cron jobs](/docs/cron-jobs/manage-cron-jobs)
- [Explore usage and pricing](/docs/cron-jobs/usage-and-pricing)


---

[View full sitemap](/docs/sitemap)
