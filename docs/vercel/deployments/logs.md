---
title: Accessing Build Logs
product: vercel
url: /docs/deployments/logs
type: how-to
prerequisites:
  - /docs/deployments
related:
  - /docs/deployments
  - /docs/deployments/configure-a-build
  - /docs/rbac/managing-team-members
  - /docs/drains
summary: "Learn how to use Vercel's build logs to monitor the progress of building or running your deployment, and check for possible errors or build failures."
---

# Accessing Build Logs

When you deploy your website to Vercel, the platform generates build logs that show the deployment progress. The build logs contain information about:

- The version of the build tools
- Warnings or errors encountered during the build process
- Details about the files and dependencies that were installed, compiled, or built during the deployment

Build logs are particularly useful for debugging issues that may arise during deployment. If a deployment fails, these can help you identify the root cause of the issue.

To access build logs, click the **Build Logs** button from the production deployment tile in the projects overview page.

![Image](`/docs-assets/static/docs/concepts/deployments/logs/buttons-light.png`)

## How build logs work?

Build logs are generated at build time for all [Deployments](/docs/deployments). The logs are similar to your framework's [Build Command](/docs/deployments/configure-a-build#build-command) output, with a few minor additions from the Vercel build system. Once a build is complete, no new logs will be recorded.

In addition to the list of build actions, you can also find errors or warnings. These are highlighted with different colors, such as yellow for warnings and red for errors. This color coding makes it flexible to investigate why your build failed and which part of your website is affected. Build logs are stored indefinitely for each deployment.

> **💡 Note:** Build logs will automatically be truncated, if the total size reaches over
> 4MB.

### Link to build logs

If you click on the timestamp to the left of the log entry, you get a link to that log entry. This will highlight the selected log and append the line number to the URL as an anchor (`#L6`). You can then share this link with other team members to point them to a specific line in the log.

You can select multiple lines by holding the `Shift` key and clicking the timestamps. This will create a link for the content between the first and last lines (`#L6-L9`).

The log link is only accessible to [team members](/docs/rbac/managing-team-members). Anyone who is not a member or has a valid Vercel account cannot access this link.

![Image](`/docs-assets/static/docs/concepts/deployments/logs/log-link-light.png`)

> **💡 Note:** The link to build logs feature works for logs that are up to 2000 lines long.

## Save logs

You can use [Drains](/docs/drains) to export, store, and analyze your build logs. Log Drains configuration can be accessed through the Vercel dashboard or through one of our [Logging integrations](/integrations#logging).


---

[View full sitemap](/docs/sitemap)
