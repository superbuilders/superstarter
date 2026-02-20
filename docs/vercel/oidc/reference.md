---
title: OIDC Federation Reference
product: vercel
url: /docs/oidc/reference
type: reference
prerequisites:
  - /docs/oidc
related:
  []
summary: Review helper libraries to help you connect with your backend and understand the structure of an OIDC token.
---

# OIDC Federation Reference

> **🔒 Permissions Required**: Secure backend access with OIDC federation

## Helper libraries

Vercel provides helper libraries to make it easier to exchange the OIDC token for short-lived credentials with your cloud provider.
They are available from the [@vercel/oidc](https://www.npmjs.com/package/@vercel/oidc) and [@vercel/oidc-aws-credentials-provider](https://www.npmjs.com/package/@vercel/oidc-aws-credentials-provider) packages on npm.

### AWS SDK credentials provider

`awsCredentialsProvider()` is a helper function that returns a function that can be used as the `credentials` property of the
AWS SDK client. It exchanges the OIDC token for short-lived credentials with AWS by calling the `AssumeRoleWithWebIdentity`
operation.

#### AWS S3 usage example

```ts
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import * as s3 from '@aws-sdk/client-s3';

const s3client = new s3.S3Client({
  region: process.env.AWS_REGION!,
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
  }),
});
```

### Other cloud providers

`getVercelOidcToken()` returns the OIDC token from the `VERCEL_OIDC_TOKEN` environment variable in
builds and local development environments or the `x-vercel-oidc-token` in Vercel functions.

#### Azure / CosmosDB example

```ts
import { getVercelOidcToken } from '@vercel/oidc';
import { ClientAssertionCredential } from '@azure/identity';
import { CosmosClient } from '@azure/cosmos';

const credentialsProvider = new ClientAssertionCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  getVercelOidcToken,
);

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  aadCredentials: credentialsProvider,
});
```

> **💡 Note:** In the Vercel function environments, you cannot execute the
> `getVercelOidcToken()` function directly at the module level because the token
> is only available in the `Request` object as the `x-vercel-oidc-token` header.

## Team and project name changes

If you change the name of your team or project, the claims within the OIDC token will reflect the new names. This can affect
your trust and access control policies. You should consider this when you plan to rename your team or project and update your
policies accordingly.

AWS roles can support multiple conditions so you can allow access to both the old and new team and project names. The following example shows when the issuer mode is set to **global**:

```json filename="aws-trust-policy.json"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com:aud": [
            "https://vercel.com/[OLD_TEAM_SLUG]",
            "https://vercel.com/[NEW_TEAM_SLUG]"
          ],
          "oidc.vercel.com:sub": [
            "owner:[OLD_TEAM_SLUG]:project:[OLD_PROJECT_NAME]:environment:production",
            "owner:[NEW_TEAM_SLUG]:project:[NEW_PROJECT_NAME]:environment:production"
          ]
        }
      }
    }
  ]
}
```

If your project is using the `team` issuer mode, you will need to create a new OIDC provider and add another statement to the trust policy:

```json filename="aws-trust-policy.json"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OldTeamName",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[OLD_TEAM_SLUG]"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com/[OLD_TEAM_SLUG]:aud": [
            "https://vercel.com/[OLD_TEAM_SLUG]"
          ],
          "oidc.vercel.com/[OLD_TEAM_SLUG]:sub": [
            "owner:[OLD_TEAM_SLUG]:project:[OLD_PROJECT_NAME]:environment:production"
          ]
        }
      }
    },
    {
      "Sid": "NewTeamName",
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[NEW_TEAM_SLUG]"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.vercel.com/[NEW_TEAM_SLUG]:aud": [
            "https://vercel.com/[NEW_TEAM_SLUG]"
          ],
          "oidc.vercel.com/[NEW_TEAM_SLUG]:sub": [
            "owner:[NEW_TEAM_SLUG]:project:[NEW_PROJECT_NAME]:environment:production"
          ]
        }
      }
    }
  ]
}
```

## OIDC token anatomy

You can validate OpenID Connect tokens by using the issuer's OpenID Connect Discovery Well Known location, which is either `https://oidc.vercel.com/.well-known/openid-configuration` or `https://oidc.vercel.com/[TEAM_SLUG]/.well-known/openid-configuration` depending on the issuer mode in your project settings. There, you can find a property called `jwks_uri` which
provides a URI to Vercel's public JSON Web Keys (JWKs). You can use the corresponding JWK identified by `kid` to verify tokens
that are signed with the same `kid` in the token's header.

### Example token

```json
// Header:
{
  "typ": "JWT",
  "alg": "RS256",
  "kid": "example-key-id"
}
// Claims:
{
  "iss": "https://oidc.vercel.com/acme",
  "aud": "https://vercel.com/acme",
  "sub": "owner:acme:project:acme_website:environment:production",
  "iat": 1718885593,
  "nfb": 1718885593,
  "exp": 1718889193,
  "owner": "acme",
  "owner_id": "team_7Gw5ZMzpQA8h90F832KGp7nwbuh3",
  "project": "acme_website",
  "project_id": "prj_7Gw5ZMBpQA8h9GF832KGp7nwbuh3",
  "environment": "production"
}
```

### Standard OpenID Connect claims

This is a list of standard tokens that you can expect from an OpenID Connect JWT:

| Claim | Kind       | Description                                                                                                                                                                                |
| ----- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `iss` | Issuer     | When using the **team** issuer mode, the issuer is set to `https://oidc.vercel.com/[TEAM_SLUG]`When using the **global** issuer mode, the issuer is set to `https://oidc.vercel.com` |
| `aud` | Audience   | The audience is set to `https://vercel.com/[TEAM_SLUG]`                                                                                                                                    |
| `sub` | Subject    | The subject is set to `owner:[TEAM_SLUG]:project:[PROJECT_NAME]:environment:[ENVIRONMENT]`                                                                                                 |
| `iat` | Issued at  | The time the token was created                                                                                                                                                             |
| `nbf` | Not before | The token is not valid before this time                                                                                                                                                    |
| `exp` | Expires at | The time the token has or will expire. `preview` and `production` tokens expire one hour after creation, `development` tokens expire in 12 hours.                                          |

### Additional claims

These claims provide more granular access control:

| Claim         | Description                                                                            |
| ------------- | -------------------------------------------------------------------------------------- |
| `owner`       | The team slug, e.g. `acme`                                                             |
| `owner_id`    | The team ID, e.g. `team_7Gw5ZMzpQA8h90F832KGp7nwbuh3`                                  |
| `project`     | The project name, e.g. `acme_website`                                                  |
| `project_id`  | The project ID, e.g. `prj_7Gw5ZMBpQA8h9GF832KGp7nwbuh3`                                |
| `environment` | The environment: `development` or `preview` or `production`                            |
| `user_id`     | When environment is `development`, this is the ID of the user who was issued the token |

### JWT headers

These headers are standard to the JWT tokens:

| Header | Kind      | Description                                      |
| ------ | --------- | ------------------------------------------------ |
| `alg`  | Algorithm | The algorithm used by the issuer                 |
| `kid`  | Key ID    | The identifier of the key used to sign the token |
| `typ`  | Type      | The type of token, this is set to `jwt`.         |


---

[View full sitemap](/docs/sitemap)
