---
title: Limits and Pricing
product: vercel
url: /docs/flags/vercel-flags/limits-and-pricing
type: reference
prerequisites:
  - /docs/flags/vercel-flags
  - /docs/flags
related:
  []
summary: Learn about limits and pricing on Vercel.
---

# Limits and Pricing for Vercel Flags

## Pricing

### Flag requests

Vercel Flags is priced at **$30 per 1 million flag requests** ($0.00003 per event).

A **flag request** is any request to your application that reads the underlying flags configuration. A single request evaluating multiple feature flags of the same source project still counts as one flag request.

For example, if a page request evaluates 10 different feature flags, that counts as 1 flag request.

If a project reads feature flags from multiple sources, each source is counted separately.

|                                 | Hobby  | Pro                                   | Enterprise                            |
| ------------------------------- | ------ | ------------------------------------- | ------------------------------------- |
| Maximum flag requests per month | 10,000 | None                                  | None                                  |
| Additional flag requests        | -      | $30 per 1 million requests (prorated) | $30 per 1 million requests (prorated) |

On the Hobby plan, flag request collection pauses once you reach 10,000 requests in a billing cycle.

## Limits

### Flag and segment count limits

Both active and archived flags count toward the total flag limit. Delete flags to free up space.

| Plan       | Max flags | Max segments |
| ---------- | --------- | ------------ |
| Hobby      | 100       | 100          |
| Pro Trial  | 100       | 100          |
| Pro        | 10,000    | 10,000       |
| Enterprise | 10,000    | 10,000       |

### Size limits

| Resource                                         | Limit  |
| ------------------------------------------------ | ------ |
| Individual flag or segment                       | 200 KB |
| Total size of all flags and segments per project | 10 MB  |

The total size limit (the "pack") applies to the combined size of all flags and segments synced to the edge for a project.

### Flag validation

| Constraint               | Rule                                      |
| ------------------------ | ----------------------------------------- |
| Flag slug pattern        | Letters, numbers, dashes, and underscores |
| Flag slug length         | 1 - 512 characters                        |
| Environment name pattern | Letters, numbers, dashes, and underscores |
| Environment name length  | 1 - 128 characters                        |
| Environments per flag    | 10                                        |
| Rules per environment    | 10,000                                    |
| Targets per variant      | 10,000 per entity/attribute combination   |
| Items per condition list | 10,000                                    |
| Rules per segment        | 10,000                                    |
| Flag seed value          | 0 - 100,000                               |

All variant IDs referenced in rules must exist in the flag's variants array. Segments cannot be deleted while referenced by flags or other segments.

### Entity and settings limits

| Constraint                   | Limit          |
| ---------------------------- | -------------- |
| Entity types                 | 32             |
| Attributes per entity        | 32             |
| Labels per attribute         | 128            |
| Entity kind string length    | 128 characters |
| Entity label string length   | 128 characters |
| Attribute key string length  | 128 characters |
| Attribute type string length | 128 characters |
| Label value string length    | 128 characters |


---

[View full sitemap](/docs/sitemap)
