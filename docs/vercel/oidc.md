---
title: OpenID Connect (OIDC) Federation
product: vercel
url: /docs/oidc
type: conceptual
prerequisites:
  []
related:
  - /docs/oidc/aws
  - /docs/oidc/gcp
  - /docs/oidc/azure
  - /docs/oidc/api
  - /docs/cli/env
summary: Secure the access to your backend using OIDC Federation to enable auto-generated, short-lived, and non-persistent credentials.
---

# OpenID Connect (OIDC) Federation

> **🔒 Permissions Required**: Secure backend access with OIDC federation

When you create long-lived, persistent credentials in your backend to allow access from your web applications, you increase the security risk of these credentials being leaked and hacked. You can mitigate this risk with OpenID Connect (OIDC) federation which issues short-lived, non-persistent tokens that are signed by Vercel's OIDC Identity Provider (IdP).

Cloud providers such as Amazon Web Services, Google Cloud Platform, and Microsoft Azure can trust these tokens and exchange them for short-lived credentials. This way, you can avoid storing long-lived credentials as Vercel environment variables.

### Benefits

- **No persisted credentials**: There is no need to copy and paste long-lived access tokens
  from your cloud provider into your Vercel environment variables. Instead, you can exchange the OIDC token for short-lived
  access tokens with your trusted cloud provider
- **Granular access control**: You can configure your cloud providers to grant different permissions depending
  on project or environment. For instance, you can separate your development, preview and production environments on your cloud provider and
  only grant Vercel issued OIDC tokens access to the necessary environment(s)
- **Local development access**: You can configure your cloud provider to trust local development environments so that long-lived credentials do not need to be stored locally

## Getting started

To securely connect your deployment with your backend, configure your backend to trust Vercel's OIDC Identity Provider and connect to it from your Vercel deployment:

- [Connect to Amazon Web Services (AWS)](/docs/oidc/aws)
- [Connect to Google Cloud Platform (GCP)](/docs/oidc/gcp)
- [Connect to Microsoft Azure](/docs/oidc/azure)
- [Connect to your own API](/docs/oidc/api)

## Issuer mode

There are two options available configure the token's issuer URL (`iss`):

1. **Team** *(Recommended)*: The issuer URL is bespoke to your team e.g. `https://oidc.vercel.com/acme`.
2. **Global**: The issuer URL is generic e.g. `https://oidc.vercel.com`

To change the issuer mode:

- Open your project from the Vercel dashboard
- Select the Settings tab
- Navigate to Security
- From **Secure backend access with OIDC federation** section, toggle between **Team** or **Global** and click "Save".

## How OIDC token federation works

### In Builds

When you run a build, Vercel automatically generates a new token and assigns it to the `VERCEL_OIDC_TOKEN`
environment variable. You can then exchange the token for short-lived access tokens with your cloud provider.

### In Vercel Functions

When your application invokes a function, the OIDC token is set to the `x-vercel-oidc-token` header
on the function's `Request` object.

Vercel does not generate a fresh OIDC token for each execution but caches the token for a maximum of 45 minutes. While the token has a Time to Live (TTL) of 60 minutes, Vercel provides the difference to ensure the token doesn't expire within the lifecycle of a function's maximum execution duration.

### In Local Development

You can download the `VERCEL_OIDC_TOKEN` straight to your local development environment using the CLI command
`vercel env pull`.

```bash filename="terminal"
vercel env pull
```

This writes the `VERCEL_OIDC_TOKEN` environment variable and other environment variables targeted
to `development` to the `.env.local` file of your project folder. See the [CLI docs](/docs/cli/env) for more information.

## Related


---

[View full sitemap](/docs/sitemap)
