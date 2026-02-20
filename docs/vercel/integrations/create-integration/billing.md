---
title: Manage Billing and Refunds for Integrations
product: vercel
url: /docs/integrations/create-integration/billing
type: reference
prerequisites:
  - /docs/integrations/create-integration
  - /docs/integrations
related:
  - /docs/integrations/create-integration/marketplace-api/reference/vercel
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/submit-billing-data
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/submit-invoice
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/get-invoice
  - /docs/integrations/create-integration/marketplace-api/reference/vercel/update-invoice
summary: Learn how billing works for native integrations, including invoice lifecycle, pricing models, and refunds.
---

# Manage Billing and Refunds for Integrations

When a Vercel user installs your native integration, you manage billing through the [Vercel API billing endpoints](/docs/integrations/create-integration/marketplace-api/reference/vercel). Each integration operates its own independent billing lifecycle, allowing Vercel users to configure different payment methods for each integration.

## Billing API endpoints

The following endpoints handle billing operations for your integration:

| Endpoint                                                                                                                        | Purpose                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [Submit Billing Data](/docs/integrations/create-integration/marketplace-api/reference/vercel/submit-billing-data)               | Send interim usage data for display in the Vercel dashboard. Does not charge customers.  |
| [Submit Invoice](/docs/integrations/create-integration/marketplace-api/reference/vercel/submit-invoice)                         | Create and send an invoice to charge customers when your billing plan requires charging. |
| [Get Invoice](/docs/integrations/create-integration/marketplace-api/reference/vercel/get-invoice)                               | Retrieve invoice details and current status.                                             |
| [Invoice Actions (Update Invoice)](/docs/integrations/create-integration/marketplace-api/reference/vercel/update-invoice)       | Request refunds for previously submitted invoices.                                       |
| [Submit Prepayment Balances](/docs/integrations/create-integration/marketplace-api/reference/vercel/submit-prepayment-balances) | Send prepaid credit balances for prepayment billing plans.                               |

## Billing models

You can choose between two billing models:

- **Installation-level billing**: Charges apply to the entire installation. A single billing plan covers all resources provisioned under that installation.
- **Resource-level billing**: Charges are scoped to individual products or resources. Each resource can have its own billing plan.

You determine which model to use. You can only submit one invoice per resource per billing period, but a single invoice can include multiple line items for the same resource.

## Billing periods and cycles

You control the billing cycle through the `period` field in your API calls. There's no required day of the month for billing cycles to align across integrations. Each integration can bill on its own schedule.

Vercel users can configure a different payment method for each integration installation, independent of their Vercel plan payment method and other integrations.

## Invoice lifecycle

Invoices move through several states as they're processed:

### Invoice states

| State         | Description                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------- |
| **pending**   | Default state after you submit an invoice. Vercel queues it for immediate processing.                             |
| **scheduled** | Queued for future processing based on the billing plan's timing (at signup, period start, or period end).         |
| **invoiced**  | Vercel processed and sent the invoice to the Vercel user.                                                         |
| **paid**      | Vercel received payment successfully.                                                                             |
| **notpaid**   | Payment failed on first attempt. Vercel continues retrying up to 9 times while the invoice remains in this state. |
| **refunded**  | Vercel fully or partially refunded the invoice.                                                                   |

> **💡 Note:** When an invoice enters `notpaid` status, Vercel does not automatically
> restrict access to deployments, teams, or products. The
> `marketplace.invoice.notpaid` webhook fires on each failed payment attempt,
> not just the final one. Since Vercel retries payment up to 9 times, you may
> receive multiple webhooks before payment eventually succeeds. Wait at least 15
> days before taking any destructive actions like deleting databases. In the
> meantime, you may choose to degrade service or pause fulfillment (for example,
> stop issuing tokens) until payment succeeds.

## Line items and pricing structures

You have flexibility in how you structure charges. A single invoice can include multiple line items covering:

- **Flat fees**: Fixed monthly or periodic charges
- **Usage-based charges**: Costs calculated from actual resource consumption
- **Tiered pricing**: Different rate tiers (for example, tier 1 usage at one rate, tier 2 at another)

Each line item can specify a unit, quantity, rate, and detailed description. This gives Vercel users a clear breakdown of charges.

We recommend consolidating all resource billing under a single invoice and keeping resources on the same billing cycle. This reduces the number of invoices Vercel users receive each month, but it's not a requirement.

## Technical requirements

When working with billing data:

- **Decimal precision**: All monetary values use 2 decimal places
- **Minimum threshold**: Vercel won't send invoices totaling less than $0.50. You should still submit billing data for transparency so Vercel users can confirm no additional costs accrued

## Submitting invoices

Billing customers involves two separate steps:

1. **Send interim billing data** throughout the billing period to show expected charges in the Vercel dashboard. This is for display only and does not charge customers.
2. **Submit an invoice** at the end of the billing period to create and send the actual invoice, which triggers payment collection.

To bill customers, call the [Vercel billing API endpoints](/docs/integrations/create-integration/marketplace-api/reference/vercel). All requests require the `access_token` from the Upsert Installation request body for authorization.

### Send interim billing data

Call the [Submit Billing Data](/docs/integrations/create-integration/marketplace-api/reference/vercel/submit-billing-data) endpoint (`POST /v1/installations/{integrationConfigurationId}/billing`) at least once a day, ideally once per hour.

This data is for display purposes only, helping Vercel users understand their expected charges throughout the billing period. Vercel does not generate invoices or process payments from this data. Actual billing happens only when you [submit an invoice](#submit-an-invoice).

> **💡 Note:** Calling Submit Billing Data does not create an invoice or charge the customer.
> It only updates the usage and billing preview shown in the Vercel dashboard.

The following example shows a request with billing items and usage metrics:

```bash
curl -X POST "https://api.vercel.com/v1/installations/{integrationConfigurationId}/billing" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-15T12:00:00Z",
    "eod": "2025-01-15T00:00:00Z",
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-02-01T00:00:00Z"
    },
    "billing": {
      "items": [
        {
          "billingPlanId": "plan_pro",
          "resourceId": "db_abc123",
          "name": "Pro Plan",
          "price": "29.00",
          "quantity": 1,
          "units": "month",
          "total": "29.00"
        }
      ]
    },
    "usage": [
      {
        "resourceId": "db_abc123",
        "name": "Storage",
        "type": "total",
        "units": "GB",
        "dayValue": 5.2,
        "periodValue": 5.2
      }
    ]
  }'
```

> **💡 Note:** * **period.start / period.end**: The full billing period (for example, `2025-01-01` to `2025-02-01` for a monthly cycle)
> * **eod**: The end-of-day timestamp for this data snapshot, representing a single day within the billing period
> * **usage values**: Submit running totals for the entire period, not incremental usage since your last report. Vercel uses the latest values you submit.

### Submit an invoice

When your billing plan requires charging, call the [Submit Invoice endpoint](/docs/integrations/create-integration/marketplace-api/reference/vercel/submit-invoice) (`POST /v1/installations/{integrationConfigurationId}/billing/invoices`) to charge the customer. This endpoint both creates the invoice in Vercel's billing system and sends it to the customer for payment.

The following example shows a request with multiple line items:

```bash
curl -X POST "https://api.vercel.com/v1/installations/{integrationConfigurationId}/billing/invoices" \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "inv_2025_01_abc123",
    "invoiceDate": "2025-02-01T00:00:00Z",
    "period": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-02-01T00:00:00Z"
    },
    "items": [
      {
        "billingPlanId": "plan_pro",
        "resourceId": "db_abc123",
        "name": "Pro Plan - January 2025",
        "price": "29.00",
        "quantity": 1,
        "units": "month",
        "total": "29.00"
      },
      {
        "billingPlanId": "plan_pro",
        "resourceId": "db_abc123",
        "name": "Additional Storage",
        "details": "5.2 GB over included 1 GB",
        "price": "0.50",
        "quantity": 4.2,
        "units": "GB",
        "total": "2.10"
      }
    ]
  }'
```

We recommend including an `externalId` in your invoice requests. This lets you tie invoices to your internal billing records for easier reconciliation.

The response includes an `invoiceId` you can use to track status or request refunds.

### Track invoice status

To check invoice status, call the [Get Invoice endpoint](/docs/integrations/create-integration/marketplace-api/reference/vercel/get-invoice) (`GET /v1/installations/{integrationConfigurationId}/billing/invoices/{invoiceId}`). You can also subscribe to [billing event webhooks](/docs/integrations/create-integration/marketplace-api#working-with-billing-events-through-webhooks) to receive real-time updates when invoice states change.

> **💡 Note:** You can't retrieve invoices for installations that have been deleted. Once an
> installation is finalized, the `access_token` for that installation becomes
> invalid, and API calls to retrieve invoice data will fail. To maintain invoice
> records, store invoice data in your own system when you receive billing
> webhooks, or query invoice status before the installation is deleted.

## Testing with test mode

You can use test mode to validate your billing integration before going live. Test mode uses the `test` object in the Submit Invoice API with a `validate` field:

- `validate: true`: Runs full validation including date checks, item validation, discount validation, and duplicate detection
- `validate: false`: Skips these validations

Outside of test mode, Vercel always runs validation and you cannot override it.

> **💡 Note:** Test-mode invoices don't appear in the Integration Console or Dashboard. This
> is because test invoices bypass the backend billing processes where invoices
> are normally retrieved for display.

To test with live payment methods during the pre-launch phase:

1. Remove the `test` object from your Submit Invoice calls
2. Submit the invoice
3. Wait for the `marketplace.invoice.created` and `marketplace.invoice.paid` webhooks
4. Issue a refund using the Invoice Actions API

## Refunds and credit notes

When you request a refund, Vercel handles it as follows:

1. If Vercel hasn't charged the invoice yet, it cancels the invoice
2. If Vercel already charged the invoice, it attempts to refund the original payment method
3. If the payment method isn't working, Vercel creates a support ticket
4. If anything goes wrong with the refund attempt, Vercel creates a support ticket

For invoices in `notpaid` status, a refund request will succeed and move the status to `refund_requested`, then to `refunded` once the funds are returned. Only invoices already in `refund_requested` status are blocked from additional refund requests.

### Refunds after installation deletion

With installation-level billing, the installation goes through finalization after deletion. This gives you time to calculate any remaining charges and submit final invoices. Finalization follows these rules:

1. **Open invoices exist**: Vercel blocks finalization until invoices are settled. You can refund these invoices during this time.
2. **Finalization window**: By default, you have 24 hours after deletion to submit any final invoices. If you submit invoices during this window, the installation goes back to step 1. To skip this window, return `{finalized: true}` in your [Delete Installation endpoint response](/docs/integrations/create-integration/marketplace-api/reference/partner/delete-installation).
3. **Installation finalized**: Refunds must be processed manually through Vercel customer support.

## Tax and VAT

Vercel handles all taxation since Vercel issues the invoices. You only submit raw service charges to the billing APIs. You don't need to calculate or add tax to your charges.

## Invoice visibility and access

Only Vercel users with **Owner** or **Billing** roles can view invoices for your integration. They can view their invoices by:

1. Going to the **Integrations** tab in their Vercel [dashboard](/dashboard)
2. Selecting **Manage** next to your integration
3. Navigating to the **Invoices** section


---

[View full sitemap](/docs/sitemap)
