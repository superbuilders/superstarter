---
title: Create React App on Vercel
product: vercel
url: /docs/frameworks/frontend/create-react-app
type: conceptual
prerequisites:
  - /docs/frameworks/frontend
  - /docs/frameworks
related:
  - /docs/cdn-cache
  - /docs/deployments/environments
  - /docs/cli/deploy
  - /docs/comments/how-comments-work
  - /docs/analytics/quickstart
summary: "Learn how to use Vercel's features with Create React App"
---

# Create React App on Vercel

Create React App (CRA) is a development environment for building single-page applications with the React framework. It sets up and configures a new React project with the latest JavaScript features, and optimizes your app for production.

## Get Started with CRA on Vercel

## Static file caching

On Vercel, static files are [replicated and deployed to every region in our global CDN after the first request](/docs/cdn-cache#static-files-caching). This ensures that static files are served from the closest location to the visitor, improving performance and reducing latency.

Static files are cached for up to 31 days. If a file is unchanged, it can persist across deployments, as their hash caches static files. However, the cache is effectively invalidated when you redeploy, so we always serve the latest version.

**To summarize, using Static Files with CRA on Vercel:**

- Automatically optimizes and caches assets for the best performance
- Makes files easily accessible through the `public` folder
- Supports zero-downtime rollouts
- Requires no additional services needed to procure or set up

[Learn more about static files caching](/docs/cdn-cache#static-files-caching)

## Preview Deployments

When you deploy your CRA app to Vercel and connect your git repo, every pull request will generate a [Preview Deployment](/docs/deployments/environments#preview-environment-pre-production).

Preview Deployments allow you to preview changes to your app in a live deployment. They are available by default for all projects, and are generated when you commit changes to a Git branch with an open pull request, or you create a deployment [using Vercel CLI](/docs/cli/deploy#usage).

### Comments

You can use the comments feature to receive feedback on your Preview Deployments from Vercel Team members and [people you share the Preview URL with](/docs/comments/how-comments-work#sharing).

Comments allow you to start discussion threads, share screenshots, send notifications, and more.

**To summarize, Preview Deployments with CRA on Vercel:**

- Enable you to share previews of pull request changes in a live environment
- Come with a comment feature for improved collaboration and feedback
- Experience changes to your product without merging them to your deployment branch

[Learn more about Preview Deployments](/docs/deployments/environments#preview-environment-pre-production)

## Web Analytics

Vercel's Web Analytics features enable you to visualize and monitor your application's performance over time. The Analytics tab in your project's dashboard offers detailed insights into your website's visitors, with metrics like top pages, top referrers, and user demographics.

To use Web Analytics, navigate to the Analytics tab of your project dashboard on Vercel and select **Enable** in the modal that appears.

To track visitors and page views, we recommend first installing our `@vercel/analytics` package.

You can then import the `inject` function from the package, which will add the tracking script to your app. This should only be called once in your app.

Add the following code to your main app file:

```ts filename="main.ts" framework=all
import { inject } from '@vercel/analytics';

inject();
```

```js filename="main.js" framework=all
import { inject } from '@vercel/analytics';

inject();
```

Then, [ensure you've enabled Web Analytics in your dashboard on Vercel](/docs/analytics/quickstart). You should start seeing usage data in your Vercel dashboard.

**To summarize, using Web Analytics with CRA on Vercel:**

- Enables you to track traffic and see your top-performing pages
- Offers you detailed breakdowns of visitor demographics, including their OS, browser, geolocation and more

[Learn more about Web Analytics](/docs/analytics)

## Speed Insights

You can see data about your CRA project's [Core Web Vitals](/docs/speed-insights/metrics#core-web-vitals-explained) performance in your dashboard on Vercel. Doing so will allow you to track your web application's loading speed, responsiveness, and visual stability so you can improve the overall user experience.

On Vercel, you can track your app's Core Web Vitals in your project's dashboard by enabling Speed Insights.

**To summarize, using Speed Insights with CRA on Vercel:**

- Enables you to track traffic performance metrics, such as [First Contentful Paint](/docs/speed-insights/metrics#first-contentful-paint-fcp), or [First Input Delay](/docs/speed-insights/metrics#first-input-delay-fid)
- Enables you to view performance analytics by page name and URL for more granular analysis
- Shows you [a score for your app's performance](/docs/speed-insights/metrics#how-the-scores-are-determined) on each recorded metric, which you can use to track improvements or regressions

[Learn more about Speed Insights](/docs/speed-insights)

## Observability

Vercel's observability features help you monitor, analyze, and manage your projects. From your project's dashboard on Vercel, you can track website usage and performance, record team members' activities, and visualize real-time data from logs.

[Activity Logs](/docs/observability/activity-log), which you can see in the Activity tab of your project dashboard, are available on all account plans. The following observability products are available for Enterprise teams:

- **[Monitoring](/docs/observability/monitoring)**: A query editor that allows you to visualize, explore, and monitor your usage and traffic
- **[Runtime Logs](/docs/runtime-logs)**: An interface that allows you to search and filter logs from static requests and Function invocations
- **[Audit Logs](/docs/observability/audit-log)**: An interface that enables your team owners to track and analyze their team members' activity

For Pro (and Enterprise) accounts:

- **[Log Drains](/docs/drains)**: Export your log data for better debugging and analyzing, either from the dashboard, or using one of [our integrations](/integrations#logging)
- **[OpenTelemetry (OTEL) collector](/docs/observability/audit-log)**: Send OTEL traces from your Vercel functions to application performance monitoring (APM) vendors

**To summarize, using Vercel's observability features with CRA enable you to:**

- Visualize website usage data, performance metrics, and logs
- Search and filter logs for static, and Function requests
- Use queries to see in-depth information about your website's usage and traffic
- Send your metrics and data to other observability services through our integrations
- Track and analyze team members' activity

[Learn more about Observability](/docs/observability)

## More benefits

See [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.

## More resources

Learn more about deploying CRA projects on Vercel with the following resources:

- [Remote caching docs](/docs/monorepos/remote-caching)
- [React with Formspree](/kb/guide/deploying-react-forms-using-formspree-with-vercel)
- [React Turborepo template](/templates/react/turborepo-design-system)


---

[View full sitemap](/docs/sitemap)
