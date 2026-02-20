---
title: Password Protection
product: vercel
url: /docs/deployment-protection/methods-to-protect-deployments/password-protection
type: how-to
prerequisites:
  - /docs/deployment-protection/methods-to-protect-deployments
  - /docs/deployment-protection
related:
  - /docs/security/deployment-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links
  - /docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
summary: Learn how to protect your deployments with a password.
---

# Password Protection

> **🔒 Permissions Required**: Password Protection

With [Password Protection](#managing-password-protection) enabled, visitors to your deployment must enter the pre-defined password to gain access.
You can set the desired password from your project settings when enabling the feature, and update it any time

![Image](`/docs-assets/static/docs/concepts/projects/password-protection-screen.png`)

## Password Protection security considerations

The table below outlines key considerations and security implications when using Password Protection for your deployments on Vercel.

| Consideration                 | Description                                                                                                                                                                                                                                                                            |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment Configuration** | Can be enabled for different environments. See [Understanding Deployment Protection by environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment)                                                                                           |
| **Compatibility**             | Compatible with [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)                                                  |
| **Bypass Methods**            | Can be bypassed using [Shareable Links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) and [Protection bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) |
| **Password Persistence**      | Users only need to enter the password once per deployment, or when the password changes, due to cookie set by the feature being invalidated on password change                                                                                                                         |
| **Password Changes**          | Users must re-enter a new password if you change the existing one                                                                                                                                                                                                                      |
| **Disabling Protection**      | All existing deployments become unprotected if you disable the feature                                                                                                                                                                                                                 |
| **Token Scope**               | JWT tokens set as cookies are valid only for the URL they were set for and can't be reused for different URLs, even if those URLs point to the same deployment                                                                                                                         |

## Managing Password Protection

You can manage Password Protection through the dashboard, API, or Terraform:

- ### Go to Project Deployment Protection Settings
  From your Vercel [dashboard](/dashboard):
  1. Select the project that you wish to enable Password Protection for
  2. Go to **Settings** then **Deployment Protection**

- ### Manage Password Protection
  From the **Password Protection** section:
  1. Use the toggle to enable the feature
  2. Select the [deployment environment](/docs/security/deployment-protection#understanding-deployment-protection-by-environment) you want to protect
  3. **Enter a password** of your choice
  4. Finally, select **Save**
  All your existing and future deployments will be protected with a password for the project. Next time when you access a deployment, you will be asked to log in by entering the password, which takes you to the deployment. A cookie will then be set in your browser for the deployment URL so you don't need to enter the password every time.

  ![Image](`/docs-assets/static/docs/concepts/projects/password-protection-light.png`)

### Manage using the API

You can manage Password Protection using the Vercel API endpoint to [update an existing project](/docs/rest-api/reference/endpoints/projects/update-an-existing-project) with the following body

- `deploymentType`
  - `prod_deployment_urls_and_all_previews`: Standard Protection
  - `all`: All Deployments
  - `preview`: Only Preview Deployments
- `password`: Password

```json
// enable / update password protection
{
  "passwordProtection": {
    "deploymentType": "prod_deployment_urls_and_all_previews" | "all" | "preview",
    "password": "<password>"
  },
}

// disable password protection
{
  "passwordProtection": null
}
```

### Manage using Terraform

You can configure Password Protection using `password_protection` in the `vercel_project` data source in the [Vercel Terraform Provider](https://registry.terraform.io/providers/vercel/vercel/latest/docs/data-sources/project).


---

[View full sitemap](/docs/sitemap)
