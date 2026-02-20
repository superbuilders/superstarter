---
title: Deployment Retention
product: vercel
url: /docs/deployment-retention
type: conceptual
prerequisites:
  []
related:
  - /docs/cli/list
  - /docs/domains/working-with-domains/assign-domain-to-a-git-branch
  - /docs/deployments/environments
  - /docs/errors/DEPLOYMENT_DELETED
summary: "Learn how Deployment Retention policies affect a deployment's lifecycle"
---

# Deployment Retention

> **🔒 Permissions Required**: Deployment Retention

Deployment retention refers to the configured policies that determine how long different types of deployments are kept before they are automatically deleted.

These configured retention policies allow you to control how long your deployment data is stored, providing:

- **Enhanced protection:** Remove outdated deployments with potential vulnerabilities or sensitive data
- **Compliance support:** Configure retention policies to align with your compliance requirements.
- **Efficient storage management:** Automatically clear out unnecessary deployments

Vercel provides unlimited deployment retention for all deployments, regardless of the plan that you are on.

You can configure retention durations for the following deployment states:

- Canceled deployments
- Errored deployments
- Preview deployments
- Production deployments

For example, imagine you created a production deployment with a 60-day retention period on 01/01/2024 and later replaced it with a newer deployment. The origin deployment would expire on 03/01/2024, entering the recovery period, and users accessing it would see a 410 status code. If required, you could still restore it until 03/31/2024, when all associated resources are permanently removed and restoring the deployment is no longer possible.

Once a policy is enabled on a project, deployments within the retention period will start to be automatically marked for deletion, within a few days of enabling the policy.

## Setting a deployment retention policy

To configure a retention policy, navigate to the **Settings** tab of your project and follow these steps:

1. Select **Security** on the side panel of the project settings page
2. Scroll down to the **Deployment Retention Policy** section
3. Select the drop down menu with the appropriate duration
4. Save the new retention policy for your project

### Viewing deployment retention policy

You can view your deployments retention policy using [Vercel CLI](/docs/cli/list) and running the following command from your terminal:

```bash filename="terminal"
vercel list [project-name] [--policy errored=6m]
```

### Exceptions to the retention policy

Deployments older than the configured retention interval are not always deleted. Deployments will be kept while any of the following is true:

- The deployment is one of the last 10 deployments created in the project.
- The deployment is one of the last 20 production deployments in state Ready.
- The deployment is one of the last 20 non-production deployments in state Ready.
- The deployment has a production alias assigned to it.
- The deployment is the target of a [branch alias](/docs/domains/working-with-domains/assign-domain-to-a-git-branch) for a [custom environment](/docs/deployments/environments#custom-environments).
- The deployment is a non-production deployment and has any custom alias assigned to it.

## Restoring a deleted deployment

When a deployment is marked for deletion either accidentally or as part of the retention policy, you can restore it within the recovery period. This period is 30 days for successfully built deployments, but unsuccessful deployments may be garbage collected sooner.

To restore a deleted deployment, navigate to the **Settings** tab of your project:

1. Select **Security** on the side panel of the project settings page
2. Scroll down to the **Recently Deleted** section
3. Find the deployment that needs to be restored, and click on the dropdown menu item **Restore**
4. Complete the modal

## More resources

- [View Deployment Retention Policies](/docs/cli/list#unique-options)
- [Troubleshoot Deployment Retention Errors](/docs/errors/DEPLOYMENT_DELETED)


---

[View full sitemap](/docs/sitemap)
