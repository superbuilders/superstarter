---
title: Vercel Authentication
product: vercel
url: /docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
type: how-to
prerequisites:
  - /docs/deployment-protection/methods-to-protect-deployments
  - /docs/deployment-protection
related:
  - /docs/rbac/access-roles
  - /docs/rbac/access-groups
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
  - /docs/comments
summary: Learn how to use Vercel Authentication to restrict access to your deployments.
---

# Vercel Authentication

> **🔒 Permissions Required**: Vercel Authentication

Vercel Authentication lets you restrict access to your public and non-public deployments. It is the **recommended** approach to protecting your deployments, and available on all plans. When enabled, it allows only users with deployment access to view and comment on your site.

Users attempting to access the deployment will encounter a Vercel login redirect. If already logged into Vercel, Vercel will authenticate them automatically.

After login, users are redirected and a cookie is set in the browser if they have view access. If the user does not have access to view the deployment, they will be redirected to [request access](#access-requests).

## Who can access protected deployments?

- Logged in [team members](/docs/rbac/access-roles#team-level-roles) with at least a viewer role ([Viewer Pro](/docs/rbac/access-roles#viewer-pro-role) or [Viewer Enterprise](/docs/rbac/access-roles#viewer-enterprise-role))
- Logged in [project members](/docs/rbac/access-roles#project-level-roles) with at least the [project Viewer](/docs/rbac/access-roles#project-viewer) role
- Logged in members of an [access group](/docs/rbac/access-groups) that has access to the project the deployment belongs to
- Logged in Vercel users who have been [granted access](#access-requests)
- Anyone who has been given a [Shareable Link](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) to the deployment
- Tools using the [protection bypass for automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) header

## Access requests

> **🔒 Permissions Required**: Access requests

When a Vercel user visits your protected deployment, but they do not have permission to access it, they have the option to request access for their Vercel account.
This request triggers an email and Vercel notification to the branch authors.

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/request-access.png`)

The access request can be approved or declined. Additionally, granted access can be revoked for a user at any time.

Users granted access can view the latest deployment from a specific branch when logged in with their Vercel account.
They can also leave preview [Comments](/docs/comments) if these are enabled on your team.

Those on the Hobby plan can only have one external user per account. If you need more, you can upgrade to a [Pro plan](/docs/plans/pro-plan/trials).

You can manage access requests in the following way

1. From your [dashboard](/dashboard) go to the **Settings** tab
2. Select Deployment Protection and then choose the **Requests** tab to see pending requests
3. Choose **Access** to manage existing access

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/manage-requests.png`)

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/granted-access-list.png`)

Access requests can also be managed using the share modal on the deployment page

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/manage-access-v2-light.png`)

## Vercel Authentication security considerations

You can configure Vercel Authentication for different environments, as outlined in [Understanding Deployment Protection by environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment). This feature works alongside other security measures like [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips). For specific use-cases, you can bypass Vercel Authentication with methods like [Shareable Links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) or [Protection bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Disabling Vercel Authentication renders all existing deployments unprotected. However, re-enabling it allows previously authenticated users to maintain access without a new login provided they have already authenticated to the specific deployment and have a cookie set in their browser. The authentication token sent as a cookie is restricted to one URL and isn't transferable, even between URLs pointing to the same deployment.

| Consideration                 | Description                                                                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment Configuration** | Can be enabled for different environments. See [Understanding Deployment Protection by environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment)                                                                                           |
| **Compatibility**             | Compatible with [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)                                                      |
| **Bypass Methods**            | Can be bypassed using [Shareable Links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) and [Protection bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) |
| **Disabling**                 | All existing deployments become unprotected when Vercel Authentication is disabled                                                                                                                                                                                                     |
| **Re-enabling**               | Users who have logged in previously will still have access without re-authenticating                                                                                                                                                                                                   |
| **Token Scope**               | Tokens are valid for a single URL and are not reusable across different URLs                                                                                                                                                                                                           |

## Managing Vercel Authentication

Admins and members can enable or disable Vercel Authentication for their team. Hobby teams can also enable or disable for their own projects. Vercel Authentication is managed on a **per-project** basis.

You can manage Vercel Authentication through the dashboard, API, or Terraform:

### Manage using the dashboard

- ### Go to Project Deployment Protection Settings
  From your Vercel [dashboard](/dashboard):
  1. **Select the project** that you wish to enable Password Protection for
  2. Go to **Settings** then **Deployment Protection**

- ### Manage Vercel Authentication
  From the **Vercel Authentication** section:
  1. Use the toggle to enable the feature
  2. Select the [deployment environment](/docs/deployments/environments) you want to protect
  3. Finally, Select **Save**
  All your existing and future deployments will be protected with Vercel Authentication for the project. Next time when you access a deployment, you will be asked to log in with Vercel if you aren't already logged in, you will be redirected to the deployment URL and a cookie will be set in your browser for that deployment URL.

  ![Image](`/docs-assets/static/docs/concepts/projects/sso-protection-light.png`)

### Manage using the API

You can manage Vercel Authentication using the Vercel API endpoint to [update an existing project](/docs/rest-api/reference/endpoints/projects/update-an-existing-project) with the following body

- `prod_deployment_urls_and_all_previews`: Standard Protection
- `all`: All Deployments
- `preview`: Only Preview Deployments

```json
// enable / update Vercel Authentication
{
  "ssoProtection": {
    "deploymentType": "prod_deployment_urls_and_all_previews" | "all" | "preview"
  }
}

// disable Vercel Authentication
{
  "ssoProtection": null
}
```

### Manage using Terraform

You can configure Vercel Authentication using `vercel_authentication` in the `vercel_project` data source in the [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs/data-sources/project).


---

[View full sitemap](/docs/sitemap)
