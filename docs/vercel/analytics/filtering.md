---
title: Filtering Analytics
product: vercel
url: /docs/analytics/filtering
type: how-to
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/quickstart
  - /docs/analytics/limits-and-pricing
  - /docs/analytics/custom-events
  - /docs/feature-flags
summary: "Learn how filters allow you to explore insights about your website's visitors."
---

# Filtering Analytics

Web Analytics provides you with a way to filter your data in order to gain a deeper understanding of your website
traffic. This guide will show you how to use the filtering feature and provide examples of how
to use it to answer specific questions.

## Using filters

To filter the Web Analytics view:

1. Select a project from the dashboard and then click the **Analytics** tab.
2. Click on any row within a data panel you want to filter by. You can use multiple filters simultaneously. The following filters are available:

- Routes (if your application is based on a [supported framework](/docs/analytics/quickstart#add-the-analytics-component-to-your-app))
- Pages
- Hostname
- Referrers
- UTM Parameters (available with [Web Analytics Plus](/docs/analytics/limits-and-pricing) and Enterprise)
- Country
- Browsers
- Devices
- Operating System
- If configured: [Custom Events](/docs/analytics/custom-events) and [Feature Flags](/docs/feature-flags)

3. All panels on the Web Analytics page will then update to show data filtered to your selection.

For example, if you want to see data for
visitors from the United States:

1. Search for "United States" within the **Country** panel.
2. Click on the row:

![Image](https://vercel.com/docs-assets/static/docs/concepts/web-analytics/filter-us-light.png)

## Examples of using filters

By using the filtering feature in Web Analytics, you can gain a deeper understanding of your website traffic and make
data-driven decisions.

### Find where visitors of a specific page came from

Let's say you want to find out where people came from that viewed your "About Us" page. To do this:

1. First, apply a filter in the **Pages** panel and click on the `/about-us` page. This will show you all of the data for visitors
   who viewed that page.
2. In the **Referrer** panel you can view all external pages that link directly to the filtered page.

### Understand content popularity in a specific country

You can use the Web Analytics dashboard to find out what content people from a specific country viewed. For example, to see
what pages visitors from Canada viewed:

1. Go to the **Countries** panel, select **View All** to bring up the filter box.
2. Search for "Canada" and click on the row labeled "Canada". This will show you all of the data for visitors from Canada.
3. Go to the **Pages** panel to see what specific pages they viewed.

### Discover route popularity from a specific referrer

To find out viewed pages from a specific referrer, such as Google:

1. From the **Analytics** tab, go to the **Referrers** panel.
2. Locate the row for "google.com" and click on it. This will show you all of the data for visitors who came from google.com.
3. Go to the **Routes** panel to see what specific pages they viewed.

## Drill-downs

You can use certain panels to drill down into more specific information:

- The **Referrers** panel lets you drill-down into your referral data to identify the sources of referral traffic, and find out which specific pages on a website are driving traffic to your site. By default, the **Referrers** panel only shows top level domains, but by clicking on one of the domains, you can start a drill-down and reveal all sub-pages that refer to your website.
- The **Flags** panel lets you drill down into your feature flag data to find out which flag options are causing certain events to occur and how many times each option is being used.
- The **Custom Events** panel lets you drill down into your custom event data to find out which events are occurring and how many times they are occurring. The options available will depend on the [custom data you have configured](/docs/analytics/custom-events#tracking-an-event-with-custom-data).

## Find Tweets from t.co referrer

Web Analytics allows you to track the origin of traffic from Twitter by using the Twitter Resolver feature. This feature can be especially useful for understanding the performance of Twitter campaigns, identifying the sources of
referral traffic and finding out the origin of a specific link.

To use it:

1. From the **Referrers** panel, click **View All** and search for `t.co`
2. Click on the `t.co` row to filter for it. This performs a drill-down, which
   reveals all `t.co` links that refer to your page.
3. Clicking on any of these links will open a new tab and
   redirect you to the Twitter search page with the URL as the search parameter. From there, you can find the original
   post of the link and gain insights into the traffic coming from Twitter.

Twitter search might not always be able to resolve to the original post of that link, and it may appear multiple times.


---

[View full sitemap](/docs/sitemap)
