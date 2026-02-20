---
title: WAF Rate Limiting
product: vercel
url: /docs/vercel-firewall/vercel-waf/rate-limiting
type: how-to
prerequisites:
  - /docs/vercel-firewall/vercel-waf
  - /docs/vercel-firewall
related:
  []
summary: Learn how to configure custom rate limiting rules with the Vercel Web Application Firewall (WAF).
---

# WAF Rate Limiting

> **🔒 Permissions Required**: WAF Rate Limiting

Rate limiting allows you to control the number of times that a request from the same source can hit your application within a specific timeframe. This could happen due to multiple reasons, such as malicious activity or a software bug.

The use of rate limiting rules helps ensure that only intended traffic reaches your resources such as API endpoints or external services, giving you better control over usage costs.

## Get started

1. From your [dashboard](https://vercel.com/dashboard/), select the project that you'd like to configure rate limiting for. Then select the **Firewall** tab
2. Select **Configure** on the top right of the Firewall overview page. Then, select **+ New Rule**
3. Complete the fields for the rule as follows
   1. Type a name to help you identify the purpose of this rule for future reference
   2. In the **Configure** section, add as many **If** conditions as needed:
      > **💡 Note:** All conditions must be true for the action to happen.
      ![Image](`/docs-assets/static/docs/security/vercel-waf-custom-rule-configure-light.png`)
   3. For the **Then** action, select **Rate Limit**
      - If this is the first time you are creating a rate limit rule, you will need to review the **Rate Limiting Pricing** dialog and select **Continue**
   4. Select [Fixed Window (all plans)](# "About the Fixed Window algorithm") or [Token Bucket (Enterprise)](# "About the Token Bucket algorithm") for the limiting strategy

      ![Image](`/docs-assets/static/docs/security/vercel-waf-rate-limit-light.png`)
   5. Update the **Time Window** field as needed (defaults to 60s) and the **Request Limit** field as needed (defaults to 100 requests)
      - The **Request Limit** defines the maximum number of requests allowed in the selected time window from a common source
   6. Select the key(s) from the request's source that you want to match against
   7. For the **Then** action, you can leave the **Default (429)** action or choose between **Log**, **Deny** and **Challenge**
      > **💡 Note:** The **Log** action will not perform any blocks. You can use it to first
      > monitor the effect before applying a rate limit or block action.
4. Select **Save Rule**
5. Apply the changes:
   - When you make any change, you will see a **Review Changes** button appear or update on the top right with the number of changes requested
   - Select **Review Changes** and review the changes to be applied
   - Select **Publish** to apply the changes to your production deployment
6. Go to the Firewall overview page, select your Custom Rule from the traffic grouping drop-down and select the paramater(s) related to the condition(s) of your Custom Rule to observe the traffic and check whether it's working as expected:

   ![Image](`/docs-assets/static/docs/security/waf-overview-custom-rule-light.png`)

## Limits

| Resource               | Hobby                                 | Pro                                   | Enterprise                                           |
| ---------------------- | ------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Included counting keys | IP, JA4 Digest                        | IP, JA4 Digest                        | IP, JA4 Digest, User Agent and arbitrary Header keys |
| Counting algorithm     | Fixed window                          | Fixed window                          | Fixed window, Token bucket                           |
| Counting window        | Minimum: **10s**, Maximum: **10mins** | Minimum: **10s**, Maximum: **10mins** | Minimum: **10s**, Maximum: **1hr**                   |
| Number of rules        | 1 per project                         | 40 per project                        | 1000 per project                                     |
| Included requests      | 1,000,000 Allowed requests            | 1,000,000 Allowed requests            |                                                      |

## Pricing

The pricing is based on the region(s) from which the requests come from.


---

[View full sitemap](/docs/sitemap)
