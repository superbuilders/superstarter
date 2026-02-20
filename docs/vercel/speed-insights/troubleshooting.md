---
title: Troubleshooting Vercel Speed Insights
product: vercel
url: /docs/speed-insights/troubleshooting
type: reference
prerequisites:
  - /docs/speed-insights
related:
  []
summary: Learn about common issues and how to troubleshoot Vercel Speed Insights.
---

# Troubleshooting Vercel Speed Insights

> **🔒 Permissions Required**: Speed Insights

## No data visible in Speed Insights dashboard

If you are experiencing a situation where data is not visible in the Speed Insights dashboard, it could be due to a couple of reasons.

**How to fix**:

1. Double check if you followed the quickstart instructions correctly
2. Check if your adblocker is interfering with the Speed Insights script. If so, consider disabling it

## Requests are not getting called

If `/_vercel/speed-insights/script.js` is correctly loading but not sending any data (e.g. no `vitals` request), ensure that you're checking for the request after navigating to a different page, or switching tabs. Speed Insights data is only sent on window blur or unload events.

## Speed Insights is not working with proxy

We do not recommend placing a reverse proxy in front of Vercel, as it may interfere with the proper functioning of Speed Insights.

**How to fix**:

1. Check your proxy configuration to make sure that all desired pages are correctly proxied to the deployment
2. Additionally, forward all requests to `/_vercel/speed-insights/*` to the deployments to ensure proper functioning of Speed Insights through the proxy


---

[View full sitemap](/docs/sitemap)
