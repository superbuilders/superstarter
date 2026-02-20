---
title: Claiming Domain Ownership
product: vercel
url: /docs/domains/working-with-domains/claim-domain-ownership
type: how-to
prerequisites:
  - /docs/domains/working-with-domains
  - /docs/domains
related:
  - /docs/domains/working-with-domains/transfer-your-domain
summary: Learn how to claim ownership of a domain that is registered with another Vercel account by verifying DNS ownership.
---

# Claiming Domain Ownership

If a domain is registered with another Vercel account and you need to take ownership of it, Vercel will automatically prompt you to verify DNS ownership when you try to add the domain. This allows you to claim the domain and transfer it to your team.

## When claiming is required

When you add an existing domain via the **Add Existing** button on your team's Domains page, Vercel automatically checks if you already registered the domain with another Vercel account. If so, you'll be prompted to verify ownership before you can use it.

Use this flow when:

- You registered a domain with another Vercel account that you no longer have access to
- You need to transfer domain ownership between Vercel teams without access to the source team
- You've lost access to the original Vercel account but control the domain's DNS

> **💡 Note:** If you have access to both Vercel accounts, consider using the [Move
> feature](/docs/domains/working-with-domains/transfer-your-domain#transfer-a-domain-to-another-vercel-user-or-team)
> instead, which is simpler and doesn't require DNS verification.

## Getting started

### Prerequisites

- You must have permission to add domains on the target team
- You must have access to modify DNS records for the domain

### Claim a domain

- ### Navigate to your team's Domains page
  Go to the [**Domains** tab of your team's dashboard](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fdomains\&title=Go+to+team%27s+domains+page) and click **Add Existing**.

- ### Enter the domain name
  In the modal, enter the domain you want to add (for example, `example.com`) and click **Continue**.

  Vercel will check the domain's ownership status. If you registered the domain with another Vercel account, you'll be shown the claim verification step.

- ### Add the TXT record to your DNS
  You'll be shown a TXT record that you need to add to your domain's DNS configuration. The record will look similar to:

  | Type | Name                  | Value                  |
  | ---- | --------------------- | ---------------------- |
  | TXT  | `_vercel.example.com` | `vc-domain-verify=...` |

  Add this record with your DNS provider.
  > **💡 Note:** DNS changes can take a few minutes to propagate. If verification fails
  > initially, wait a few minutes and try again.

- ### Verify and claim
  Once you've added the TXT record, click **Verify & Claim** to complete the ownership transfer. Vercel will check for the TXT record and, if found, transfer the domain to your team.

  After successful verification, you'll land on the domain's configuration page where you can manage DNS records and assign it to projects.

## Troubleshooting

### TXT record not found

If you receive a "TXT record not found" error, ensure that:

1. You've added the TXT record to the correct domain (check the verification domain shown in the modal)
2. The TXT record value matches exactly what was provided
3. Enough time has passed for DNS propagation (typically a few minutes, but can take up to 48 hours in some cases)

You can verify your TXT record has propagated using a DNS lookup tool or by running the following in your terminal:

```bash filename="terminal"
dig TXT _vercel.example.com
```


---

[View full sitemap](/docs/sitemap)
