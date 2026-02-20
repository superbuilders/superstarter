---
title: Sign in with Vercel
product: vercel
url: /docs/sign-in-with-vercel
type: how-to
prerequisites:
  []
related:
  - /docs/sign-in-with-vercel/getting-started
  - /docs/sign-in-with-vercel/consent-page
  - /docs/sign-in-with-vercel/tokens
  - /docs/sign-in-with-vercel/scopes-and-permissions
  - /docs/sign-in-with-vercel/authorization-server-api
summary: Learn how to Sign in with Vercel
---

# Sign in with Vercel

Sign in with Vercel lets people use their Vercel account to log in to your application. Your application doesn't need to handle passwords, create accounts, or manage user sessions. Instead it asks Vercel for proof of identity using the Vercel Identity Provider (IdP), so you can authenticate users without managing their credentials.

Vercel's IdP uses the [OAuth 2.0](https://auth0.com/intro-to-iam/what-is-oauth-2 "What is the OAuth 2.0 protocol?") authorization framework, a widely adopted industry standard for securing and delegating access to resources on behalf of users. Vercel's IdP also supports [OpenID Connect (OIDC)](https://openid.net/specs/openid-connect-core-1_0.html), an authentication layer built on top of OAuth 2.0.

> **💡 Note:** For users to be able to use Sign in with Vercel in your application, they must
> have a Vercel account.

To learn how to set up Sign in with Vercel, see the [getting started with Sign in with Vercel](/docs/sign-in-with-vercel/getting-started) guide.

## When to use Sign in with Vercel

Sign in with Vercel should be used when you want to offer your users an easy way to sign in to your application.

In the same way that you can sign in with Google, GitHub, or other providers on the web, you can use Sign in with Vercel to authenticate users with their Vercel account, meaning they don't need to create a new account or remember a new password, they can just use their Vercel account.

When configuring the app you will be able to choose which user information will be shared to your application, and users will have to [consent to it](/docs/sign-in-with-vercel/consent-page).

## High level overview

Sign in with Vercel is based on the OAuth 2.0 authorization framework, which allows your application to request access to user data from Vercel's Identity Provider (IdP). The IdP is a secure way to authenticate users without managing their credentials.

1. A user clicks the Sign in with Vercel button in your application
2. Your application redirects the user to Vercel's IdP consent page (or opens it in a popup window)
3. They review the permissions and click **Allow**
4. After approval by the user, Vercel sends your application a short lived `code` to your pre-registered callback URL
5. Your application swaps the `code` for tokens
6. Your application uses those tokens to identify the user and log them into your application

### Tokens

- **ID Token**: A signed JWT that proves who the user is. Your application verifies its signature and read claims to identify the user
- **Access Token**: A bearer token your application uses to call the Vercel REST API for the permissions the user grants. This lasts for 1 hour
- **Refresh Token**: This token lets your application get a new Access Token without asking the user to sign in again. This lasts for 30 days and rotates each time it's used

Learn more about each token in the [tokens](/docs/sign-in-with-vercel/tokens) documentation.

### Scopes and permissions

Scopes decide what identity information from the user goes into the ID Token and whether to issue a Refresh Token.

Learn more about scopes and permissions in the [scopes and permissions](/docs/sign-in-with-vercel/scopes-and-permissions) documentation.

### Consent page

The first time someone tries to sign in to your application, Vercel will show them a consent page to review the permissions your application is requesting. This page includes your application's name, logo, and the requested permissions.

If the user grants access, they are redirected back to your application where you can use the tokens to identify the user and log them into your application.

If they cancel the sign in, they are redirected back to your application where you can handle the failed sign in state in your application (for example with a custom error page).

Learn more about the consent page in the [consent page](/docs/sign-in-with-vercel/consent-page) documentation.

## More resources

- [Getting started with Sign in with Vercel](/docs/sign-in-with-vercel/getting-started)
- [Tokens](/docs/sign-in-with-vercel/tokens)
- [Scopes and permissions](/docs/sign-in-with-vercel/scopes-and-permissions)
- [Authorization Server API](/docs/sign-in-with-vercel/authorization-server-api)
- [Manage Sign in with Vercel from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard)
- [Consent page](/docs/sign-in-with-vercel/consent-page)
- [Troubleshooting](/docs/sign-in-with-vercel/troubleshooting)


---

[View full sitemap](/docs/sitemap)
