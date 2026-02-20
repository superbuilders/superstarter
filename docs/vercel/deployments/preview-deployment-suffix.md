---
title: Preview Deployment Suffix
product: vercel
url: /docs/deployments/preview-deployment-suffix
type: conceptual
prerequisites:
  - /docs/deployments
related:
  - /docs/deployments/environments
  - /docs/domains/add-a-domain
  - /docs/pricing
summary: When you create a new deployment, Vercel will automatically generate a unique URL which you can use to access that particular deployment.
---

# Preview Deployment Suffix

> **🔒 Permissions Required**: Preview Deployment Suffix

Preview Deployment Suffixes allow you to customize the URL of a [preview deployment](/docs/deployments/environments#preview-environment-pre-production) by replacing the default `vercel.app` suffix with a [custom domain](/docs/domains/add-a-domain) of your choice.

The entered custom domain must be:

- Available and active within the team that enabled the Preview Deployment Suffix
- Using Vercel's [Nameservers](/docs/domains/add-a-domain#vercel-nameservers)

### Enabling the Preview Deployment Suffix

> **💡 Note:** Preview Deployment Suffix is included and enabled by default in Enterprise
> plans

To enable Preview Deployment Suffix, and customize the appearance of any of your generated URLs:

1. From your [dashboard](/dashboard), select the **Settings** tab
2. Select the **Billing** tab
3. Under **Add-Ons**, set the toggle for **Preview Deployment Suffix** to **Enabled**
4. Navigate to the **Settings** tab on the team dashboard
5. Select the **General** tab and scroll down to the **Preview Deployment Suffix** section
6. Enter the custom domain of your choice in the input, and push **Save**

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployment-suffix-light.png`)

If you are not able to use Vercel's Nameservers, see our guide on [how to use a custom domain without Vercel's Nameservers](/kb/guide/preview-deployment-suffix-without-vercel-nameservers).

See the [plans add-ons](/docs/pricing#pro-plan-add-ons) documentation for information on pricing.

### Disabling the Preview Deployment Suffix

To disable Preview Deployment Suffix:

1. From your [dashboard](/dashboard), select the **Settings** tab
2. Select the **Billing** tab
3. Under **Add-Ons**, set the toggle for **Preview Deployment Suffix** to **Disabled**

The next preview deployment generated will revert back to the default `vercel.app` suffix.

### Broken Preview Deployment Suffix error

You may encounter this error if you are using the [Preview Deployment Suffix](#preview-deployment-suffix) in your team. Make sure that the custom domain you configured is:

- Active (not deleted)
- Available within the team that enabled the [Preview Deployment Suffix](#preview-deployment-suffix)
- Backed by an [active wildcard certificate](https://knowledge.digicert.com/generalinformation/INFO900.html)

The best way to satisfy all of these constraints is to ensure the domain is also added to a project located in the same team. In this project, you can include a single `index.html` that displays when someone visits the root of the domain.


---

[View full sitemap](/docs/sitemap)
