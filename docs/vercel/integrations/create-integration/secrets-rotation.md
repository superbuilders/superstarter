---
title: Implementing secrets rotation
product: vercel
url: /docs/integrations/create-integration/secrets-rotation
type: how-to
prerequisites:
  - /docs/integrations/create-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/put-installations-installationid-resources-resourceid-secrets
summary: Learn how to implement secrets rotation in your integration to allow users to rotate credentials securely.
---

# Implementing secrets rotation

When your integration provisions resources with credentials (like API keys, database passwords, or access tokens), you must implement secrets rotation to allow Vercel users to rotate these credentials securely without reprovisioning the resource.

> **⚠️ Warning:** This functionality must be turned on by Vercel for your integration. Contact your partner support team in Slack to have it enabled on your test integration(s) to begin development and then on your production integration once you're ready to go live.

## How it works

Vercel calls your partner API to trigger a rotation. This happens when a user or admin requests secret rotation for a resource and may also be called programmatically by Vercel. Your integration then rotates the credentials either synchronously (immediately return new secrets) or asynchronously (rotate later and notify Vercel when complete).

1. The customer clicks "rotate secret" in the Vercel dashboard for a resource you manage
2. Vercel makes a `POST` request to your `/v1/installations/{installationId}/resources/{resourceId}/secrets/rotate` endpoint
3. Your backend either generates new secrets for the resource and returns them in the response or returns `sync: false` and performs the rotation asynchronously, calling the `https://api.vercel.com/v1/installations/{installationId}/resources/{resourceId}/secrets` endpoint on Vercel to complete the rotation
4. Once Vercel has the new secrets for the resource, the customer's linked projects will be redeployed to pick up the new secrets.
5. After the period of time specified in `delayOldSecretsExpirationHours`, the old secrets should stop working and be deleted by your code

> **⚠️ Warning:** It's critical that you keep the old secrets active for the amount of time specified in the request to your rotate secrets endpoint. Failing to do so will prevent customer's applications from being able to connect to the resource until their projects are redeployed. This may take a long time for customers that have many linked projects.

## Endpoint specification

Vercel calls this endpoint on your partner API to request secret rotation:

```http
POST /v1/installations/{installationId}/resources/{resourceId}/secrets/rotate
Authorization: Bearer <oidc-token>
```

**Authentication:**

Vercel includes an OIDC token in the `Authorization` header using either user or system authentication. You must verify this token before processing the rotation request.

When using user authentication, the token contains claims about the user who initiated the rotation, including their role (which may be `ADMIN` or a regular user). When using system authentication, the token represents Vercel's system making the request on behalf of an automated process.

**Path parameters:**

- `installationId`: The Vercel installation ID (e.g., `icfg_9bceb8ccT32d3U417ezb5c8p`)
- `resourceId`: Your external resource ID that you provided when provisioning the resource

**Request body:**

```json filename="Request body schema"
{
  "reason": "Security audit requirement",
  "delayOldSecretsExpirationHours": 3
}
```

- `reason` (optional): A string explaining why the rotation was requested
- `delayOldSecretsExpirationHours` (optional): Number of hours (0-720, max 30 days) before old secrets expire. Can be a decimal amount (ex: `2.5`).

Once you receive this request, you should rotate the secrets for this resource and keep the old ones live for the specified amount of time, to allow for linked projects to be redeployed to get the new values.

> **💡 Note:** Discuss with Vercel partner support what values should be sent to your backend for `delayOldSecretsExpirationHours`.

## Response options

You can respond in two ways depending on your implementation:

### Synchronous rotation (HTTP 200)

Return the rotated secrets immediately:

```json filename="Synchronous response"
{
  "sync": true,
  "secrets": [
    {
      "name": "DATABASE_URL",
      "value": "postgresql://user:newpass@host:5432/db"
    },
    {
      "name": "API_KEY",
      "value": "rotated-key-value"
    }
  ],
  "partial": false
}
```

- `sync: true`: Indicates you've completed rotation immediately
- `secrets`: Array of rotated secrets with `name` and `value`
- `partial` (optional): Set to `true` if only a subset of secrets are included in the response (the default is `false` indicating your response contains the full set of environment variables for the resource)

> **💡 Note:** When you return secrets synchronously, Vercel automatically updates the environment variables and tracks the rotation as complete.

### Asynchronous rotation (HTTP 202)

Indicate that rotation will happen later:

```json filename="Asynchronous response"
{
  "sync": false
}
```

When you return `sync: false`, you must call Vercel's API later to complete the rotation using the [Update Resource Secrets endpoint](/docs/integrations/create-integration/marketplace-api/reference/vercel/put-installations-installationid-resources-resourceid-secrets):

```http
PUT https://api.vercel.com/v1/installations/{installationId}/resources/{resourceId}/secrets
```

```json filename="Complete rotation request"
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "value": "postgresql://user:newpass@host:5432/db"
    }
  ],
  "partial": false
}
```

Use the access token you received during installation to authenticate this request.

## Implementation example

Here's a complete example of implementing the rotation endpoint:

```ts filename="handle-secrets-rotation.ts"
import { verifyOIDCToken } from './auth';

async function handleSecretsRotation(req, res) {
  const { installationId, resourceId } = req.params;
  const { reason, delayOldSecretsExpirationHours = 0 } = req.body;

  // Verify authentication - Vercel sends an OIDC token (user or system authentication)
  const token = req.headers.authorization?.replace('Bearer ', '');
  const claims = await verifyOIDCToken(token);

  if (!claims || (claims.user_role && claims.user_role !== 'ADMIN')) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  // Get resource from your database
  const resource = await getResource(resourceId);
  if (!resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Rotate credentials in your system
  const newCredentials = await rotateResourceCredentials(resourceId);

  // Schedule old credentials expiration
  if (delayOldSecretsExpirationHours > 0) {
    await scheduleCredentialExpiration(
      resource.oldCredentials,
      delayOldSecretsExpirationHours
    );
  } else {
    // Expire old credentials immediately
    await expireCredentials(resource.oldCredentials);
  }

  // Return new secrets immediately
  return res.status(200).json({
    sync: true,
    secrets: [
      {
        name: 'DATABASE_URL',
        value: newCredentials.connectionString,
      },
      {
        name: 'DATABASE_PASSWORD',
        value: newCredentials.password,
      },
    ],
    partial: false
  });
}
```

## Error handling

Return appropriate HTTP status codes for error cases:

```ts filename="error-responses.ts"
// Resource not found
res.status(404).json({ error: 'Resource not found' });

// Invalid request body
res.status(400).json({ error: 'Invalid delayOldSecretsExpirationHours' });

// Insufficient permissions
res.status(403).json({ error: 'User lacks permission to rotate secrets' });

// Rotation temporarily unavailable
res.status(503).json({ error: 'Rotation service unavailable, try again later' });

// Internal error during rotation
res.status(500).json({ error: 'Failed to rotate credentials' });
```

## Testing rotation

When testing your implementation:

1. Provision a test resource through your integration
2. Navigate to the resource in the Vercel dashboard
3. Click "Rotate Secrets" or similar action
4. Verify your endpoint receives the request with correct parameters
5. For synchronous rotation, confirm Vercel receives and updates the secrets
6. For asynchronous rotation, verify your background job completes and calls Vercel's API
7. Confirm the resource now displays the correct environment variables on the resource page in the Vercel dashboard
8. Confirm old credentials expire at the correct time

## Best practices

- **Always verify authentication**: Validate the OIDC token from the `Authorization` header before processing any rotation request. Vercel uses either user or system authentication for these calls.
- **Validate all inputs**: Check that `delayOldSecretsExpirationHours` doesn't exceed your `maxDelayHours`
- **Audit all rotations**: Log who or what requested rotation, when, and why (the OIDC token claims contain either user information or system authentication details)
- **Handle failures gracefully**: If rotation fails, maintain old credentials and return an error
- **Test credential expiration**: Ensure old credentials are properly revoked after the delay period
- **Support partial rotation**: If you can't rotate all secrets, return `partial: true` with the secrets you did rotate
- **Implement idempotency**: Handle duplicate rotation requests gracefully
- **Monitor rotation requests**: Track rotation frequency to detect unusual patterns


---

[View full sitemap](/docs/sitemap)
