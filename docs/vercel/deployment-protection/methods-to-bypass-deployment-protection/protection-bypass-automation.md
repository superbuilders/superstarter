---
title: Protection Bypass for Automation
product: vercel
url: /docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
type: how-to
prerequisites:
  - /docs/deployment-protection/methods-to-bypass-deployment-protection
  - /docs/deployment-protection
related:
  - /docs/security/deployment-protection/methods-to-protect-deployments/password-protection
  - /docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication
  - /docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips
  - /docs/environment-variables/system-environment-variables
  - /docs/rbac/access-roles
summary: Learn how to bypass Vercel Deployment Protection for automated tooling (e.g. E2E testing).
---

# Protection Bypass for Automation

> **🔒 Permissions Required**: Protection Bypass for Automation

The Protection Bypass for Automation feature lets you bypass Vercel Deployment Protection ([Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection), [Vercel Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication), and [Trusted IPs](/docs/security/deployment-protection/methods-to-protect-deployments/trusted-ips)) for automated tooling (e.g. E2E testing).

You can create multiple automation bypass secrets for a project, allowing you to manage access for different tools or environments independently. Each bypass secret can have an optional note to help you identify its purpose (e.g. "CI/CD pipeline" or "Playwright tests").

Each generated secret can be used to bypass deployment protection on all deployments in a project until it is revoked. One bypass secret is automatically designated to be added to your deployments as a [system environment variable](/docs/environment-variables/system-environment-variables#VERCEL_AUTOMATION_BYPASS_SECRET) `VERCEL_AUTOMATION_BYPASS_SECRET`. When multiple bypasses exist, you can select which one is designated using the 'Replace Environment Variable' option.

The environment variable value is set when a deployment is built, so regenerating or deleting the secret in the project settings will invalidate previous deployments. You will need to redeploy your app if you update the secret in order to use the new value.

![Image](<&#xA;    '/docs-assets/static/docs/deployment-protection/protection-bypass-light.png'&#xA;  >)

## Permissions for Protection Bypass for Automation

- [Team members](/docs/rbac/access-roles#team-level-roles) with at least the [member](/docs/rbac/access-roles#member-role) role
- [Project members](/docs/rbac/access-roles#project-level-roles) with the [Project Administrator](/docs/rbac/access-roles#project-administrators) role

## Using Protection Bypass for Automation

To use Protection Bypass for Automation, you can authenticate using either an HTTP header or a query parameter named `x-vercel-protection-bypass` with the value of the generated secret for the project.

### Method 1: HTTP header (recommended)

Using a header is the recommended approach for most automation tools:

### Method 2: Query parameter

For tools that cannot set custom headers (such as webhook URL verification for third-party services like Slack, Stripe, or other integrations), append the bypass secret as a query parameter to your URL:

```bash
https://your-deployment.vercel.app/api/webhook?x-vercel-protection-bypass=your-generated-secret
```

> **💡 Note:** For security, use an environment variable to store the bypass secret rather
> than hardcoding it in your webhook URL configuration. Many third-party
> services support environment variable substitution in webhook URLs.

This is particularly useful for:

- **Slack bot verification**: When Slack needs to verify your webhook URL during app configuration
- **Third-party webhooks**: Services that send POST requests to your endpoints but don't support custom headers
- **URL-based integrations**: Any service that only accepts a URL without header configuration

### Advanced configuration

To bypass authorization on follow-up requests (e.g. for **in-browser testing**) you can set an additional header or query parameter named `x-vercel-set-bypass-cookie` with the value `true`.

This will set the authorization bypass as a cookie using a redirect with a `Set-Cookie` header.

If you are accessing the deployment through a non-direct way (e.g. in an `iframe`) then you may need to further configure `x-vercel-set-bypass-cookie` by setting the value to `samesitenone`.

This will set `SameSite` to `None` on the `Set-Cookie` header, by default `SameSite` is set to `Lax`.

### Examples

#### Playwright

```typescript filename="playwright.config.ts"
const config: PlaywrightTestConfig = {
  use: {
    extraHTTPHeaders: {
      'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
      'x-vercel-set-bypass-cookie': true | 'samesitenone' (optional)
    }
  }
}
```

#### Slack bot webhook verification

When configuring a Slack bot, Slack needs to verify your webhook URL. Since Slack's verification request cannot include custom headers, use the query parameter method:

```json filename="Slack App Manifest"
{
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-app.vercel.app/api/slack/events?x-vercel-protection-bypass=your-generated-secret"
    },
    "interactivity": {
      "request_url": "https://your-app.vercel.app/api/slack/interactions?x-vercel-protection-bypass=your-generated-secret"
    }
  }
}
```

Slack will keep sending requests to the configured URL; since the bypass secret is part of the URL, it will be included on every request.

#### Other webhook services

For any third-party service that sends webhooks (Stripe, GitHub, etc.), append the bypass secret to your webhook URL:

```bash
# Stripe webhook URL
https://your-app.vercel.app/api/stripe-webhook?x-vercel-protection-bypass=your-generated-secret

# GitHub webhook URL
https://your-app.vercel.app/api/github-webhook?x-vercel-protection-bypass=your-generated-secret
```


---

[View full sitemap](/docs/sitemap)
