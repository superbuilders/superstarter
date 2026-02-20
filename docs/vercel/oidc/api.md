---
title: Connect to your own API
product: vercel
url: /docs/oidc/api
type: how-to
prerequisites:
  - /docs/oidc
related:
  []
summary: "Learn how to configure your own API to trust Vercel's OpenID Connect (OIDC) Identity Provider (IdP)"
---

# Connect to your own API

> **🔒 Permissions Required**: Secure backend access with OIDC federation

## Validate the tokens

To configure your own API to accept Vercel's OIDC tokens, you need to validate the tokens using Vercel's JSON Web Keys (JWTs), available at `https://oidc.vercel.com/[TEAM_SLUG]/.well-known/jwks` with the **team** issuer mode, and `https://oidc.vercel.com/.well-known/jwks` for the **global** issuer mode.

### Use the `jose.jwtVerify` function

Install the following package:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i jose
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i jose
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i jose
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i jose
    ```
  </Code>
</CodeBlock>

In the code example below, you use the `jose.jwtVerify` function to verify the token. The `issuer`, `audience`, and `subject` are validated against the token's claims.

```ts filename="server.ts"
import http from 'node:http';
import * as jose from 'jose';

const ISSUER_URL = `https://oidc.vercel.com/[TEAM_SLUG]`;
// or use `https://oidc.vercel.com` if your issuer mode is set to Global.

const JWKS = jose.createRemoteJWKSet(new URL(ISSUER_URL, '/.well-known/jwks'));

const server = http.createServer((req, res) => {
  const token = req.headers['authorization']?.split('Bearer ')[1];

  if (!token) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  try {
    const { payload } = jose.jwtVerify(token, JWKS, {
      issuer: ISSUER_URL,
      audience: 'https://vercel.com/[TEAM_SLUG]',
      subject:
        'owner:[TEAM_SLUG]:project:[PROJECT_NAME]:environment:[ENVIRONMENT]',
    });

    res.statusCode = 200;
    res.end('OK');
  } catch (error) {
    res.statusCode = 401;
    res.end('Unauthorized');
  }
});

server.listen(3000);
```

Make sure that you:

- Replace `[TEAM_SLUG]` with your team identifier from the Vercel's team URL
- Replace `[PROJECT_NAME]` with your [project's name](https://vercel.com/docs/projects/overview#project-name) in your [project's
  settings](https://vercel.com/docs/projects/overview#project-settings)
- Replace `[ENVIRONMENT]` with one of Vercel's [environments](https://vercel.com/docs/deployments/environments#deployment-environments),
  `development`, `preview` or `production`

### Use the `getVercelOidcToken` function

Install the following package:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/functions
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/functions
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/functions
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/functions
    ```
  </Code>
</CodeBlock>

In the code example below, the `getVercelOidcToken` function is used to retrieve the OIDC token from your Vercel environment.
You can then use this token to authenticate the request to the external API.

```ts filename="/api/custom-api/route.ts"
import { getVercelOidcToken } from '@vercel/oidc';

export const GET = async () => {
  const result = await fetch('https://api.example.com', {
    headers: {
      Authorization: `Bearer ${await getVercelOidcToken()}`,
    },
  });

  return Response.json(await result.json());
};
```


---

[View full sitemap](/docs/sitemap)
