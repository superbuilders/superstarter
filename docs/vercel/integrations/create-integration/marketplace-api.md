---
title: Using the Integrations REST API
product: vercel
url: /docs/integrations/create-integration/marketplace-api
type: reference
prerequisites:
  - /docs/integrations/create-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/marketplace-api/reference/partner
  - /docs/integrations/create-integration/marketplace-api/reference/vercel
  - /docs/integrations/create-integration/marketplace-flows
  - /docs/integrations/create-integration/marketplace-api/reference/partner/upsert-installation
  - /docs/integrations/marketplace-flows
summary: Learn how to authenticate and use the Integrations REST API to build your integration server.
---

# Using the Integrations REST API

Learn how to authenticate and use the Integrations REST API to build your native integration with Vercel.

## How it works

When a  uses your integration, the following two
APIs are used for interaction and communication between the user,
Vercel and the provider integration:

- **Vercel calls the provider API**: You implement the [Vercel Marketplace Partner API](/docs/integrations/create-integration/marketplace-api/reference/partner) endpoints on your integration server. Vercel calls them to manage resources,
  handle installations, and process billing.
- **The provider calls the Vercel API**: Vercel provides [these endpoints](/docs/integrations/create-integration/marketplace-api/reference/vercel). You call them from your integration server to interact with Vercel's platform.

When building your integration, you'll implement the partner endpoints
and call the Vercel endpoints as needed.

See the [Native Integration Flows](/docs/integrations/create-integration/marketplace-flows) to understand how these endpoints work together.

## Authentication

The authentication method depends on whether Vercel is calling the integration provider's API or the provider is calling Vercel's API.

### Provider API authentication

There are two authentication methods available:

- **User authentication**: The user initiates the action. You receive a JWT token that identifies the user making the request.
- **System authentication**: Your integration performs the action automatically. You use account-level OpenID Connect (OIDC) credentials to authenticate.

System authentication uses OIDC tokens that represent your integration account, not a specific user. This lets you make API calls to Vercel without requiring user interaction.

#### When to use system authentication

- Automatic balance top-ups for prepayment plans
- Background synchronization tasks
- Automated resource management
- Any operation that should run without user action
- Installation cleanup operations when the Vercel account is deleted

#### When to use user authentication

- User-initiated actions
- Operations that require user consent
- Actions tied to a specific user's context

#### Security best practices

- Verify the OIDC token signature and claims: Always validate the token signature using Vercel's [OIDC configuration](https://marketplace.vercel.com/.well-known/openid-configuration). Check the `aud` claim matches your integration ID, and the `sub` claim identifies the authenticated user or account.
- For user authentication always validate the user's role.

Review the [user authentication](/docs/integrations/create-integration/marketplace-api/reference/partner#user-authentication) and [system authentication](/docs/integrations/create-integration/marketplace-api/reference/partner#system-authentication) specifications to help you implement each method.

### Vercel API authentication

When your integration calls Vercel's API, you authenticate using an access token. You receive this token during the installation process when you call the [Upsert Installation API](/docs/integrations/create-integration/marketplace-api/reference/partner/upsert-installation). The response includes a `credentials` object with an `access_token` that you use as a bearer token for subsequent API calls.

You can also use OAuth2 to obtain access tokens for user-specific operations.

### Authentication with SSO

#### Vercel initiated SSO

Vercel initiates SSO as part of the [**Open in Provider** flow](/docs/integrations/marketplace-flows#open-in-provider-button-flow).

1. Vercel sends the user to the provider [redirectLoginUrl](/docs/integrations/create-integration/submit-integration#redirect-login-url), with the OAuth authorization `code` and other parameters
2. The provider calls the [SSO Token Exchange](/docs/integrations/create-integration/marketplace-api/reference/vercel/exchange-sso-token), which validates the SSO request and returns OIDC and access tokens
3. The user gains authenticated access to the requested resource.

**Parameters:**

The SSO request to the [redirectLoginUrl](/docs/integrations/create-integration/submit-integration#redirect-login-url) will include the following authentication parameters:

- `mode`. The mode of the OAuth authorization is always set to `sso`.
- `code`: The OAuth authorization code.
- `state`: The state parameter that was passed in the OAuth authorization request.

The `code` and `state` parameters will be passed back to Vercel in the [SSO Token Exchange](/docs/integrations/create-integration/marketplace-api/reference/vercel/exchange-sso-token) request.

Additionally, the SSO request to the [redirectLoginUrl](/docs/integrations/create-integration/submit-integration#redirect-login-url) may include the following optional context parameters:

- `product_id`: The ID of the provider's product
- `resource_id`: The ID of the provider's resource
- `check_id`: The ID of the deployment check, when the resource is associated with a deployment check. Example: "chk\_abc123".
- `project_id`: The ID of the Vercel project, for instance, when the resource is connected to the Vercel project. Example: "prj\_ff7777b9".
- `experimentation_item_id`: See [Experimentation flow](/docs/integrations/create-integration/marketplace-flows#experimentation-flow).
- `invoice_id`: The ID of the provider's invoice
- `pr`: The URL of the pull request in the Vercel project, when known in the context. Example: `https://github.com/owner1/repo1/pull/123`.
- `path`: Indicates the area where the user should be redirected to after SSO. The possible values are: "billing", "usage", "onboarding", "secrets", and "support".
- `url`: The provider-specific URL to redirect the user to after SSO. Must be validated by the provider for validity. The data fields that are allowed to provide `sso:` URLs, such as `Notification.href`, will automatically propagate the provided URL in this parameter.

The provider should match the most appropriate part of their dashboard to the user's context.

**Using SSO with API responses:**

You can trigger SSO by using `sso:` URLs in your API responses. When users click these links, Vercel initiates the SSO flow before redirecting them to your platform. The `sso:` prefix works in any URL field that supports it, such as [installation notification](/docs/integrations/create-integration/marketplace-api#sso-enabled-notification-links) links or resource URLs.

**Format:**

```
sso:https://your-integration.com/resource-page
```

When a user clicks a link with an `sso:` URL:

1. Vercel initiates the SSO flow
2. Your provider validates the SSO request via the [SSO Token Exchange](/docs/integrations/create-integration/marketplace-api/reference/vercel/exchange-sso-token)
3. The user is redirected to the target URL with authenticated access

**Example with notifications:**

```ts filename="upsert-installation-with-sso.ts"
// When creating or updating an installation, include an sso: URL
const response = await fetch(
  `https://api.vercel.com/v1/installations/${installationId}`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${vercelToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notification: {
        title: 'Review your usage',
        message: 'Your monthly usage report is ready',
        href: 'sso:https://your-integration.com/dashboard/usage',
        type: 'info',
      },
    }),
  },
);
```

#### Provider initiated SSO

The integration provider can initiate the SSO process from their side. This helps to streamline the authentication process for users coming from the provider's platform and provides security when a user attempts to access a resource managed by a Vercel Marketplace integration.

To initiate SSO, an integration provider needs to construct a URL using the following format:

```
https://vercel.com/sso/integrations/{URLSlug}/{installationId}?{query}
```

- [`URLSlug`](/docs/integrations/create-integration/submit-integration#url-slug): The unique identifier for your integration in the Vercel Integrations Marketplace
- [`installationId`](/docs/integrations/marketplace-api#installations): The ID of the specific installation for the user
- `query`: Optional query parameters to include additional information

**Example:**

Let's say you have an AWS integration with the following details:

- `URLSlug`: `aws-marketplace-integration-demo`
- `installationId`: `icfg_PSFtkFqr5djKRtOkNtOHIfSd`
- Additional parameter: `resource_id=123456`

The constructed URL would look like this:

```
https://vercel.com/sso/integrations/aws-marketplace-integration-demo/icfg_PSFtkFqr5djKRtOkNtOHIfSd?resource_id=123456
```

**Flow:**

1. The provider constructs and redirects the user to the SSO URL
2. Vercel validates the SSO request and confirms user access
3. After successfully validating the request, Vercel redirects the user back to the provider using the same flow described in the [Vercel Initiated SSO](#vercel-initiated-sso)
4. The user gains authenticated access to the requested resource

## Working with member information

Get details about team members who have access to an installation. Use this endpoint to retrieve member information for access control, audit logs, or displaying member details in your integration.

To retrieve information about a specific team member associated with an installation, use the [`/v1/installations/{installationId}/member/{memberId}`](/docs/integrations/create-integration/marketplace-api/reference/vercel/get-member) endpoint.

### Member information request parameters

- `installationId` - The installation ID
- `memberId` - The member ID

### Member information request

```ts filename="get-member-info.ts"
async function getMemberInfo(
  installationId: string,
  memberId: string
): Promise<MemberInfo> {
  const response = await fetch(
    `https://api.vercel.com/v1/installations/${installationId}/member/${memberId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get member info: ${response.statusText}`);
  }

  return response.json();
}
```

### Member information response

```json filename="get-member-info-response.json"
{
  "id": "member_abc123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "ADMIN",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2025-01-15T10:00:00Z"
}
```

### Member roles

Members can have the following roles:

- `ADMIN` - Full access to the installation and its resources
- `USER` - Limited access, can use resources but can't modify settings

Check the member's role to determine what actions they can perform below.

## Working with installation notifications

Installation notifications appear in the Vercel dashboard to alert users about important information or actions needed for their installation. You can set notifications when creating or updating installations.

### Update installation notification

Update the notification field using the [`PATCH /v1/installations/{installationId}`](/docs/integrations/create-integration/marketplace-api/reference/vercel/update-installation) endpoint as shown below:

```ts filename="update-installation-notification.ts"
interface Notification {
  title: string;
  message: string;
  href?: string;
  type?: 'info' | 'warning' | 'error';
}

async function updateInstallationNotification(
  installationId: string,
  notification: Notification
) {
  const response = await fetch(
    `https://api.vercel.com/v1/installations/${installationId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notification }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update notification: ${response.statusText}`);
  }

  return response.json();
}

// Example usage with regular URL:
await updateInstallationNotification('icfg_abc123', {
  title: 'Action Required',
  message: 'Please complete your account setup',
  href: 'https://your-integration.com/setup',
  type: 'warning',
});

// Or with SSO-enabled URL for authenticated access:
// href: 'sso:https://your-integration.com/setup',
```

```json filename="update-installation-notification-response.json"
{
  "id": "icfg_abc123",
  "notification": {
    "title": "Action Required",
    "message": "Please complete your account setup",
    "href": "https://your-integration.com/setup",
    "type": "warning"
  }
}
```

### Notification types

Use different notification types to indicate severity:

- `info` - Informational message (default)
- `warning` - Warning that requires attention
- `error` - Error that needs immediate action

### SSO-enabled notification links

The notification `href` field supports special `sso:` URLs that trigger Single Sign-On before redirecting users to your destination. This ensures users are authenticated before accessing resources on your platform.

**Format:**

```
sso:https://your-integration.com/resource-page
```

When a user clicks a notification link with an `sso:` URL:

1. Vercel initiates the SSO flow (as described in [Vercel initiated SSO](/docs/integrations/create-integration/marketplace-api#vercel-initiated-sso))
2. Your provider validates the SSO request via the [SSO Token Exchange](/docs/integrations/create-integration/marketplace-api/reference/vercel/exchange-sso-token)
3. The user is redirected to the target URL with authenticated access

**Example:**

```ts filename="notification-with-sso.ts"
await updateInstallationNotification('icfg_abc123', {
  title: 'Review your usage',
  message: 'Your monthly usage report is ready',
  href: 'sso:https://your-integration.com/dashboard/usage',
  type: 'info',
});
```

Use `sso:` URLs in notification links when they point to resources that require authentication on your platform. For public pages or general information, use regular HTTPS URLs.

### Clear notifications

Remove a notification by setting it to `null`:

```ts filename="clear-installation-notification.ts"
async function clearInstallationNotification(installationId: string) {
  const response = await fetch(
    `https://api.vercel.com/v1/installations/${installationId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notification: null }),
    }
  );

  return response.json();
}
```

### Get installation with notification

You can find the value of the notification field by calling the [`/v1/installations/{installationId}`](/docs/integrations/create-integration/marketplace-api/reference/partner/get-installation) endpoint as shown below:

```ts filename="get-installation-with-notification.ts"
async function getInstallation(installationId: string) {
  const response = await fetch(
    `https://api.vercel.com/v1/installations/${installationId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  const installation = await response.json();

  if (installation.notification) {
    console.log(`Notification: ${installation.notification.title}`);
    console.log(`Message: ${installation.notification.message}`);
  }

  return installation;
}
```

## Secrets rotation

When your integration provisions resources with credentials, you should implement secrets rotation to allow users to update credentials securely. Learn how to [implement secrets rotation](/docs/integrations/create-integration/secrets-rotation) in your integration.

## Working with billing events through webhooks

You can receive billing events with [webhooks](/docs/webhooks) to stay informed about invoice status changes and take appropriate actions. For an overview of the billing process and how to submit invoices, see [Billing and Refunds](/docs/integrations/create-integration/billing).

You can receive the following events:

- [`marketplace.invoice.created`](/docs/webhooks/webhooks-api#marketplace.invoice.created): The invoice was created and sent to the customer
- [`marketplace.invoice.paid`](/docs/webhooks/webhooks-api#marketplace.invoice.paid): The invoice was paid
- [`marketplace.invoice.notpaid`](/docs/webhooks/webhooks-api#marketplace.invoice.notpaid): The invoice was not paid after a grace period
- [`marketplace.invoice.refunded`](/docs/webhooks/webhooks-api#marketplace.invoice.refunded): The invoice was refunded

### Webhook security

You should verify webhook signatures to ensure requests come from Vercel. Integration webhooks use your **Integration Secret** (also called Client Secret) from the [Integration Console](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fintegrations%2Fconsole\&title=Go+to+Integrations+Console) for signature verification. Follow the [Securing webhooks](/docs/webhooks/webhooks-api#securing-webhooks) section of the Webhooks API Reference to learn more.

### Billing webhook handlers

You can implement handlers for each billing event type to manage invoice lifecycle and resource access.

#### Handle invoice created

When an invoice is created, you can prepare your systems for billing or send notifications.

**Event:** `marketplace.invoice.created`

```ts filename="handle-invoice-created.ts"
async function handleInvoiceCreated(webhook: WebhookPayload) {
  const { invoice } = webhook.payload;

  // Log invoice creation
  console.log(`Invoice ${invoice.id} created for installation ${invoice.installationId}`);

  // Update your internal records
  await updateInvoiceRecord(invoice.id, {
    status: 'created',
    amount: invoice.amount,
    currency: invoice.currency,
    createdAt: invoice.createdAt,
  });

  // Optional: Send notification to customer
  await sendInvoiceNotification(invoice.customerId, invoice.id);
}
```

```ts filename="invoice-created-webhook-payload.json"
{
  "id": "evt_abc123",
  "type": "marketplace.invoice.created",
  "payload": {
    "invoice": {
      "id": "inv_xyz789",
      "installationId": "icfg_def456",
      "amount": 29.99,
      "currency": "USD",
      "createdAt": "2025-01-15T10:00:00Z"
    }
  }
}
```

### Handle invoice paid

When an invoice is paid, activate resources or update billing status.

**Event:** `marketplace.invoice.paid`

```ts filename="handle-invoice-paid.ts"
async function handleInvoicePaid(webhook: WebhookPayload) {
  const { invoice } = webhook.payload;

  console.log(`Invoice ${invoice.id} paid`);

  // Update invoice status
  await updateInvoiceRecord(invoice.id, {
    status: 'paid',
    paidAt: invoice.paidAt,
  });

  // Activate resources if they were suspended
  const resources = await getResourcesForInstallation(invoice.installationId);
  for (const resource of resources) {
    if (resource.status === 'suspended') {
      await activateResource(resource.id);
    }
  }

  // Update billing plan if needed
  await updateBillingPlan(invoice.installationId, invoice.billingPlanId);
}
```

```ts filename="invoice-paid-webhook-payload.json"
{
  "id": "evt_def456",
  "type": "marketplace.invoice.paid",
  "payload": {
    "invoice": {
      "id": "inv_xyz789",
      "installationId": "icfg_def456",
      "amount": 29.99,
      "currency": "USD",
      "paidAt": "2025-01-15T11:00:00Z"
    }
  }
}
```

### Handle invoice not paid

When an invoice isn't paid after the grace period, suspend resources or take other actions.

**Event:** `marketplace.invoice.notpaid`

> **💡 Note:** The current webhook payload doesn't include retry attempt information. You'll need to track retry attempts in your system or query the invoice status directly

```ts filename="handle-invoice-not-paid.ts"
async function handleInvoiceNotPaid(webhook: WebhookPayload) {
  const { invoice } = webhook.payload;

  console.log(`Invoice ${invoice.id} not paid`);

  // Update invoice status
  await updateInvoiceRecord(invoice.id, {
    status: 'not_paid',
    notPaidAt: invoice.notPaidAt,
  });

  // Check if this is the final attempt (you may need to query invoice status)
  const invoiceDetails = await getInvoiceDetails(invoice.id);
  const isFinalAttempt = invoiceDetails.retryAttempts >= invoiceDetails.maxRetries;

  if (isFinalAttempt) {
    // Suspend resources after final payment failure
    const resources = await getResourcesForInstallation(invoice.installationId);
    for (const resource of resources) {
      await suspendResource(resource.id, {
        reason: 'payment_failed',
        invoiceId: invoice.id,
      });
    }

    // Notify customer
    await sendPaymentFailureNotification(invoice.customerId, invoice.id);
  } else {
    // Schedule retry or send reminder
    await schedulePaymentRetry(invoice.id, invoiceDetails.nextRetryAt);
  }
}
```

```ts filename="invoice-not-paid-webhook-payload.json"
{
  "id": "evt_ghi789",
  "type": "marketplace.invoice.notpaid",
  "payload": {
    "invoice": {
      "id": "inv_xyz789",
      "installationId": "icfg_def456",
      "amount": 29.99,
      "currency": "USD",
      "notPaidAt": "2025-01-20T10:00:00Z"
    }
  }
}
```

### Handle invoice refunded

When an invoice is refunded, update records and handle resource access accordingly.

**Event:** `marketplace.invoice.refunded`

```ts filename="handle-invoice-refunded.ts"
async function handleInvoiceRefunded(webhook: WebhookPayload) {
  const { invoice } = webhook.payload;

  console.log(`Invoice ${invoice.id} refunded`);

  // Update invoice status
  await updateInvoiceRecord(invoice.id, {
    status: 'refunded',
    refundedAt: invoice.refundedAt,
    refundAmount: invoice.refundAmount,
  });

  // Adjust billing records
  await adjustBillingRecords(invoice.installationId, {
    type: 'refund',
    amount: invoice.refundAmount,
    invoiceId: invoice.id,
  });

  // Optional: Notify customer
  await sendRefundNotification(invoice.customerId, invoice.id);
}
```

```ts filename="invoice-refunded-webhook-payload.json"
{
  "id": "evt_jkl012",
  "type": "marketplace.invoice.refunded",
  "payload": {
    "invoice": {
      "id": "inv_xyz789",
      "installationId": "icfg_def456",
      "amount": 29.99,
      "currency": "USD",
      "refundAmount": 29.99,
      "refundedAt": "2025-01-21T10:00:00Z"
    }
  }
}
```


---

[View full sitemap](/docs/sitemap)
