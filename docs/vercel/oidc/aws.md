---
title: Connect to Amazon Web Services (AWS)
product: vercel
url: /docs/oidc/aws
type: how-to
prerequisites:
  - /docs/oidc
related:
  - /docs/environment-variables
  - /docs/functions/quickstart
summary: "Learn how to configure your AWS account to trust Vercel's OpenID Connect (OIDC) Identity Provider (IdP)."
---

# Connect to Amazon Web Services (AWS)

> **🔒 Permissions Required**: Secure backend access with OIDC federation

To understand how AWS supports OIDC, and for a detailed user guide on creating an OIDC identity provider with AWS, consult the [AWS OIDC documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html).

## Configure your AWS account

- ### Create an OIDC identity provider
  1. Navigate to the [AWS Console](https://console.aws.amazon.com/)
  2. Navigate to **IAM** then **Identity Providers**
  3. Select **Add Provider**
  4. Select **OpenID Connect** from the provider type
  5. Enter the **Provider URL**, the URL will depend on the issuer mode setting:
     - **Team**: `https://oidc.vercel.com/[TEAM_SLUG]`, replacing `[TEAM_SLUG]` with the path from your Vercel team URL
     - **Global**: `https://oidc.vercel.com`
  6. Enter `https://vercel.com/[TEAM_SLUG]` in the **Audience** field, replacing `[TEAM_SLUG]` with the path from your Vercel team URL
  7. Select **Add Provider**
  ![Image](`/docs-assets/static/docs/concepts/oidc-tokens/aws-create-id-provider.png`)

- ### Create an IAM role
  To use AWS OIDC Federation you must have an [IAM role](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html). [IAM roles](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) require a "trust relationship" (also known as a "trust policy") that describes which "Principal(s)" are allowed to assume the role under certain "Condition(s)".

  Here is an example of a trust policy using the **Team** issuer mode:
  ```json filename="trust-policy.json"
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[TEAM_SLUG]"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "oidc.vercel.com/[TEAM_SLUG]:sub": "owner:[TEAM SLUG]:project:[PROJECT NAME]:environment:production",
            "oidc.vercel.com/[TEAM_SLUG]:aud": "https://vercel.com/[TEAM SLUG]"
          }
        }
      }
    ]
  }
  ```
  The above policy's conditions are quite strict. It requires the `aud` sub `sub` claims to match exactly,
  but it's possible to configure less strict trust policies conditions:
  ```json filename="trust-policy.json"
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::[YOUR AWS ACCOUNT ID]:oidc-provider/oidc.vercel.com/[TEAM_SLUG]"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "oidc.vercel.com/[TEAM_SLUG]:aud": "https://vercel.com/[TEAM SLUG]"
          },
          "StringLike": {
            "oidc.vercel.com/[TEAM_SLUG]:sub": [
              "owner:[TEAM SLUG]:project:*:environment:preview",
              "owner:[TEAM SLUG]:project:*:environment:production"
            ]
          }
        }
      }
    ]
  }
  ```
  This policy allows any project matched by the `*` that are targeted to `preview` and `production` but not `development`.

- ### Define the role ARN as environment variable
  Once you have created the role, copy the [role's ARN](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html#identifiers-arns) and [declare it as an environment variable](/docs/environment-variables#creating-environment-variables) in your Vercel project with key name `AWS_ROLE_ARN`.
  ```env filename=".env.local"
  AWS_ROLE_ARN=arn:aws:iam::accountid:user/username
  ```
  You are now ready to connect to your AWS resource in your project's code. Review the examples below.

## Examples

In the following examples, you create a [Vercel function](/docs/functions/quickstart#create-a-vercel-function) in the Vercel project where you have defined the OIDC role ARN environment variable. The function will connect to a specific resource in your AWS backend using OIDC and perform a specific action using the AWS SDK.

### List objects in an AWS S3 bucket

Install the following packages:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @aws-sdk/client-s3 @vercel/functions
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @aws-sdk/client-s3 @vercel/functions
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @aws-sdk/client-s3 @vercel/functions
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @aws-sdk/client-s3 @vercel/functions
    ```
  </Code>
</CodeBlock>

In the API route for the function, use the AWS SDK for JavaScript to list objects in an S3 bucket with the following code:

```ts filename="/api/aws-s3/route.ts"
import * as S3 from '@aws-sdk/client-s3';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

const AWS_REGION = process.env.AWS_REGION!;
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN!;
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME!;

// Initialize the S3 Client
const s3client = new S3.S3Client({
  region: AWS_REGION,
  // Use the Vercel AWS SDK credentials provider
  credentials: awsCredentialsProvider({
    roleArn: AWS_ROLE_ARN,
  }),
});

export async function GET() {
  const result = await s3client.send(
    new S3.ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
    }),
  );
  return result?.Contents?.map((object) => object.Key) ?? [];
}
```

Vercel sends the OIDC token to the SDK using the `awsCredentialsProvider` function from `@vercel/functions`.

### Query an AWS RDS instance

Install the following packages:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @aws-sdk/rds-signer @vercel/functions pg
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @aws-sdk/rds-signer @vercel/functions pg
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @aws-sdk/rds-signer @vercel/functions pg
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @aws-sdk/rds-signer @vercel/functions pg
    ```
  </Code>
</CodeBlock>

In the API route for the function, use the AWS SDK for JavaScript to perform a database `SELECT` query from an AWS RDS instance with the following code:

```ts filename="/api/aws-rds/route.ts"
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';
import { Signer } from '@aws-sdk/rds-signer';
import { Pool } from 'pg';

const RDS_PORT = parseInt(process.env.RDS_PORT!);
const RDS_HOSTNAME = process.env.RDS_HOSTNAME!;
const RDS_DATABASE = process.env.RDS_DATABASE!;
const RDS_USERNAME = process.env.RDS_USERNAME!;
const AWS_REGION = process.env.AWS_REGION!;
const AWS_ROLE_ARN = process.env.AWS_ROLE_ARN!;

// Initialize the RDS Signer
const signer = new Signer({
  // Use the Vercel AWS SDK credentials provider
  credentials: awsCredentialsProvider({
    roleArn: AWS_ROLE_ARN,
  }),
  region: AWS_REGION,
  port: RDS_PORT,
  hostname: RDS_HOSTNAME,
  username: RDS_USERNAME,
});

// Initialize the Postgres Pool
const pool = new Pool({
  password: signer.getAuthToken,
  user: RDS_USERNAME,
  host: RDS_HOSTNAME,
  database: RDS_DATABASE,
  port: RDS_PORT,
});

// Export the route handler
export async function GET() {
  try {
    const client = await pool.connect();
    const { rows } = await client.query('SELECT * FROM my_table');
    return Response.json(rows);
  } finally {
    client.release();
  }
}
```


---

[View full sitemap](/docs/sitemap)
