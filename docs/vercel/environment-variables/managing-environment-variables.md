---
title: Managing environment variables
product: vercel
url: /docs/environment-variables/managing-environment-variables
type: how-to
prerequisites:
  - /docs/environment-variables
related:
  - /docs/deployments/environments
  - /docs/deployments/managing-deployments
summary: Learn how to create and manage environment variables for Vercel.
---

# Managing environment variables

Environment variables are key-value pairs configured outside your source code so that each value can change depending on the [Environment](/docs/deployments/environments).

Changes to environment variables are not applied to previous deployments, they only apply to new deployments. You must redeploy your project to update the value of any variables you change in the deployment.

## Declare an Environment Variable

To declare an Environment Variable for your deployment:

1. From your [dashboard](/dashboard), select your project. If necessary, you can also set environment variables team-wide so that they will be available for all projects.

2. Select the **Settings** tab.

3. Go to the **Environment Variables** section of your **Project Settings**.

   ![Image](`/docs-assets/static/docs/concepts/projects/environment-variables/env-var-section-light.png`)

4. Enter the desired **Name** for your Environment Variable. For example, if you are using Node.js and you create an Environment Variable named `API_URL`, it will be available under `process.env.API_URL` in your code.

   #### \['Node.js'

   ```js
   process.env.API_URL;
   ```

   #### 'Go'

   ```go
   os.Getenv("API_URL")
   ```

   #### 'Python'

   ```py
   os.environ.get('API_URL')
   ```

   #### 'Ruby']

   ```ruby
   ENV['API_URL']
   ```

5. Then, enter the **Value** for your Environment Variable. The value is encrypted at rest so it is safe to add sensitive data like authentication tokens or private keys.

6. Configure which [deployment environment(s)](/docs/deployments/environments) this variable should apply to.

7. Click **Save**.

8. To ensure that the new Environment Variable is applied to your deployment, you must [redeploy](/docs/deployments/managing-deployments#redeploy-a-project) your project.

## Viewing, editing, or deleting an Environment Variable

To find and view all environment variables.

1. From your [dashboard](/dashboard), select your project. You can also view all team-wide environment variables through the Team Settings.
2. Select the **Settings** tab.
3. Go to the **Environment Variables** section of your **Project Settings**.
4. Below the *Add New* form is a list of all the environment variables for the Project.
5. You can search for an existing Environment Variable by name using the search input and/or filter by [Environment](/docs/deployments/environments).
6. To edit or delete the Environment Variable, click the three dots to the right of the Environment Variable name.

   ![Image](`/docs-assets/static/docs/concepts/projects/environment-variables/variable-example-light.png`)


---

[View full sitemap](/docs/sitemap)
