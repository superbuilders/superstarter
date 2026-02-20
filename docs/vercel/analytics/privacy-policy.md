---
title: Privacy and Compliance
product: vercel
url: /docs/analytics/privacy-policy
type: reference
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/quickstart
  - /docs/analytics/redacting-sensitive-data
  - /docs/analytics/custom-events
summary: Learn how Vercel supports privacy and data compliance standards with Vercel Web Analytics.
---

# Privacy and Compliance

Vercel takes a privacy-focused approach to our products and strives to enable our customers to use Vercel with confidence. The company aims to be as transparent as possible so our customers have the relevant information that they need about Vercel Web Analytics to meet their compliance obligations.

## Data collected

Vercel Web Analytics can be used globally and Vercel has designed it to align with leading data protection authority guidance. When using Vercel Web Analytics, no personal identifiers that track and cross-check end users' data across different applications or websites, are collected. By default, Vercel Web Analytics allows you to use only aggregated data that can not identify or re-identify customers' end users. For more information, see [Configuring Vercel Web Analytics](#configuring-vercel-web-analytics)

The recording of data points (for example, page views or custom events) is anonymous, so you have insight into your data without it being tied to or associated with any individual, customer, or IP address.

Vercel Web Analytics does not collect or store any information that would enable you to reconstruct an end user’s browsing session across different applications or websites and/or personally identify an end user. A minimal amount of data is collected and it is used for aggregated statistics only. For information on the type of data, see the [Data Point Information](#data-point-information) section.

## Visitor identification and data storage

Vercel Web Analytics allows you to track your website traffic and gather valuable insights without using any third-party cookies, instead end users are identified by a hash created from the incoming request.

The lifespan of a visitor session is not stored permanently, it is automatically discarded after 24 hours.

After following the dashboard instructions to enable Vercel Web Analytics, see our [Quickstart](/docs/analytics/quickstart) for a step-by-step tutorial on integrating the Vercel Web Analytics script into your application. After successfully completing the quickstart and deploying your application, the script will begin transmitting page view data to Vercel's servers.

All page views will automatically be tracked by Vercel Web Analytics, including both fresh page loads and client-side page transitions.

### Data point information

The following information may be stored with every data point:

| Collected Value              | Example Value                 |
| ---------------------------- | ----------------------------- |
| Event Timestamp              | 2020-10-29 09:06:30           |
| URL                          | `/blog/nextjs-10`             |
| Dynamic Path                 | `/blog/[slug]`                |
| Referrer                     | https://news.ycombinator.com/ |
| Query Params (Filtered)      | `?ref=hackernews`             |
| Geolocation                  | US, California, San Francisco |
| Device OS & Version          | Android 10                    |
| Browser & Version            | Chrome 86 (Blink)             |
| Device Type                  | Mobile (or Desktop/Tablet)    |
| Web Analytics Script Version | 1.0.0                         |

## Configuring Vercel Web Analytics

Some URLs and query parameters can include sensitive data and personal information (i.e. user ID, token, order ID or any other information that can individually identify a person). You have the ability to configure Vercel Web Analytics in a manner that suits your security and privacy needs to ensure that no personal information is collected in your custom events or page views, if desired.

For example, automatic page view tracking may track personal information `https://acme.com/[name of individual]/invoice/[12345]`. You can modify the URL by passing in the `beforeSend` function. For more information see our documentation on [redacting sensitive data](/docs/analytics/redacting-sensitive-data).

For [custom events](/docs/analytics/custom-events), you may want to prevent sending sensitive or personal information, such as email addresses, to Vercel.


---

[View full sitemap](/docs/sitemap)
