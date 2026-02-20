---
title: BotID
product: vercel
url: /docs/botid
type: reference
prerequisites:
  []
related:
  - /docs/botid/get-started
  - /docs/botid/verified-bots
  - /docs/vercel-firewall/firewall-observability
  - /docs/observability/observability-plus
  - /docs/botid/advanced-configuration
summary: Protect your applications from automated attacks with intelligent bot detection and verification, powered by Kasada.
---

# BotID

> **🔒 Permissions Required**: BotID

[Vercel BotID](/botid) is an invisible CAPTCHA that protects against sophisticated bots without showing visible challenges or requiring user action. It's a client-side challenge that uses machine learning to distinguish between humans and bots. It adds a protection layer to high-value routes, such as checkouts, signups, and APIs, that are common targets for bots imitating real users.

Sophisticated bots are designed to closely mimic real user behavior. They can run JavaScript, solve CAPTCHAs, and navigate interfaces in ways that closely resemble humans. Tools like **Playwright** and **Puppeteer** automate these sessions, simulating actions from page load to form submission. These bots aim to blend in with normal traffic, making detection difficult and mitigation costly.

### Resources

- [Getting Started](/docs/botid/get-started) - Setup guide with complete code examples
- [Verified Bots](/docs/botid/verified-bots) - Information about verified bots and their handling
- [Bypass BotID](#bypassing-botid) - Configure bypass rules for BotID detection

## Validation flow

BotID validates clients with these steps:

1. A **client-side challenge** is sent to the browser.
2. The **browser** solves the challenge and includes the solution in requests to your high-value endpoint.
3. Your **server-side code** calls `checkBotId()`
4. **Vercel** validates the integrity of the challenge response.
5. **Deep Analysis** uses a machine learning model to analyze the client side signals, if configured.
6. The **server-side code** receives the analysis result, where the application can take action.

## Check levels

BotID can be configured to run at one of two levels, **Basic** or **Deep Analysis**. Deep Analysis runs only after the Basic validation has passed.

### Basic

The **Basic** level validates the integrity and correctness of the challenge response, catching many less sophisticated bots. It is provided free of charge for all plans.

### Deep Analysis

BotID includes **Deep Analysis**, powered by [Kasada](https://www.kasada.io/). Kasada is a leading bot protection provider trusted by Fortune 500 companies and global enterprises. It delivers advanced bot detection and anti-fraud capabilities while respecting user privacy and adapting to new bot behaviors in real-time.

Deep Analysis uses machine learning to analyze thousands of client side signals to further detect bots, in addition to the basic validation.

Deep Analysis provides real-time protection against:

- **Automated attacks**: Shield your application from credential stuffing, brute force attacks, and other automated threats
- **Data scraping**: Prevent unauthorized data extraction and content theft
- **API abuse**: Protect your endpoints from excessive automated requests
- **Spam and fraud**: Block malicious bots while allowing legitimate traffic through
- **Expensive resources**: Prevent bots from consuming expensive infrastructure, bandwidth, compute, or inventory

Deep Analysis counters the most advanced bots by:

1. Silently collecting thousands of signals that distinguish human users from bots
2. Changing detection methods on every page load to prevent reverse engineering and sophisticated bypasses
3. Streaming attack data to a global machine learning system that improves protection for all customers

## Pricing

| Mode          | Plans Available    | Price                                      |
| ------------- | ------------------ | ------------------------------------------ |
| Basic         | All Plans          | Free                                       |
| Deep Analysis | Pro and Enterprise | $1/1000 `checkBotId()` Deep Analysis calls |

> **💡 Note:** Calling the `checkBotId()` function in your code triggers BotID Deep Analysis
> charges. Passive page views or requests that don't invoke the `checkBotId()`
> function are not charged.

## Bypassing BotID

You can add a bypass rule to the [Vercel WAF](https://vercel.com/docs/vercel-firewall/firewall-concepts#bypass) to let through traffic that would have otherwise been detected as a bot by BotID.

## BotID observability

You can view BotID checks by selecting BotID on the firewall traffic dropdown filter of the [Firewall tab](/docs/vercel-firewall/firewall-observability#traffic) of a project.

Metrics are also available in [Observability Plus](/docs/observability/observability-plus).

## More resources

- [Advanced configuration](/docs/botid/advanced-configuration) - Fine-grained control over detection levels and backend domains
- [Form submissions](/docs/botid/form-submissions) - Handling form submissions with BotID protection
- [Local Development Behavior](/docs/botid/local-development-behavior) - Testing BotID in development environments


---

[View full sitemap](/docs/sitemap)
