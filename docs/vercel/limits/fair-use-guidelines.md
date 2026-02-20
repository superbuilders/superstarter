---
title: Fair use Guidelines
product: vercel
url: /docs/limits/fair-use-guidelines
type: reference
prerequisites:
  - /docs/limits
related:
  - /docs/image-optimization/limits-and-pricing
  - /docs/edge-config/edge-config-limits
  - /docs/builds/managing-builds
  - /docs/pricing/regional-pricing
  - /docs/image-optimization/legacy-pricing
summary: "Learn about all subscription plans included usage that is subject to Vercel's fair use guidelines."
---

# Fair use Guidelines

All subscription plans include usage that is subject to these fair use guidelines. Below is a rule-of-thumb for determining which projects fall within our definition of "fair use" and which do not.

### Examples of fair use

### Never fair use

## Usage guidelines

As a guideline for our community, we expect most users to fall within the below ranges for each plan. We will notify you if your usage is an outlier. Our goal is to be as permissive as possible while not allowing an unreasonable burden on our infrastructure. Where possible, we'll reach out to you ahead of any action we take to address unreasonable usage and work with you to correct it.

### Typical monthly usage guidelines

|                                                                                            | Hobby                                               | Pro                                                 |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
| Fast Data Transfer                                                                         | Up to 100 GB                                        | Up to 1 TB                                          |
| Fast Origin Transfer                                                                       | Up to 10 GB                                         | Up to 100 GB                                        |
| Function Execution                                                                         | Up to 100 GB-Hrs                                    | Up to 1000 GB-Hrs                                   |
| Build Execution                                                                            | Up to 100 Hrs                                       | Up to 400 Hrs                                       |
| [Image transformations](/docs/image-optimization/limits-and-pricing#image-transformations) | Up to 5K transformations/month                      | Up to 10K transformations/month                     |
| [Image cache reads](/docs/image-optimization/limits-and-pricing#image-cache-reads)         | Up to 300K reads/month                              | Up to 600K reads/month                              |
| [Image cache writes](/docs/image-optimization/limits-and-pricing#image-cache-writes)       | Up to 100K writes/month                             | Up to 200K writes/month                             |
| Storage                                                                                    | [Edge Config](/docs/edge-config/edge-config-limits) | [Edge Config](/docs/edge-config/edge-config-limits) |

For Teams on the Pro plan, you can pay for [additional usage](/docs/limits/fair-use-guidelines#additional-resources) as you go.

### Other guidelines

**Middleware with the `edge` runtime configured CPU Limits** - Middleware with the `edge` runtime configured can use no more than **50ms of CPU time on average**. This limitation refers to the actual net CPU time, not the execution time. For example, when you are blocked from talking to the network, the time spent waiting for a response does not count toward CPU time limitations.

For [on-demand concurrent builds](/docs/builds/managing-builds#on-demand-concurrent-builds), there is a fair usage limit of 500 concurrent builds per team. If you exceed this limit, any new on-demand build request will be queued until your total concurrent builds goes below 500.

### Additional resources

For members of our **Pro** plan, we offer a pay-as-you-go model for additional usage, giving you greater flexibility and control over your usage. The typical monthly usage guidelines above are still applicable, while extra usage will be automatically charged at the following rates:

|                                                                                           | Pro                                                 |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Fast Data Transfer                                                                        | [Regionally priced](/docs/pricing/regional-pricing) |
| Fast Origin Transfer                                                                      | [Regionally priced](/docs/pricing/regional-pricing) |
| Function Execution                                                                        | $0.60 per 1 GB-Hrs increment                        |
| [Image Optimization Source Images](/docs/image-optimization/legacy-pricing#source-images) | $5 per 1000 increment                               |

### Commercial usage

**Hobby teams** are restricted to non-commercial personal use only. All commercial usage of the platform requires either a Pro or Enterprise plan.

Commercial usage is defined as any [Deployment](/docs/deployments) that is used for the purpose of financial gain of **anyone** involved in **any part of the production** of the project, including a paid employee or consultant writing the code. Examples of this include, but are not limited to, the following:

- Any method of requesting or processing payment from visitors of the site
- Advertising the sale of a product or service
- Receiving payment to create, update, or host the site
- Affiliate linking is the primary purpose of the site
- The inclusion of advertisements, including but not limited to online advertising platforms like Google AdSense

> **💡 Note:** Asking for Donations  fall under commercial usage.

If you are unsure whether or not your site would be defined as commercial usage, please [contact the Vercel Support team](/help#issues).

### General Limits

[**Take a look at our Limits documentation**](/docs/limits#general-limits) for the limits we apply to all accounts.

### Learn More

Circumventing or otherwise misusing Vercel's limits or usage guidelines is a violation of our fair use guidelines.

For further information regarding these guidelines and acceptable use of our services, refer to our [Terms of Service](/legal/terms#fair-use) or your Enterprise Service Agreement.


---

[View full sitemap](/docs/sitemap)
