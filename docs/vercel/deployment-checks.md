---
title: Deployment Checks
product: vercel
url: /docs/deployment-checks
type: reference
prerequisites:
  []
related:
  - /docs/git/vercel-for-github
  - /docs/deployments/promoting-a-deployment
  - /docs/agents
  - /docs/rolling-releases
summary: Set conditions that must be met before proceeding to the next phase of the deployment lifecycle.
---

# Deployment Checks

Deployment Checks are conditions that must be met before promoting a production build to your production environment.

When a project is connected to GitHub using [Vercel for GitHub](/docs/git/vercel-for-github), Vercel can automatically read the statuses of your commits and selected GitHub Action results. Using these statuses, Vercel can prevent production deployments from [promoting to production](/docs/deployments/promoting-a-deployment) until your checks have passed.

## Understanding Deployment Checks

Decoupling production builds and releases allows teams to move faster with higher confidence at scale.

- Feature branches are worked on in isolation and merged to the default branch once the code passes required checks for merging.
- Production deployments are created after new code is merged, but must pass a set of required checks before being released to end users.

By default, Vercel automatically promotes your most recent, successful production build to your custom production domains. This creates the following release workflow:

1. Push or merge code to your default branch.
2. Vercel creates a production build.
3. Once the build is ready, release the build to production.

At scale, this can mean the set of code that is tested **before merging** is not the same as the code that would be released to end users. We want to maintain the safety of releases, while allowing developers and [agents](/docs/agents "AI Agents") to continue authoring and merging code at high velocity.

With Deployment Checks, you introduce a new step that ensures the safety of the production deployment before it's released, with the following workflow:

1. Push or merge code to your default branch.
2. Vercel creates a production deployment.
3. **Run safety checks to ensure that the build is safe for release.**
4. **Once Deployment Checks are passing**, release the build to production.

## Enabling Deployment Checks

- ### Ensure prerequisites are enabled
  1. Link your project to a Github repository using [Vercel for GitHub](/docs/git/vercel-for-github). This can be verified by navigating to your [projects settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fgit).
  2. Visit [your project's production environment settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fenvironments%2Fproduction) and ensure automatic aliasing for production is turned on.

- ### Select your Deployment Checks
  Visit [your project's settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fdeployment-checks), and select *Add Checks* to select required Deployment Checks.

- ### Update workflows (if necessary)
  If using GitHub Actions with a [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch) trigger, update your workflows to set a status for Vercel using the [`vercel/repository-dispatch/actions/status@v1`](https://github.com/vercel/repository-dispatch/actions/status) action. This will ensure the commit that triggered the deployment is the one that is used to determine if the Deployment Checks are met.
  ```yaml
  - name: 'Notify Vercel'
    uses: 'vercel/repository-dispatch/actions/status@v1'
    with:
      # The name of the check will be used to identify the check in the Deployment Checks settings and must be unique
      name: "Vercel - my-project: e2e-tests"
  ```
  If you are **not** using [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch), you can still use the [`vercel/repository-dispatch/actions/status@v1`](https://github.com/vercel/repository-dispatch/actions/status), however it is not required and you can depend on the check directly.

- ### Create a new production deployment
  Deployment Checks appear as part of a production deployment's lifecycle. Production deployments will still be created, but will not be automatically assigned to your custom domains until all Deployment Checks are met.

- ### Run GitHub Actions to fulfill all Deployment Checks
  To meet Deployment Checks, run their corresponding GitHub Actions.

  If you're using [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch) to trigger a workflow in response to Vercel deployments, you must use the [`vercel.deployment.ready` event](/docs/git/vercel-for-github#repository-dispatch-events). This event triggers after the deployment is created, and before checks are run.

- ### Promote to production once all Deployment Checks are met
  Once all of the Deployment Checks have passed, the deployment is aliased to your production domain(s) automatically.

  For additional release protection, enable [Rolling Releases](/docs/rolling-releases) to ensure your deployment is fractionally released before promoting to everyone.

## Bypassing Deployment Checks

You can bypass Deployment Checks by selecting [Force Promote](/docs/deployments/promoting-a-deployment) from the deployment details page.

## Limitations

GitHub and GitHub Actions have edge cases with status reporting. These behaviors are matched in GitHub-backed Deployment Checks.

- To trigger a workflow in response to Vercel deployments using [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch), use the [`vercel/repository-dispatch/actions/status@v1`](https://github.com/vercel/repository-dispatch/actions/status) action to set a status on the commit for Vercel Deployment Checks. This will ensure the commit that triggered the deployment is the one that is used to determine if the Deployment Checks are met.
- GitHub uses the names of jobs to identify which checks are the same across instances. This means that:
  - Changing the name of a job requires updating your Deployment Checks to align with the names
  - Each run of a GitHub Workflow should result in only one commit status. For example, when using [`repository_dispatch`](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows#repository_dispatch), ensure the commit status includes the environment name to avoid writing to the same status for each of the triggered workflow runs.
- Avoid using the same name for actions across multiple workflows. Due to GitHub's implementation of Check Runs, these will collide and introduce race conditions when used with GitHub branch protection rules, GitHub rulesets, and Vercel Deployment Checks.


---

[View full sitemap](/docs/sitemap)
