---
title: Deploying from Azure DevOps with Vercel
product: vercel
url: /docs/git/vercel-for-azure-pipelines
type: conceptual
prerequisites:
  - /docs/git
related:
  - /docs/projects/overview
  - /docs/deployments
  - /docs/git
  - /docs/cli/project
  - /docs/rest-api
summary: ​Vercel for Azure DevOps allows you to deploy from Azure Pipelines to Vercel automatically.
---

# Deploying from Azure DevOps with Vercel

The [Vercel Deployment Extension](https://marketplace.visualstudio.com/items?itemName=Vercel.vercel-deployment-extension) allows you to automatically deploy to Vercel from [Azure DevOps](https://azure.microsoft.com/en-us/products/devops). You can add the extension to your Azure DevOps Projects through the Visual Studio marketplace.

This flow is commonly used to deploy to Vercel projects from a codebase hosted in [Azure Repos](https://learn.microsoft.com/en-us/azure/devops/repos/get-started/what-is-repos?view=azure-devops), but it can be used with any Git repository that can integrate with [Azure Pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/get-started/what-is-azure-pipelines?view=azure-devops).

Once the [Vercel Deployment Extension](https://marketplace.visualstudio.com/items?itemName=Vercel.vercel-deployment-extension) is set up, your Azure DevOps project is connected to your [Vercel Project](/docs/projects/overview). You can then use Azure Pipelines inside your Azure DevOps project to trigger a [Vercel Deployment](/docs/deployments).

This page will help you use the extension in your own use case. You can:

- Follow the [quickstart](#quickstart) to set up the extension and trigger a production deployment based on commits to the `main` branch
- Use the [full-featured pipeline](#full-featured-azure-pipelines-creation) for a similar setup as [Vercel's other git integrations](/docs/git). This includes preview deployment creation on pull requests and production deployments on merging to the `main` branch
- Review the [extension task reference](#extension-task-reference) to customize the pipeline for your specific use case

## Quickstart

At the end of this quickstart, your Azure Pipelines will trigger a Vercel production deployment whenever you commit a change to the `main` branch of your code. To get this done, we will follow these steps:

1. Create a Vercel Personal Access Token
2. Create secret variables
3. Set up the Vercel Deployment Extension from the Visual Studio marketplace
4. Set up a basic pipeline in Azure Pipelines to trigger production deployments on Vercel
5. Test your workflow

Once you have the Vercel Deployment extension set up, you only need to modify your pipeline (Steps 4 and 5) to change the deployment workflow to fit your use case.

### Prerequisites

To create an empty Vercel project:

1. Use the [Vercel CLI](/docs/cli/project) with the `add` command

```bash filename="terminal"
vercel project add
```

2. Or through the [dashboard](/docs/projects/overview#creating-a-project) and then disconnect the [Git integration](/docs/projects/overview#git) that you would have set up

### Extension and Pipeline set up

- ### Create a Vercel Personal Access Token
  - Follow [Creating an Access Token](/docs/rest-api#creating-an-access-token) to create an access token with the scope of access set to the team where your Vercel Project is located
  - Copy this token to a secure location

- ### Create secret variables
  For security purposes, you should use the above created token in your Azure Pipeline through [secret variables](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables).
  - For this quickstart, we will create the secret variables when we create the pipeline. Once created, these variables will always be accessible to that pipeline
  - Otherwise, you can create them before you create the pipeline in a [variable group](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?view=azure-devops\&tabs=yaml%2Cbash#set-a-secret-variable-in-a-variable-group) or in [Azure Key Vault](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/set-secret-variables?view=azure-devops\&tabs=yaml%2Cbash#link-secrets-from-an-azure-key-vault) as long as you make sure that your Azure Project has the right access

- ### Set up the Vercel Deployment Extension
  - Go to the [Vercel Deployment Extension Visual Studio marketplace page](https://marketplace.visualstudio.com/items?itemName=Vercel.vercel-deployment-extension)
  - Click **Get it free** and select the Azure DevOps organization where your Azure Project is located

- ### Set up a basic pipeline
  This step assumes that your code exists as a repository in **Azure Repos** and that your Vercel Project is named `azure-devops-extension`.

  ![Image](`/docs-assets/static/docs/concepts/deployments/git/Azure-pipeline-light.png`)
  - From the Azure DevOps portal, select **Pipelines** from the left side bar
  - Select the **New Pipeline** button
  - Select where your code is located. In this example, we uploaded the code as an **Azure Repos Git**: select **Azure Repos Git** and then select your uploaded repository.
  - Select **Starter template** for the pipeline configuration
  - In the **Review your pipeline YAML** step, select **Variables** on the top right
    - Select **New Variable**, use `VERCEL_TOKEN` as the name and the value of the Vercel Personal Access Token you created earlier. Check the **secret** option. Select **Ok**
  - Close the **Variables** window and paste the following code to replace the code in `azure-pipelines.yml`, that you can rename to `vercel-pipeline.yml`
  ```yaml filename="vercel-pipeline.yml"
  trigger:
  - main

  pool:
    vmImage: ubuntu-latest

  steps:
  - task: vercel-deployment-task@3
    inputs:
      vercelProjectId: 'prj_mtYj0MP83muZkYDs2DIDfasdas' # Example Vercel Project ID
      vercelTeamId: 'team_ZWx5eW91dGh0b25BvcnRhbnRlYn' # Example Vercel Team ID
      vercelToken: $(VERCEL_TOKEN)
      production: true
  ```
  #### Value of `vercelProjectId`
  Look for **Project ID** located on the Vercel Project's Settings page at **Project Settings > General**.
  #### Value of `vercelTeamId`
  - If your Project is located under your Hobby team, look for **Your ID** under your Vercel Personal Account [Settings](https://vercel.com/account)
  - If your Project is located under a Team, look for **Team ID** under **Team Settings > General**
  - Select **Save and Run**
  - This should trigger a production deployment in your Vercel Project as no code was committed before

- ### Test your workflow
  - Make a change in your code inside **Azure Repos** from the `main` branch and commit the change
  - This should trigger another deployment in your Vercel Project

Your Azure DevOps project is now connected to your Vercel project with automatic production deployments on the `main` branch. You can update or create pipelines in the Azure DevOps project to customize the Vercel deployment behavior by using the [options](#extension-task-reference) of the Vercel Deployment Extension.

## Full-featured Azure Pipelines creation

In a production environment, you will often want the following to happen:

- Trigger preview deployments for pull requests to the `main` branch
- Trigger production deployments only for commits to the `main` branch

Before you update your pipeline file to enable preview deployments, you need to configure Azure DevOps with pull requests.

### Triggers and comments on pull requests

In order to allow pull requests in Azure Repos to create a deployment and report back with a comment, you need the following:

- An Azure DevOps Personal Access Token
- A build validation policy for your branch

### Create an Azure DevOps Personal Access Token

1. Go to your [Azure DevOps account](https://dev.azure.com) and select the **user settings** icon on the top right
2. Select **Personal access tokens** from the menu option
3. Select the **New Token** button
4. After completing the basic token information such as Name, Organization, and Expiration, select the **Custom defined** option under **Scopes**
5. At the bottom of the form, select **Show all scopes**
6. Browse down the scopes list until **Pull Request Threads**. Select the **Read & Write** checkbox
7. Select **Create** at the bottom of the form
8. Make sure you copy the token to a secure location before you close the prompt

### Create a build validation policy

![Image](`/docs-assets/static/docs/concepts/deployments/git/Azure-build-policy-light.png`)

1. Go to your Azure DevOps Project's page
2. Select **Project settings** in the lower left corner
3. From the Project settings left side bar, select **Repositories** under **Repos**
4. Select the repository where your vercel pipeline is set up
5. Select the **Policies** tab on the right side
6. Scroll down to **Branch Policies**, and select the `main` branch
7. Scroll down to **Build Validation** and select on the **+** button to create a new validation policy
8. Select the pipeline you created earlier and keep the policy marked as **Required** so that commits directly to main are prevented
9. Select **Save**

Create a pull request to the `main` branch. This will trigger the pipeline, run the deployment and comment back on the pull request with the deployment URL.

### Update your pipeline

- From your Azure DevOps Project, select **Pipelines** from the left side bar
- Select the pipeline that you want to edit by selecting the  icon
- Select the **Variables** button and add a new secret variable called `AZURE_TOKEN` with the value of the Azure DevOps Personal Access Token you created earlier. Select **Ok**
- Close the **Variables** window and paste the following code to replace the code in `vercel-pipelines.yml`

```yaml filename="vercel-pipeline.yml"
trigger:
- main

pool:
  vmImage: ubuntu-latest

variables:
  isMain: $[eq(variables['Build.SourceBranch'], 'refs/heads/main')]
  isPR: $[eq(variables['Build.Reason'], 'PullRequest')]

steps:
- task: vercel-deployment-task@3
  name: 'Deploy'
  condition: or(eq(variables.isMain, true), eq(variables.isPR, true))
  inputs:
    vercelProjectId: 'prj_mtYj0MP83muZkYDs2DIDfasdas' # Example Vercel Project ID
    vercelTeamId: 'team_ZWx5eW91dGh0b25BvcnRhbnRlYn' # Example Vercel Team ID
    vercelToken: $(VERCEL_TOKEN)
    production: $(isMain)
- task: vercel-azdo-pr-comment-task@3
  condition: eq(variables.isPR, true)
  inputs:
    azureToken: $(AZURE_TOKEN)
    deploymentTaskMessage: $(Deploy.deploymentTaskMessage)
```

- Select **Save**

> **💡 Note:** The `vercel-deployment-task` creates an [output
> variable](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/variables)
> called `deploymentTaskMessage`. By setting the `name:` of the step to
> `'Deploy'`, you can access it using `$(Deploy.deploymentTaskMessage)` which
> you can then assign to the input option `deploymentTaskMessage` of the
> `vercel-azdo-pr-comment-task` task step.

### Create a pull request and test

- Create a new branch in your Git repository in Azure Repos and push a commit
- Open a pull request against the `main` branch
- This will trigger a pipeline execution and create a preview deployment on Vercel
- Once the deployment has completed, you will see a comment on the pull request in Azure DevOps with the preview URL

## Extension task reference

Here, you can find a list of available properties for each of the available tasks in the Vercel Deployment Extension.

### `vercel-deployment-task`

#### Input properties

| Property          | Required | Type    | Description                                                                                                                                                                                                                                         |
| ----------------- | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vercelProjectId` | No       | string  | The [ID of your Vercel Project](#value-of-vercelprojectid); starts with `project_`. It can alternatively be set as the environment variable `VERCEL_PROJECT_ID`                                                                                     |
| `vercelTeamId`    | No       | string  | The [ID of your Vercel Team](#value-of-vercelteamid); starts with `team_`. It can alternatively be set as the environment variable `VERCEL_TEAM_ID`                                                                                                 |
| `vercelToken`     | No       | string  | A [Vercel personal access token](/docs/rest-api#creating-an-access-token) with deploy permissions for your Vercel Project. It can alternatively be set as the environment variable `VERCEL_TOKEN`                                                   |
| `vercelCWD`       | No       | string  | The working directory where the Vercel deployment task will run. When omitted, the task will run in the current directory (default value is `System.DefaultWorkingDirectory`). It can alternatively be set as the environment variable `VERCEL_CWD` |
| `production`      | No       | boolean | Boolean value specifying if the task should create a production deployment. When omitted or set to `false`, the task will create preview deployments                                                                                                |
| `target`          | No       | string  | Option to define the environment you want to deploy to. This could be production, preview, or a custom environment. This is equivalent to passing the `--environment` when deploying using the Vercel CLI.                                          |
| `archive`         | No       | boolean | Enables the `--archive=tgz` flag for the internal Vercel CLI operations                                                                                                                                                                             |
| `env`             | No       | string  | Adding environment variables at runtime using the Vercel CLI's `--env` option                                                                                                                                                                       |
| `buildEnv`        | No       | string  | Adding build environment variables to the build step using the Vercel CLI's `--build-env` option                                                                                                                                                    |
| `debug`           | No       | boolean | Boolean value that enables the `--debug` option for the internal Vercel CLI operations                                                                                                                                                              |
| `logs`            | No       | boolean | Boolean value that enables the `--logs` option for the internal Vercel CLI operations                                                                                                                                                               |

#### Output variables

| Variable                | Type   | Description                                                                                                  |
| ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `deploymentTaskMessage` | string | The message output taken from the deployment; can be passed to Vercel Azure DevOps Pull Request Comment Task |
| `deploymentURL`         | string | The URL of the deployment                                                                                    |
| `originalDeploymentURL` | string | Original URL of the deployment; can be used to create your own alias in a depending separate task            |

### `vercel-azdo-pr-comment-task`

#### Input properties

| Property                | Required | Type   | Description                                                                                                                                                    |
| ----------------------- | -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `azureToken`            | Yes      | string | An [Azure Personal Access Token](#create-an-azure-devops-personal-access-token) with the `PullRequestContribute` permission for your Azure DevOps Organization |
| `deploymentTaskMessage` | Yes      | string | The message that will added as a comment on the pull request. It is normally created by the Vercel Deployment Task                                             |


---

[View full sitemap](/docs/sitemap)
