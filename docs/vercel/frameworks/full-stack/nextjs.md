---
title: Next.js on Vercel
product: vercel
url: /docs/frameworks/full-stack/nextjs
type: conceptual
prerequisites:
  - /docs/frameworks/full-stack
  - /docs/frameworks
related:
  - /docs/incremental-static-regeneration
  - /docs/cdn
  - /docs/functions
  - /docs/cdn-cache
  - /docs/functions/streaming-functions
summary: Vercel is the native Next.js platform, designed to enhance the Next.js experience.
---

# Next.js on Vercel

[Next.js](https://nextjs.org/) is a fullstack React framework for the web, maintained by Vercel.

While Next.js works when self-hosting, deploying to Vercel is zero-configuration and provides additional enhancements for **scalability, availability, and performance globally**.

## Getting started

## Incremental Static Regeneration

[Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) allows you to create or update content *without* redeploying your site. ISR has three main benefits for developers: better performance, improved security, and faster build times.

When self-hosting, (ISR) is limited to a single region workload. Statically generated pages are not distributed closer to visitors by default, without additional configuration or vendoring of a CDN. By default, self-hosted ISR does *not* persist generated pages to durable storage. Instead, these files are located in the Next.js cache (which expires).

> For \["nextjs"]:

To enable ISR with Next.js in the `pages` router, add a `revalidate` property to the object returned from `getStaticProps`:

> For \["nextjs-app"]:

To enable ISR with Next.js in the `app` router, add an options object with a `revalidate` property to your `fetch` requests:

```ts filename="apps/example/page.tsx" framework=nextjs-app
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: 10 }, // Seconds
  });

  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

```js filename="apps/example/page.jsx" framework=nextjs-app
export default async function Page() {
  const res = await fetch('https://api.vercel.app/blog', {
    next: { revalidate: 10 }, // Seconds
  });

  const data = await res.json();

  return (
    <main>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </main>
  );
}
```

```ts filename="pages/example/index.tsx" framework=nextjs
export async function getStaticProps() {
  /* Fetch data here */

  return {
    props: {
      /* Add something to your props */
    },
    revalidate: 10, // Seconds
  };
}
```

```js filename="pages/example/index.jsx" framework=nextjs
export async function getStaticProps() {
  /* Fetch data here */

  return {
    props: {
      /* Add something to your props */
    },
    revalidate: 10, // Seconds
  };
}
```

**To summarize, using ISR with Next.js on Vercel:**

- Better performance with our global [CDN](/docs/cdn)
- Zero-downtime rollouts to previously statically generated pages
- Framework-aware infrastructure enables global content updates in 300ms
- Generated pages are both cached and persisted to durable storage

[Learn more about Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration)

## Server-Side Rendering (SSR)

Server-Side Rendering (SSR) allows you to render pages dynamically on the server. This is useful for pages where the rendered data needs to be unique on every request. For example, checking authentication or looking at the location of an incoming request.

On Vercel, you can server-render Next.js applications through [Vercel Functions](/docs/functions).

**To summarize, SSR with Next.js on Vercel:**

- Scales to zero when not in use
- Scales automatically with traffic increases
- Has zero-configuration support for [`Cache-Control` headers](/docs/cdn-cache), including `stale-while-revalidate`
- Framework-aware infrastructure enables automatic creation of Functions for SSR

[Learn more about SSR](https://nextjs.org/docs/app/building-your-application/rendering#static-and-dynamic-rendering-on-the-server)

## Streaming

Vercel supports streaming in Next.js projects with any of the following:

- [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/router-handlers)
- [Vercel Functions](/docs/functions/streaming-functions)
- React Server Components

Streaming data allows you to fetch information in chunks rather than all at once, speeding up Function responses. You can use streams to improve your app's user experience and prevent your functions from failing when fetching large files.

#### Streaming with `loading` and `Suspense`

In the Next.js App Router, you can use the `loading` file convention or a `Suspense` component to show an instant loading state from the server while the content of a route segment loads.

The `loading` file provides a way to show a loading state for a whole route or route-segment, instead of just particular sections of a page. This file affects all its child elements, including layouts and pages. It continues to display its contents until the data fetching process in the route segment completes.

The following example demonstrates a basic `loading` file:

```js filename="loading.jsx" framework=all
export default function Loading() {
  return <p>Loading...</p>;
}
```

```ts filename="loading.tsx" framework=all
export default function Loading() {
  return <p>Loading...</p>;
}
```

Learn more about loading in the [Next.js docs](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming).

The `Suspense` component, introduced in React 18, enables you to display a fallback until components nested within it have finished loading. Using `Suspense` is more granular than showing a loading state for an entire route, and is useful when only sections of your UI need a loading state.

You can specify a component to show during the loading state with the `fallback` prop on the `Suspense` component as shown below:

```ts filename="app/dashboard/page.tsx" framework=all
import { Suspense } from 'react';
import { PostFeed, Weather } from './components';

export default function Posts() {
  return (
    <section>
      <Suspense fallback={<p>Loading feed...</p>}>
        <PostFeed />
      </Suspense>
      <Suspense fallback={<p>Loading weather...</p>}>
        <Weather />
      </Suspense>
    </section>
  );
}
```

```js filename="app/dashboard/page.jsx" framework=all
import { Suspense } from 'react';
import { PostFeed, Weather } from './components';

export default function Posts() {
  return (
    <section>
      <Suspense fallback={<p>Loading feed...</p>}>
        <PostFeed />
      </Suspense>
      <Suspense fallback={<p>Loading weather...</p>}>
        <Weather />
      </Suspense>
    </section>
  );
}
```

**To summarize, using Streaming with Next.js on Vercel:**

- Speeds up Function response times, improving your app's user experience
- Display initial loading UI with incremental updates from the server as new data becomes available

Learn more about [Streaming](/docs/functions/streaming-functions) with Vercel Functions.

## Partial Prerendering

> **⚠️ Warning:** Partial Prerendering as an experimental feature. It is currently
> &#x20;environments.

Partial Prerendering (PPR) is an **experimental** feature in Next.js that allows the static portions of a page to be pre-generated and served from the cache, while the dynamic portions are streamed in a single HTTP request.

When a user visits a route:

- A static route *shell* is served immediately, this makes the initial load fast.
- The shell leaves *holes* where dynamic content will be streamed in to minimize the perceived overall page load time.
- The async holes are loaded in parallel, reducing the overall load time of the page.

This approach is useful for pages like dashboards, where unique, per-request data coexists with static elements such as sidebars or layouts. This is different from how your application behaves today, where entire routes are either fully static or dynamic.

See the [Partial Prerendering docs](https://nextjs.org/docs/app/api-reference/next-config-js/partial-prerendering) to learn more.

## Image Optimization

[Image Optimization](/docs/image-optimization) helps you achieve faster page loads by reducing the size of images and using modern image formats.

When deploying to Vercel, images are automatically optimized on demand, keeping your build times fast while improving your page load performance and [Core Web Vitals](/docs/speed-insights).

When self-hosting, Image Optimization uses the default Next.js server for optimization. This server manages the rendering of pages and serving of static files.

To use Image Optimization with Next.js on Vercel, import the `next/image` component into the component you'd like to add an image to, as shown in the following example:

```js filename="components/example-component.jsx" framework=nextjs
import Image from 'next/image';

const ExampleComponent = (props) => {
  return (
    <>
      <Image src="example.png" alt="Example picture" width={500} height={500} />
      <span>{props.name}</span>
    </>
  );
};
```

```ts filename="components/example-component.tsx" framework=nextjs
import Image from 'next/image';

interface ExampleProps {
  name: string;
}

const ExampleComponent = ({ name }: ExampleProps) => {
  return (
    <>
      <Image
        src="example.png"
        alt="Example picture"
        width={500}
        height={500}
      />
      <span>{name}</span>
    </>
  );
};

export default ExampleComponent;
```

```js filename="components/example-component.jsx" framework=nextjs-app
import Image from 'next/image';

const ExampleComponent = (props) => {
  return (
    <>
      <Image src="example.png" alt="Example picture" width={500} height={500} />
      <span>{props.name}</span>
    </>
  );
};
```

```ts filename="components/ExampleComponent.tsx" framework=nextjs-app
import Image from 'next/image';

interface ExampleProps {
  name: string;
}

const ExampleComponent = ({ name }: ExampleProps) => {
  return (
    <>
      <Image
        src="example.png"
        alt="Example picture"
        width={500}
        height={500}
      />
      <span>{name}</span>
    </>
  );
};

export default ExampleComponent;
```

**To summarize, using Image Optimization with Next.js on Vercel:**

- Zero-configuration Image Optimization when using `next/image`
- Helps your team ensure great performance by default
- Keeps your builds fast by optimizing images on-demand
- Requires No additional services needed to procure or set up

[Learn more about Image Optimization](/docs/image-optimization)

## Font Optimization

[`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) enables built-in automatic self-hosting for any font file. This means you can optimally load web fonts with zero [layout shift](/docs/speed-insights/metrics#cumulative-layout-shift-cls), thanks to the underlying CSS [`size-adjust`](https://developer.mozilla.org/docs/Web/CSS/@font-face/size-adjust) property.

This also allows you to use all [Google Fonts](https://fonts.google.com/) with performance and privacy in mind. CSS and font files are downloaded at build time and self-hosted with the rest of your static files. No requests are sent to Google by the browser.

```js filename="pages/_app.jsx" framework=nextjs
import { Inter } from 'next/font/google';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] });

export default function MyApp({ Component, pageProps }) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
```

```ts filename="pages/_app.tsx" framework=nextjs
import { Inter } from 'next/font/google';
import type { AppProps } from 'next/app';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ subsets: ['latin'] });

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
    </main>
  );
}
```

```js filename="app/layout.jsx" framework=nextjs-app
import { Inter } from 'next/font/google';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

```ts filename="app/layout.tsx" framework=nextjs-app
import { Inter } from 'next/font/google';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

**To summarize, using Font Optimization with Next.js on Vercel:**

- Enables built-in, automatic self-hosting for font files
- Loads web fonts with zero layout shift
- Allows for CSS and font files to be downloaded at build time and self-hosted with the rest of your static files
- Ensures that no requests are sent to Google by the browser

[Learn more about Font Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

## Open Graph Images

Dynamic social card images (using the [Open Graph protocol](/docs/og-image-generation "The Open Graph Protocol")) allow you to create a unique image for every page of your site. This is useful when sharing links on the web through social platforms or through text message.

The [Vercel OG](/docs/og-image-generation) image generation library allows you generate fast, dynamic social card images using Next.js API Routes.

The following example demonstrates using OG image generation in both the Next.js Pages and App Router:

```ts filename="pages/api/og.tsx" framework=nextjs
import { ImageResponse } from '@vercel/og';

export default function () {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello world!
      </div>
    ),
    {
      width: 1200,
      height: 600,
    },
  );
}
```

```js filename="pages/api/og.jsx" framework=nextjs
import { ImageResponse } from '@vercel/og';

export default function () {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello world!
      </div>
    ),
    {
      width: 1200,
      height: 600,
    },
  );
}
```

```ts filename="app/api/og/route.tsx" framework=nextjs-app
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.

export async function GET(request: Request) {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello world!
      </div>
    ),
    {
      width: 1200,
      height: 600,
    },
  );
}
```

```js filename="app/api/og/route.jsx" framework=nextjs-app
import { ImageResponse } from 'next/og';
// App router includes @vercel/og.
// No need to install it.

export async function GET(request) {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 128,
          background: 'white',
          width: '100%',
          height: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Hello world!
      </div>
    ),
    {
      width: 1200,
      height: 600,
    },
  );
}
```

To see your generated image, run `npm run dev` in your terminal and visit the `/api/og` route in your browser (most likely `http://localhost:3000/api/og`).

**To summarize, the benefits of using Vercel OG with Next.js include:**

- Instant, dynamic social card images without needing headless browsers
- Generated images are automatically cached on the Vercel CDN
- Image generation is co-located with the rest of your frontend codebase

[Learn more about OG Image Generation](/docs/og-image-generation)

## Middleware

[Middleware](/docs/routing-middleware) is code that executes before a request is processed. Because Middleware runs before the cache, it's an effective way of providing personalization to statically generated content.

When deploying middleware with Next.js on Vercel, you get access to built-in helpers that expose each request's geolocation information. You also get access to the `NextRequest` and `NextResponse` objects, which enable rewrites, continuing the middleware chain, and more.

See [the Middleware API docs](/docs/routing-middleware/api) for more information.

**To summarize, Middleware with Next.js on Vercel:**

- Runs using [Middleware](/docs/routing-middleware) which are deployed globally
- Replaces needing additional services for customizable routing rules
- Helps you achieve the best performance for serving content globally

[Learn more about Middleware](/docs/routing-middleware)

## Draft Mode

[Draft Mode](/docs/draft-mode) enables you to view draft content from your [Headless CMS](/docs/solutions/cms) immediately, while still statically generating pages in production.

See [our Draft Mode docs](/docs/draft-mode#getting-started) to learn how to use it with Next.js.

### Self-hosting Draft Mode

When self-hosting, every request using Draft Mode hits the Next.js server, potentially incurring extra load or cost. Further, by spoofing the cookie, malicious users could attempt to gain access to your underlying Next.js server.

### Draft Mode security

Deployments on Vercel automatically secure Draft Mode behind the same authentication used for Preview Comments. In order to enable or disable Draft Mode, the viewer must be logged in as a member of the [Team](/docs/teams-and-accounts). Once enabled, Vercel's CDN will bypass the ISR cache automatically and invoke the underlying [Vercel Function](/docs/functions).

### Enabling Draft Mode in Preview Deployments

You and your team members can toggle Draft Mode in the Vercel Toolbar in [production](/docs/vercel-toolbar/in-production-and-localhost/add-to-production), [localhost](/docs/vercel-toolbar/in-production-and-localhost/add-to-localhost), and [Preview Deployments](/docs/deployments/environments#preview-environment-pre-production#comments). When you do so, the toolbar will become purple to indicate Draft Mode is active.

![Image](`/docs-assets/static/docs/workflow-collaboration/draft-mode/draft-toolbar1-light.png`)

Users outside your Vercel team cannot toggle Draft Mode.

**To summarize, the benefits of using Draft Mode with Next.js on Vercel include:**

- Easily server-render previews of static pages
- Adds additional security measures to prevent malicious usage
- Integrates with any headless provider of your choice
- You can enable and disable Draft Mode in [the comments toolbar](/docs/comments/how-comments-work) on Preview Deployments

[Learn more about Draft Mode](/docs/draft-mode)

## Web Analytics

Vercel's Web Analytics features enable you to visualize and monitor your application's performance over time. The Analytics tab in your project's dashboard offers detailed insights into your website's visitors, with metrics like top pages, top referrers, and user demographics.

To use Web Analytics, navigate to the Analytics tab of your project dashboard on Vercel and select **Enable** in the modal that appears.

To track visitors and page views, we recommend first installing our `@vercel/analytics` package by running the terminal command below in the root directory of your Next.js project:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/analytics
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/analytics
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/analytics
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/analytics
    ```
  </Code>
</CodeBlock>

Then, follow the instructions below to add the `Analytics` component to your app either using the `pages` directory or the `app` directory.

> For \['nextjs']:

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Next.js, including route support.

If you are using the `pages` directory, add the following code to your main app file:

```tsx {2, 8} filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
```

```jsx {1, 7} filename="pages/_app.js" framework=nextjs
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}

export default MyApp;
```

> For \['nextjs-app']:

The `Analytics` component is a wrapper around the tracking script, offering more seamless integration with Next.js, including route support.

Add the following code to the root layout:

```tsx {1, 15} filename="app/layout.tsx" framework=nextjs-app
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

```jsx {1, 11} filename="app/layout.jsx" framework=nextjs-app
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**To summarize, Web Analytics with Next.js on Vercel:**

- Enables you to track traffic and see your top-performing pages
- Offers you detailed breakdowns of visitor demographics, including their OS, browser, geolocation, and more

[Learn more about Web Analytics](/docs/analytics)

## Speed Insights

You can see data about your project's [Core Web Vitals](/docs/speed-insights/metrics#core-web-vitals-explained) performance in your dashboard on Vercel. Doing so will allow you to track your web application's loading speed, responsiveness, and visual stability so you can improve the overall user experience.

On Vercel, you can track your Next.js app's Core Web Vitals in your project's dashboard.

### reportWebVitals

> For \['nextjs-app']:

If you're self-hosting your app, you can use the [`useWebVitals`](https://nextjs.org/docs/advanced-features/measuring-performance#build-your-own) hook to send metrics to any analytics provider. The following example demonstrates a custom `WebVitals` component that you can use in your app's root `layout` file:

```jsx filename="app/_components/web-vitals.jsx" framework=all
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric);
  });
}
```

```tsx filename="app/_components/web-vitals.tsx" framework=all
'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric);
  });
}
```

You could then reference your custom `WebVitals` component like this:

```ts filename="app/layout.ts" framework=all
import { WebVitals } from './_components/web-vitals';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

```js filename="app/layout.js" framework=all
import { WebVitals } from './_components/web-vitals';

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

> For \['nextjs']:

If you're self-hosting your app, you can use the [`reportWebVitals`](https://nextjs.org/docs/advanced-features/measuring-performance#build-your-own) hook to send metrics to any analytics provider. Doing so requires [creating your own custom `app` component file](https://nextjs.org/docs/advanced-features/custom-app).

Then you must export a `reportWebVitals` function from your custom `app` component, as demonstrated below:

```js filename="pages/_app.js" framework=all
export function reportWebVitals(metric) {
  switch (metric.name) {
    case 'FCP':
      // handle FCP results
      break;
    case 'LCP':
      // handle LCP results
      break;
    case 'CLS':
      // handle CLS results
      break;
    case 'FID':
      // handle FID results
      break;
    case 'TTFB':
      // handle TTFB results
      break;
    case 'INP':
      // handle INP results (note: INP is still an experimental metric)
      break;
    default:
      break;
  }
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

```ts filename="pages/_app.ts" framework=all
export function reportWebVitals(metric) {
  switch (metric.name) {
    case 'FCP':
      // handle FCP results
      break;
    case 'LCP':
      // handle LCP results
      break;
    case 'CLS':
      // handle CLS results
      break;
    case 'FID':
      // handle FID results
      break;
    case 'TTFB':
      // handle TTFB results
      break;
    case 'INP':
      // handle INP results (note: INP is still an experimental metric)
      break;
    default:
      break;
  }
}

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

Next.js uses [Google's `web-vitals` library](https://github.com/GoogleChrome/web-vitals#web-vitals) to measure the Web Vitals metrics available in `reportWebVitals`.

**To summarize, tracking Web Vitals with Next.js on Vercel:**

- Enables you to track traffic performance metrics, such as [First Contentful Paint](/docs/speed-insights/metrics#first-contentful-paint-fcp), or [First Input Delay](/docs/speed-insights/metrics#first-input-delay-fid)
- Enables you to view performance analytics by page name and URL for more granular analysis
- Shows you [a score for your app's performance](/docs/speed-insights/metrics#how-the-scores-are-determined) on each recorded metric, which you can use to track improvements or regressions

[Learn more about Speed Insights](/docs/speed-insights)

## Service integrations

Vercel has partnered with popular service providers, such as MongoDB and Sanity, to create integrations that make using those services with Next.js easier. There are many integrations across multiple categories, such as [Commerce](/integrations#commerce), [Databases](/integrations#databases), and [Logging](/integrations#logging).

**To summarize, Integrations on Vercel:**

- Simplify the process of connecting your preferred services to a Vercel project
- Help you achieve the optimal setup for a Vercel project using your preferred service
- Configure your environment variables for you

[Learn more about Integrations](/integrations)

## More benefits

See [our Frameworks documentation page](/docs/frameworks) to learn about the benefits available to **all** frameworks when you deploy on Vercel.

## More resources

Learn more about deploying Next.js projects on Vercel with the following resources:

- [Build a fullstack Next.js app](/kb/guide/nextjs-prisma-postgres)
- [Build a multi-tenant app](/docs/multi-tenant)
- [Next.js with Contenful](/kb/guide/integrating-next-js-and-contentful-for-your-headless-cms)
- [Next.js with Stripe Checkout and Typescript](/kb/guide/getting-started-with-nextjs-typescript-stripe)
- [Next.js with Magic.link](/kb/guide/add-auth-to-nextjs-with-magic)
- [Generate a sitemap with Next.js](/kb/guide/how-do-i-generate-a-sitemap-for-my-nextjs-app-on-vercel)
- [Next.js ecommerce with Shopify](/kb/guide/deploying-locally-built-nextjs)
- [Deploy a locally built Next.js app](/kb/guide/deploying-locally-built-nextjs)
- [Deploying Next.js to Vercel](https://www.youtube.com/watch?v=AiiGjB2AxqA)
- [Learn about combining static and dynamic rendering on the same page in Next.js 14](https://www.youtube.com/watch?v=wv7w_Zx-FMU)
- [Learn about suspense boundaries and streaming when loading your UI](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)


---

[View full sitemap](/docs/sitemap)
