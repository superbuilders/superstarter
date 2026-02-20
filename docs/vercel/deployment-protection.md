---
title: Deployment Protection on Vercel
product: vercel
url: /docs/deployment-protection
type: conceptual
prerequisites:
  []
related:
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
  - /docs/security/deployment-protection/methods-to-protect-deployments/password-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
  - /docs/domains/working-with-domains/add-a-domain
  - /docs/deployments/generated-urls
summary: "Learn how to secure your Vercel project's preview and production URLs with Deployment Protection. Configure fine-grained access control at the..."
---

# Deployment Protection on Vercel

Deployment Protection safeguards both your preview and production URLs across various environments. Configured at the project level through your settings, Deployment Protection provides detailed access control for different deployment types.

Vercel offers the following Deployment Protection features:

- [**Vercel Authentication**](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication): Restricts access to your deployments to only Vercel users with suitable access rights. Vercel Authentication is **available on all plans**
- [**Password Protection**](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection): Restricts access to your deployments to only users with the correct password. Password Protection is **available on the Enterprise plan, or as a paid add-on for Pro plans**
- [**Trusted IPs**](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips): Restricts access to your deployments to only users with the correct IP address. Trusted IPs is **available on the Enterprise plan**

> **💡 Note:** Deployment protection requires authentication for all requests, including
> those to Middleware.

## Configuring Deployment Protection

Deployment Protection is managed through your project settings. To configure Deployment Protection:

1. From the [dashboard](/dashboard), select the project you wish to set Deployment Protection on
2. Once selected, navigate to the **Settings** tab
3. From the list, select the **Deployment Protection** tab

### Team default settings

You can configure the default Deployment Protection for new projects in your team's Deployment Protection settings. This default can be overridden on individual projects as needed.

When setting a team default, you can choose the protection level (All Deployments, Standard Protection, or None) and the protection method (Vercel Authentication or Password Protection).

![Image](https://vercel.com/docs-assets/static/docs/deployment-protection/deployment-protection-team-default-light.png)

## Understanding Deployment Protection by environment

You can configure the type of Deployment Protection for each environment in your project depending on your projects security needs. When choosing your protection method, you can select from three options:

- [**Standard Protection**](#standard-protection): This option protects all domains except [Production Custom Domains](/docs/domains/working-with-domains/add-a-domain "Production Custom Domains"). Standard Protection is **available on all plans**
- [**All Deployments**](#all-deployments): Protects all URLs. Protecting all deployments is **available on Pro and Enterprise plans**
- [**(Legacy) Standard Protection**](#legacy-standard-protection): This option protects all preview URLs and [deployment URLs](/docs/deployments/generated-urls "Deployment URLs"). All [up to date production URLs](/docs/deployments/generated-urls "Up to date Production URLs") are unprotected.
- [**(Legacy) Only Preview Deployments**](#legacy-only-preview-deployments): This option protects only preview URLs. This does not protect past production deployments.

To protect [**only production URLs**](#only-production-deployments), you can use [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips). Note that this option is **only available on the Enterprise plan**.

### Standard Protection

> **🔒 Permissions Required**: Standard Protection

**Standard Protection** is the recommended way to secure your deployments, as it protects all domains except [Production Custom Domains](/docs/domains/working-with-domains/add-a-domain "Production Custom Domains").

![Image](`/contentful/image/e5382hct74si/7LHNvuRkcDlKMWswY7c8xd/858a8627a82bcec2c456bcd42618b3f5/Screenshot_2025-07-09_at_5.05.58%C3%A2__pm.png`)

Standard Protection can be configured with the following Deployment Protection features:

- [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection)
- [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)

#### Migrating to Standard Protection

Enabling Standard Protection restricts public access to the production [generated deployment URL](/docs/deployments/generated-urls). This affects `VERCEL_URL` and `VERCEL_BRANCH_URL` from [System Environment Variables](/docs/environment-variables/system-environment-variables#system-environment-variables), making them unsuitable for fetch requests.

If you are using `VERCEL_URL` or `VERCEL_BRANCH_URL` to make fetch requests, you will need to update your requests to target the same domain the user has requested.

> **💡 Note:** The Framework Environment Variable `VERCEL_URL` is prefixed with the name of
> the framework. For example, `VERCEL_URL` for Next.js is
> `NEXT_PUBLIC_VERCEL_URL`, and `VERCEL_URL` for Nuxt is `NUXT_ENV_VERCEL_URL`.
> See the [Framework Environment
> Variables](/docs/environment-variables/framework-environment-variables)
> documentation for more information.

For client-side requests, use relative paths in the fetch call to target the current domain, automatically including the user's authentication cookie for protected URLs.

```ts
// Before
fetch(`${process.env.VERCEL_URL}/some/path`);

// After
fetch('/some/path');
// Note: For operations requiring fully qualified URLs, such as generating OG images,
// replace '/some/path' with the actual domain (e.g. 'https://yourdomain.com/some/path').
```

For server-side requests, use the origin from the incoming request and manually add request cookies to pass the user's authentication cookie.

```ts
const headers = { cookie: <incoming request header cookies> };
fetch('<incoming request origin>/some/path', { headers });
```

Bypassing protection using [Protection Bypass for Automation](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) is an option but not required for requests targeting the same domain.

### All deployments

> **🔒 Permissions Required**: Protecting all deployments

Selecting **All Deployments** secures all deployments, both preview and production, restricting public access entirely.

With this configuration, all URLs, including your production domain `example.com` and [generated URLs](/docs/deployments/generated-urls) like `my-project-1234.vercel.app`, are protected.

![Image](`/front/docs/security/all-deployments-light.png`)

Protecting all deployments can be configured with the following Deployment Protection features:

- [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection)
- [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)

### Only production deployments

> **🔒 Permissions Required**: Protecting production deployments

Restrict access to protected deployments to a list of [Trusted IPs](/docs/deployment-protection/methods-to-protect-deployments/trusted-ips).

Preview deployment URLs remain publicly accessible. This feature is **only available on the Enterprise plan**.

![Image](`/front/docs/security/prod-deployments-light.png`)

### (Legacy) Standard Protection

**(Legacy) Standard Protection** is a legacy feature that protects all preview URLs and [deployment URLs](/docs/deployments/generated-urls "Deployment URLs"). All [up to date production URLs](/docs/deployments/generated-urls "Up to date Production URLs") are unprotected.

### (Legacy) Only Preview Deployments

Selecting **(Legacy) Only Preview Deployments** protects preview URLs, while the production environment remains publicly accessible.

For example, Vercel generates a preview URL such as `my-preview-5678.vercel.app`, which will be protected. In contrast, all production URLs, including any past or current generated production branch URLs like `*-main.vercel.app`, remain accessible.

## Advanced Deployment Protection

Advanced Deployment Protection features are available to Enterprise customers by default. Customers on the Pro plan can access these features for an additional $150 per month, including:

- [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection)
- [Private Production Deployments](/docs/security/deployment-protection#configuring-deployment-protection)
- [Deployment Protection Exceptions](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/deployment-protection-exceptions)

### Enabling Advanced Deployment Protection

To opt-into Advanced Deployment Protection while on a Pro plan:

1. Navigate to your **Project Settings** and select the **Deployment Protection** tab
2. Then choose one of the above protection features
3. You will then be prompted to upgrade to the Advanced Deployment Protection add-on through an **Enable and Pay** button before you can use the feature

When you enable Advanced Deployment Protection, you will be charged $150 per month for the add-on, and will have access to *all* Advanced Deployment Protection features.

### Disabling Advanced Deployment Protection

To opt out of Advanced Deployment Protection:

1. Navigate to your **Team Settings**, then the **Billing** page
2. Press **Edit** on the feature you want to disable and follow the instructions to disable the add-on

In order to disable Advanced Deployment Protection, you must have been using the feature **for a minimum of thirty days**. After this time, once cancelled, all Advanced Deployment Protection features will be disabled.

## More resources

- [Methods to protect deployments](/docs/deployment-protection/methods-to-protect-deployments)
- [Methods to bypass deployment protection](/docs/deployment-protection/methods-to-bypass-deployment-protection)


---

[View full sitemap](/docs/sitemap)
