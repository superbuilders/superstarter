---
title: Model Variants
product: vercel
url: /docs/ai-gateway/models-and-providers/model-variants
type: integration
prerequisites:
  - /docs/ai-gateway/models-and-providers
  - /docs/ai-gateway
related:
  []
summary: Enable provider-specific capabilities via headers when calling models through AI Gateway.
---

# Model Variants

Some AI inference providers offer special variants of models. These models can
have different features such as a larger context size. They may incur different
costs associated with requests as well.

When AI Gateway makes these models available they will be highlighted on the
model detail page with a **Model Variants** section in the relevant provider
card providing an overview of the feature set and linking to more detail.

Model variants sometimes rely on preview or beta features offered by the
inference provider. Their ongoing availability can therefore be less predictable
than that of a stable model feature. Check the provider's site for the latest
information.

### Anthropic Claude Sonnet 4 and 4.5: 1M token context

AI Gateway automatically enables the 1M token context window for Claude Sonnet 4
and 4.5 models. No configuration is required.

- **Learn more**:
  [Announcement](https://www.anthropic.com/news/1m-context),
  [Context windows docs](https://platform.claude.com/docs/en/build-with-claude/context-windows#1-m-token-context-window)
- **Pricing**: Requests that exceed 200K tokens are charged at premium rates. See
  [pricing details](https://docs.anthropic.com/en/about-claude/pricing#long-context-pricing).


---

[View full sitemap](/docs/sitemap)
