---
title: Speed Insights Configuration with @vercel/speed-insights
product: vercel
url: /docs/speed-insights/package
type: reference
prerequisites:
  - /docs/speed-insights
related:
  - /docs/speed-insights/quickstart
summary: Learn how to configure your application to capture and send web performance metrics to Vercel using the @vercel/speed-insights npm package.
---

# Speed Insights Configuration with @vercel/speed-insights

> **🔒 Permissions Required**: Speed Insights

With the `@vercel/speed-insights` npm package, you're able to configure your application to capture and send web performance metrics to Vercel.

## Getting started

To get started with Speed Insights, refer to our [Quickstart](/docs/speed-insights/quickstart) guide which will walk you through the process of setting up Speed Insights for your project.

## `sampleRate`

> **💡 Note:** In prior versions of Speed Insights this was managed in the UI. This option is
> now managed through code with the package.

This parameter determines the percentage of events that are sent to the server. By default, all events are sent. Lowering this parameter allows for cost savings but may result in a decrease in the overall accuracy of the data being sent. For example, a `sampleRate` of `0.5` would mean that only 50% of the events will be sent to the server.

To learn more about how to configure the `sampleRate` option, see the [Sending a sample of events to Speed Insights](/kb/guide/sending-sample-to-speed-insights) recipe.

## `beforeSend`

With the `beforeSend` function, you can modify or filter out the event data before it's sent to Vercel. You can use this to redact sensitive data or to avoid sending certain events.

For instance, if you wish to ignore events from a specific URL or modify them, you can do so with this option.

```tsx
// Example usage of beforeSend
beforeSend: (data) => {
  if (data.url.includes('/sensitive-path')) {
    return null; // this will ignore the event
  }
  return data; // this will send the event as is
};
```

## `debug`

With the debug mode, you can view all Speed Insights events in the browser's console. This option is especially useful during development.

This option is **automatically enabled** if the `NODE_ENV` environment variable is available and either `development` or `test`.

You can manually disable it to prevent debug messages in your browsers console.

## `route`

The `route` option allows you to specify the current dynamic route (such as `/blog/[slug]`). This is particularly beneficial when you need to aggregate performance metrics for similar routes.

This option is **automatically set** when using a framework specific import such as for Next.js, Nuxt, SvelteKit and Remix.

## `endpoint`

The `endpoint` option allows you to report the collected metrics to a different url than the default: `https://yourdomain.com/_vercel/speed-insights/vitals`.

This is useful when deploying several projects under the same domain, as it allows you to keep each application isolated.

For example, when `yourdomain.com` is managed outside of Vercel:

1. "alice-app" is deployed under `yourdomain.com/alice/*`, vercel alias is `alice-app.vercel.sh`
2. "bob-app" is deployed under `yourdomain.com/bob/*`, vercel alias is `bob-app.vercel.sh`
3. `yourdomain.com/_vercel/*` is routed to `alice-app.vercel.sh`

Both applications are sending their metrics to `alice-app.vercel.sh`. To restore the isolation, "bob-app" should use:

```tsx
<SpeedInsights endpoint="https://bob-app.vercel.sh/_vercel/speed-insights/vitals" />
```

## `scriptSrc`

The `scriptSrc` option allows you to load the Speed Insights script from a different URL than the default one.

```tsx
<SpeedInsights scriptSrc="https://bob-app.vercel.sh/_vercel/speed-insights/script.js" />
```

## More resources

- [Sending a sample of your events](/kb/guide/sending-sample-to-speed-insights)


---

[View full sitemap](/docs/sitemap)
