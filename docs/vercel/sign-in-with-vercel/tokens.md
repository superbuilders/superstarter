---
title: Tokens
product: vercel
url: /docs/sign-in-with-vercel/tokens
type: how-to
prerequisites:
  - /docs/sign-in-with-vercel
related:
  - /docs/sign-in-with-vercel/authorization-server-api
  - /docs/sign-in-with-vercel/manage-from-dashboard
summary: Learn how to Sign in with Vercel
---

# Tokens

There are three tokens your application will work with when using Sign in with Vercel:

- [ID Token](#id-token)
- [Access Token](#access-token)
- [Refresh Token](#refresh-token)

## ID Token

The ID Token is a signed JWT that contains information about the user who is signing in. When using ID Token claims, your application should both decode the token and verify its signature against the [public JWKS endpoint](https://vercel.com/.well-known/jwks) to ensure authenticity. The ID Token does not give access to Vercel resources, it only proves the user's identity.

```json filename="ID Token payload example"
{
  "iss": "https://vercel.com",
  "sub": "345e869043f1e55f8bdc837c",
  "aud": "cl_be6c3c8b9f340d4a20feefab2862a49a",
  "exp": 1519948800,
  "iat": 1519945200,
  "nbf": 1519945200,
  "jti": "50e67781-c8b6-4391-98d1-89d755bb095a",
  "name": "John Doe",
  "preferred_username": "john-doe",
  "picture": "https://api.vercel.com/www/avatar/00159aa4c88348dedc91a456b457d1baa48df6d",
  "email": "user@example.com",
  "nonce": "a4a522fa63f9cea6eeb1"
}
```

The code below shows how to decode and validate an ID token using the [jose](https://www.npmjs.com/package/jose) library:

```ts
import { jwtVerify, createRemoteJWKSet } from 'jose';

const jwkSet = createRemoteJWKSet(
  new URL('https://vercel.com/.well-known/jwks'),
);

async function decodeIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, jwkSet, {
    issuer: 'https://vercel.com',
    audience: [process.env.NEXT_PUBLIC_VERCEL_APP_CLIENT_ID],
  });

  return payload;
}
```

### JWT claims in ID Tokens

Vercel's IdP generates OpenID Connect tokens that contain various JWT claims depending on the requested scopes:

| Claim   | Type   | Description                                                       | Example                                  |
| ------- | ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| `iss`   | string | **Issuer** - The server that issued the token                     | `"https://vercel.com"`                   |
| `sub`   | string | **Subject** - Unique identifier for the authenticated user        | `"345e869043f1e55f8bdc837c"`             |
| `aud`   | string | **Audience** - The ID of the Vercel application                   | `"cl_be6c3c8b9f340d4a20feefab2862a49a"`  |
| `exp`   | number | **Expiration time** - Unix timestamp when the token expires       | `1519948800`                             |
| `iat`   | number | **Issued at** - Unix timestamp when the token was issued          | `1519945200`                             |
| `nbf`   | number | **Not before** - Unix timestamp before which the token is invalid | `1519945200`                             |
| `jti`   | string | **JWT ID** - Unique identifier for this specific token            | `"50e67781-c8b6-4391-98d1-89d755bb095a"` |
| `nonce` | string | Cryptographic nonce for replay protection                         | `"a4a522fa63f9cea6eeb1"`                 |

### Scope dependent claims

Depending on the scopes requested the following claims will be included in the ID Token:

| Scope     | Claims               | Description                                                 | Example                                          |
| --------- | -------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| `profile` | `name`               | The user's full display name                                | `"John Doe"`                                     |
| `profile` | `preferred_username` | The user's username on Vercel                               | `"john-doe"`                                     |
| `profile` | `picture`            | URL to the user's avatar image (only if user has an avatar) | `"https://api.vercel.com/www/avatar/avatar-42…"` |
| `email`   | `email`              | The user's email address                                    | `"user@example.com"`                             |

## Access Token

The Access Token grants your application permission to access specific resources on Vercel on behalf of the user trying to sign in. It is used to authenticate requests to Vercel's REST API. Access Tokens use an opaque format that ensures they are not readable by humans, are secure, and have server side validation to ensure they are not tampered with.

```plaintext filename="Access Token example"
vca_BQuu9ChDu3n6Pfh6YQnCshpoYkWDSFKogLqmBtQ0tC8NAA5rXt340sjz
```

Access Tokens are valid for one hour. Refresh Tokens can be exchanged to receive new Access Tokens when they expire. Refresh Tokens are valid for 30 days. When you exchange a Refresh Token for an Access Token, you also receive a new Refresh Token.

When using the Access Token in your application code to fetch the user's data, it must be included in the `Authorization` header as a Bearer token.

```ts filename="Fetching the users data with the Access Token"
const result = await fetch('https://api.vercel.com/v2/user', {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

## Refresh Token

Refresh Tokens allow your application to get a new Access Token without asking the user to sign in again. The token lasts for 30 days and rotates each time it's used. When the Access Token expires or is about to expire, a Refresh Token can be exchanged for a new Access and Refresh token pair.

Each Refresh Token is single use and automatically rotated on exchange, invalidating the previous token.

Refresh Tokens use an opaque format that ensures they are not readable by humans, are secure, and have server side validation to ensure they are not tampered with.

```plaintext filename="Refresh Token example"
vcr_BQuu9ChDu3n6Pfh6YQnCshpoYkWDSFKogLqmBtQ0tC8NAA5rXt340sjz
```

## Securing your tokens

Access and Refresh Tokens are sensitive credentials and should be stored securely. Never expose them to the client side of your application.

- They can be stored in cookies with the `HttpOnly`, `Secure` and `SameSite=Strict` attributes
- They can be stored in a database with encryption
- Revoke tokens immediately if you suspect they have been compromised, either by calling the [Revoke Token Endpoint](/docs/sign-in-with-vercel/authorization-server-api#revoke-token-endpoint) or by invalidating all tokens for your application from the [dashboard](/dashboard). See [manage Sign in with Vercel from the dashboard](/docs/sign-in-with-vercel/manage-from-dashboard) for more information.


---

[View full sitemap](/docs/sitemap)
