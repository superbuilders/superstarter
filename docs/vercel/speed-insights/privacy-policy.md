---
title: Vercel Speed Insights Privacy & Compliance
product: vercel
url: /docs/speed-insights/privacy-policy
type: reference
prerequisites:
  - /docs/speed-insights
related:
  - /docs/speed-insights/metrics
  - /docs/speed-insights/migrating-from-legacy
summary: Learn how Vercel follows the latest privacy and data compliance standards with its Speed Insights feature.
---

# Vercel Speed Insights Privacy & Compliance

> **🔒 Permissions Required**: Speed Insights

To ensure that the Speed Insights feature can be used despite many different regulatory limitations around the world, we've designed it in such a way that it provides you with information without being tied to, or associated with, any individual visitor or IP address.

The recording of data points is anonymous and the Speed Insights feature does not collect or store information that would enable us to reconstruct a browsing session across pages or identify a user.

The following information is stored with every data point:

| Collected Value              | Example Value                |
| ---------------------------- | ---------------------------- |
| Route                        | /blog/\[slug]                 |
| URL                          | /blog/nextjs-10              |
| Network Speed                | 4g (or slow-2g, 2g, 3g)      |
| Browser                      | Chrome 86 (Blink)            |
| Device Type                  | Mobile (or Desktop/Tablet)   |
| Device OS                    | Android 10                   |
| Country (ISO 3166-1 alpha-2) | US                           |
| Web Vital                    | FCP 1.0s                     |
| Web Vital Attribution        | html>body img.header         |
| SDK Information              | @vercel/speed-insights 0.1.0 |
| Server-Received Event Time   | 2023-10-29 09:06:30          |

See our [Privacy Notice](/legal/privacy-policy) for more information, including how Vercel Speed Insights complies with the GDPR.

## How the data points are tracked

Once you've followed the dashboard's instructions for enabling Speed Insights and installed the `@vercel/speed-insights` package, it will automatically start tracking data points for your project.

The package injects a script that retrieves the visitor's [Web Vitals](/docs/speed-insights/metrics) by invoking native browser APIs and reporting them to Vercel's servers on every page load.

Learn more about the [first-party intake data ingestion method](/docs/speed-insights/migrating-from-legacy#first-party-intake), which enables a faster and more reliable experience.


---

[View full sitemap](/docs/sitemap)
