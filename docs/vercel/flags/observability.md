---
title: Observability
product: vercel
url: /docs/flags/observability
type: conceptual
prerequisites:
  - /docs/flags
related:
  - /docs/flags/observability/runtime-logs
  - /docs/flags/observability/web-analytics
  - /docs/flags/flags-sdk-reference
summary: Learn about observability on Vercel.
---

# Observability

Feature flags play a crucial role in the software development lifecycle, enabling safe feature rollouts, experimentation, and A/B testing. When you integrate your feature flags with the Vercel platform, you can improve your application by using Vercel's observability features.

## Why track flag evaluations?

Tracking which flags are evaluated and when gives you insights into:

- How features perform in production
- Which user segments see which features
- The correlation between flags and application metrics
- Issues related to specific flag configurations

## Observability options

## How it works

Both observability integrations work by reporting flag values as your application evaluates them:

1. When your code evaluates a flag, call `reportValue(flagKey, flagValue)`
2. Vercel captures these evaluations and associates them with the request or event
3. View the data in Runtime Logs or Web Analytics dashboards

If you're using the Flags SDK, flag reporting happens automatically—no manual instrumentation required.

## Next steps

- [Integrate flags with Runtime Logs](/docs/flags/observability/runtime-logs)
- [Integrate flags with Web Analytics](/docs/flags/observability/web-analytics)
- [Learn about the Flags SDK](/docs/flags/flags-sdk-reference)


---

[View full sitemap](/docs/sitemap)
