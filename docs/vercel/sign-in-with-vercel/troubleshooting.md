---
title: Troubleshooting Sign in with Vercel
product: vercel
url: /docs/sign-in-with-vercel/troubleshooting
type: how-to
prerequisites:
  - /docs/sign-in-with-vercel
related:
  - /docs/sign-in-with-vercel/authorization-server-api
  - /docs/sign-in-with-vercel/getting-started
summary: Learn how to troubleshoot common errors with Sign in with Vercel
---

# Troubleshooting Sign in with Vercel

When users try to authorize your app, several errors can occur. Common troubleshooting steps include:

- Checking that all required parameters are included in your requests
- Verifying your app configuration in the dashboard
- Reviewing the [Authorization Server API](/docs/sign-in-with-vercel/authorization-server-api) documentation
- Checking the [Getting Started](/docs/sign-in-with-vercel/getting-started) guide for implementation examples

## Error handling patterns

Vercel handles authorization errors in two ways:

- **Error page**: Shown when critical parameters are missing or invalid
- **Redirect with error**: User redirected to your callback URL with error parameters

When errors redirect to your callback URL, your application must handle them and show users an appropriate message.

## Authorization endpoint errors

These errors occur when users navigate to the authorization endpoint with invalid parameters.

### Missing or invalid client\_id

When the `client_id` parameter is missing or references a non-existent app, Vercel shows an error page.

**Fix**: Verify your `client_id` matches the ID shown in your app's **Manage** page.

### Missing or invalid redirect\_uri

When the `redirect_uri` parameter is missing or doesn't match a registered callback URL, Vercel shows an error page.

**Fix**: Add the redirect URL to your app's **Authorization Callback URLs** in the **Manage** page.

### Missing response\_type

When the `response_type` parameter is missing, Vercel redirects to your callback URL with an error:

```plaintext
https://example.com/api/auth/callback?
  error=invalid_request&
  error_description=Parameter 'response_type'. Required
```

**Fix**: Include `response_type=code` in your authorization request.

### Invalid response\_type

When the `response_type` parameter has an invalid value, Vercel redirects to your callback URL with an error:

```plaintext
https://example.com/api/auth/callback?
  error=invalid_request&
  error_description=Parameter 'response_type'. Invalid enum value. Expected 'code', received 'test'
```

**Fix**: Set `response_type=code`. This is the only supported value.

### Invalid code\_challenge length

When the `code_challenge` parameter is provided but not between 43 and 128 characters, Vercel redirects to your callback URL with an error:

```plaintext
https://example.com/api/auth/callback?
  error=invalid_request&
  error_description=Parameter 'code_challenge'. code_challenge must be at least 43 characters
```

**Fix**: Generate a `code_challenge` that's between 43 and 128 characters long. Follow the [PKCE specification](https://datatracker.ietf.org/doc/html/rfc7636) for proper implementation.

### Invalid code\_challenge\_method

When the `code_challenge_method` parameter has an invalid value, Vercel redirects to your callback URL with an error:

```plaintext
https://example.com/api/auth/callback?
  error=invalid_request&
  error_description=Parameter 'code_challenge_method'. Invalid enum value. Expected 'S256', received 'test'
```

**Fix**: Set `code_challenge_method=S256`. This is the only supported value.

### Invalid prompt parameter

When the `prompt` parameter has an invalid value, Vercel redirects to your callback URL with an error:

```plaintext
https://example.com/api/auth/callback?
  error=invalid_request&
  error_description=Parameter 'prompt'. Invalid enum value. Expected 'consent' | 'login', received 'test'
```

**Fix**: Use only `consent` or `login` for the `prompt` parameter. Leave it out if you don't need to control the authorization behavior.


---

[View full sitemap](/docs/sitemap)
