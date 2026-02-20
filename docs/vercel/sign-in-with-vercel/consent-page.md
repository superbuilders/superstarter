---
title: Consent Page
product: vercel
url: /docs/sign-in-with-vercel/consent-page
type: how-to
prerequisites:
  - /docs/sign-in-with-vercel
related:
  - /docs/sign-in-with-vercel/authorization-server-api
summary: Learn how the consent page works when users authorize your app
---

# Consent Page

When users sign in to your application for the first time, Vercel shows them a consent page that displays:

- Your app's name and logo
- The permissions your app requests
- Two actions: **Allow** or **Cancel**

Users review these permissions before deciding whether to authorize your app.

## When users click Allow

When a user clicks **Allow**, Vercel redirects them to your authorization callback URL with a `code` query parameter:

```plaintext
https://example.com/callback?code=abc123...
```

Your application exchanges this code for tokens using the [Token Endpoint](/docs/sign-in-with-vercel/authorization-server-api#token-endpoint).

## When users click Cancel

When a user clicks **Cancel**, Vercel redirects them to your authorization callback URL with error parameters:

```bash
https://example.com/callback?
  error=access_denied&
  error_description=The user canceled the authorization process
```

Your application should handle this error and display an appropriate message to the user.

## Returning users

Users only see the consent page the first time they authorize your app, and if you add new scopes and permissions to your app. On subsequent sign-ins, Vercel redirects them immediately to your callback URL with a new authorization code.

To force users to see the consent page again, include `prompt=consent` in your authorization request. Learn more in the [Authorization Endpoint](/docs/sign-in-with-vercel/authorization-server-api#authorization-endpoint) documentation.


---

[View full sitemap](/docs/sitemap)
