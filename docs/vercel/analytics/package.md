---
title: Advanced Web Analytics Config with @vercel/analytics
product: vercel
url: /docs/analytics/package
type: reference
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/quickstart
  - /docs/analytics/redacting-sensitive-data
summary: With the @vercel/analytics npm package, you are able to configure your application to send analytics data to Vercel.
---

# Advanced Web Analytics Config with @vercel/analytics

## Getting started

To get started with analytics, follow our [Quickstart](/docs/analytics/quickstart) guide which will walk you through the process of setting up analytics for your project.

## `mode`

Override the automatic environment detection.

> For \[
> &#x20;   'nextjs',
> &#x20;   'nextjs-app',
> &#x20;   'sveltekit',
> &#x20;   'remix',
> &#x20;   'create-react-app',
> &#x20;   'nuxt',
> &#x20;   'vue',
> &#x20;   'other',
> &#x20;   'astro',
> &#x20; ]:

This option allows you to force a specific environment for the package.
If not defined, it will use `auto` which tries to set the `development` or `production` mode based on available environment variables such as `NODE_ENV`.

If your used framework does not expose these environment variables, the automatic detection won't work correctly.
In this case, you're able to provide the correct `mode` manually or by other helpers that your framework exposes.

If you're using the `<Analytics />` component, you can pass the `mode` prop to force a specific environment:

> For \['html']:

With plain HTML, you can not configure this option.

```tsx {8} filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics mode="production" />;
    </>
  );
}

export default MyApp;
```

```jsx {7} filename="pages/_app.jsx" framework=nextjs
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics mode="production" />;
    </>
  );
}

export default MyApp;
```

```tsx {15} filename="app/layout.tsx" framework=nextjs-app
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
        <Analytics mode="production" />;
      </body>
    </html>
  );
}
```

```jsx {11} filename="app/layout.jsx" framework=nextjs-app
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics mode="production" />;
      </body>
    </html>
  );
}
```

```tsx {7} filename="App.tsx" framework=create-react-app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics mode="production" />
    </div>
  );
}
```

```jsx {7} filename="App.jsx" framework=create-react-app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics mode="production" />
    </div>
  );
}
```

```tsx {21} filename="app/root.tsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics mode="production" />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```jsx {21} filename="app/root.jsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics mode="production" />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```tsx {10} filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics mode="production"/>
	</head>
	<body>
		<slot />
  </body>
</html>
```

```jsx {10}  filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics mode="production"/>
	</head>
	<body>
		<slot />
  </body>
</html>
```

```tsx {6} filename="app.vue" framework=nuxt
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics mode="production"/>
  <NuxtPage />
</template>
```

```jsx {6} filename="app.vue" framework=nuxt
<script setup>
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics mode="production"/>
  <NuxtPage />
</template>
```

```tsx {6} filename="src/App.vue" framework=vue
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics mode="production" />
  <!-- your content -->
</template>
```

```jsx {6} filename="src/App.vue" framework=vue
<script setup>
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics mode="production" />
  <!-- your content -->
</template>
```

```ts {1, 4} filename="src/routes/+layout.ts" framework=sveltekit
import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';

injectAnalytics({ mode: dev ? 'development' : 'production' });
```

```js {1, 4} filename="src/routes/+layout.js" framework=sveltekit
import { dev } from '$app/environment';
import { injectAnalytics } from '@vercel/analytics/sveltekit';

injectAnalytics({ mode: dev ? 'development' : 'production' });
```

```ts {3, 6} filename="main.ts" framework=other
import { inject } from '@vercel/analytics';
// import some helper that is exposed by your current framework to determine the right mode manually
import { dev } from '$app/environment';

inject({
  mode: dev ? 'development' : 'production',
});
```

```js {3, 6} filename="main.js" framework=other
import { inject } from '@vercel/analytics';
// import some helper that is exposed by your current framework to determine the right mode manually
import { dev } from '$app/environment';

inject({
  mode: dev ? 'development' : 'production',
});
```

## `debug`

> For \[
> &#x20;   'nextjs',
> &#x20;   'nextjs-app',
> &#x20;   'sveltekit',
> &#x20;   'remix',
> &#x20;   'create-react-app',
> &#x20;   'nuxt',
> &#x20;   'vue',
> &#x20;   'other',
> &#x20;   'astro',
> &#x20; ]:

You'll see all analytics events in the browser's console with the debug mode.
This option is **automatically enabled** if the `NODE_ENV` environment
variable is available and either `development` or `test`.

You can manually disable it to prevent debug messages in your browsers console.

> For \[
> &#x20;   'nextjs',
> &#x20;   'nextjs-app',
> &#x20;   'sveltekit',
> &#x20;   'remix',
> &#x20;   'create-react-app',
> &#x20;   'nuxt',
> &#x20;   'vue',
> &#x20;   'other',
> &#x20;   'astro',
> &#x20; ]:

To disable the debug mode for server-side events, you need to set the
`VERCEL_WEB_ANALYTICS_DISABLE_LOGS` environment variable to `true`.

```tsx {8} filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics debug />
    </>
  );
}

export default MyApp;
```

```jsx {7} filename="pages/_app.jsx" framework=nextjs
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics debug />
    </>
  );
}

export default MyApp;
```

```tsx {15} filename="app/layout.tsx" framework=nextjs-app
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
        <Analytics debug />
      </body>
    </html>
  );
}
```

```jsx {11} filename="app/layout.jsx" framework=nextjs-app
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics debug />
      </body>
    </html>
  );
}
```

```tsx {7} filename="App.tsx" framework=create-react-app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics debug={true} />
    </div>
  );
}
```

```jsx {7} filename="App.jsx" framework=create-react-app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics debug={true} />
    </div>
  );
}
```

```tsx {21} filename="app/root.tsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics debug={true} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```jsx {21} filename="app/root.jsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics debug={true} />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```tsx {10} filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics debug="true"/>
	</head>
	<body>
		<slot />
  </body>
</html>
```

```jsx {10}  filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics debug={true}/>
	</head>
	<body>
		<slot />
  </body>
</html>
```

```tsx {6} filename="app.vue" framework=nuxt
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics debug="true"/>
  <NuxtPage />
</template>
```

```jsx {6} filename="app.vue" framework=nuxt
<script setup>
import { Analytics } from '@vercel/analytics/nuxt';
</script>

<template>
  <Analytics debug="true"/>
  <NuxtPage />
</template>
```

```tsx {6} filename="src/App.vue" framework=vue
<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics debug="true" />
  <!-- your content -->
</template>
```

```jsx {6} filename="src/App.vue" framework=vue
<script setup>
import { Analytics } from '@vercel/analytics/vue';
</script>

<template>
  <Analytics debug="true" />
  <!-- your content -->
</template>
```

```ts {3} filename="src/routes/+layout.ts" framework=sveltekit
import { injectAnalytics } from '@vercel/analytics/sveltekit';

injectAnalytics({ debug: true });
```

```js {3} filename="src/routes/+layout.js" framework=sveltekit
import { dev } from '$app/environment';

injectAnalytics({ debug: true });
```

```ts {4} filename="main.ts" framework=other
import { inject } from '@vercel/analytics';

inject({
  debug: true,
});
```

```js {4} filename="main.js" framework=other
import { inject } from '@vercel/analytics';

inject({
  debug: true,
});
```

> For \['html']:

You have to change the script URL on your `.html` files:

```ts filename="index.html" framework=html
<script defer src="https://cdn.vercel-insights.com/v1/script.debug.js"></script>
```

```js filename="index.html" framework=html
<script defer src="https://cdn.vercel-insights.com/v1/script.debug.js"></script>
```

> For \['html']:

## `beforeSend`

With the `beforeSend` option, you can modify the event data before it's sent to Vercel.
Below, you will see an example that ignores all events that have a `/private` inside the URL.

Returning `null` will ignore the event and no data will be sent.
You can also modify the URL and check our docs about [redacting sensitive data](/docs/analytics/redacting-sensitive-data).

```tsx {2, 9-14} filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event: BeforeSendEvent) => {
          if (event.url.includes('/private')) {
            return null;
          }
          return event;
        }}
      />
      ;
    </>
  );
}

export default MyApp;
```

```jsx {8-13} filename="pages/_app.jsx" framework=nextjs
import { Analytics } from '@vercel/analytics/next';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event) => {
          if (event.url.includes('/private')) {
            return null;
          }
          return event;
        }}
      />
      ;
    </>
  );
}

export default MyApp;
```

```tsx {1, 16-21} filename="app/layout.tsx" framework=nextjs-app
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/next';

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
        <Analytics
          beforeSend={(event: BeforeSendEvent) => {
            if (event.url.includes('/private')) {
              return null;
            }
            return event;
          }}
        />
      </body>
    </html>
  );
}
```

```jsx {12-17} filename="app/layout.jsx" framework=nextjs-app
import { Analytics } from '@vercel/analytics/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>Next.js</title>
      </head>
      <body>
        {children}
        <Analytics
          beforeSend={(event) => {
            if (event.url.includes('/private')) {
              return null;
            }
            return event;
          }}
        />
      </body>
    </html>
  );
}
```

```tsx {1, 8-13} filename="App.tsx" framework=create-react-app
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics
        beforeSend={(event: BeforeSendEvent) => {
          if (event.url.includes('/private')) {
            return null;
          }
          return event;
        }}
      />
    </div>
  );
}
```

```jsx {8-13} filename="App.jsx" framework=create-react-app
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <div>
      {/* ... */}
      <Analytics
        beforeSend={(event) => {
          if (event.url.includes('/private')) {
            return null;
          }
          return event;
        }}
      />
    </div>
  );
}
```

```tsx {9, 22-27} filename="app/root.tsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics
          beforeSend={(event: BeforeSendEvent) => {
            if (event.url.includes('/private')) {
              return null;
            }
            return event;
          }}
        />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```jsx {22-27} filename="app/root.jsx" framework=remix
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from '@remix-run/react';
import { Analytics } from '@vercel/analytics/remix';

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Analytics
          beforeSend={(event: BeforeSendEvent) => {
            if (event.url.includes('/private')) {
              return null;
            }
            return event;
          }}
        />
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
```

```tsx {6-13} filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<script is:inline>
  function webAnalyticsBeforeSend(event){
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  }
</script>

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics />
	</head>
	<body>
		<slot />
  </body>
</html>
```

```jsx {6-13} filename="src/layouts/Base.astro" framework=astro
---
import Analytics from '@vercel/analytics/astro';
{/* ... */}
---

<script is:inline>
  function webAnalyticsBeforeSend(event){
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  }
</script>

<html lang="en">
	<head>
    <meta charset="utf-8" />
    <!-- ... -->
    <Analytics />
	</head>
	<body>
		<slot />
  </body>
</html>
```

```ts {2, 4-9, 13} filename="app.vue" framework=nuxt
<script setup lang="ts">
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/nuxt';

const beforeSend = (event: BeforeSendEvent) => {
  if (event.url.includes('/private')) {
    return null;
  }
  return event
};
</script>

<template>
  <Analytics :before-send="beforeSend"/>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
```

```js {4-9, 13} filename="app.vue" framework=nuxt
<script setup>
import { Analytics } from '@vercel/analytics/nuxt';

const beforeSend = (event) => {
  if (event.url.includes('/private')) {
    return null;
  }
  return event
};
</script>

<template>
  <Analytics :before-send="beforeSend"/>
  <NuxtPage />
</template>
```

```tsx {2, 4-9, 13} filename="src/App.vue" framework=vue
<script setup lang="ts">
import { Analytics, type BeforeSendEvent } from '@vercel/analytics/nuxt';

const beforeSend = (event: BeforeSendEvent) => {
  if (event.url.includes('/private')) {
    return null;
  }
  return event
};
</script>

<template>
  <Analytics :before-send="beforeSend"/>
  <!-- your content -->
</template>
```

```jsx {4-9, 13} filename="src/App.vue" framework=vue
<script setup>
import { Analytics } from '@vercel/analytics/nuxt';

const beforeSend = (event) => {
  if (event.url.includes('/private')) {
    return null;
  }
  return event
};
</script>

<template>
  <Analytics :before-send="beforeSend"/>
  <!-- your content -->
</template>
```

```ts {3, 7-12} filename="src/routes/+layout.ts" framework=sveltekit
import {
  injectAnalytics,
  type BeforeSendEvent,
} from '@vercel/analytics/sveltekit';

injectAnalytics({
  beforeSend(event: BeforeSendEvent) {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  },
});
```

```js {4-9} filename="src/routes/+layout.js" framework=sveltekit
import { injectAnalytics } from '@vercel/analytics/sveltekit';

injectAnalytics({
  beforeSend(event) {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  },
});
```

```ts {1, 4-9} filename="main.ts" framework=other
import { inject, type BeforeSendEvent } from '@vercel/analytics';

inject({
  beforeSend: (event: BeforeSendEvent) => {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  },
});
```

```js {4-9} filename="main.js" framework=other
import { inject } from '@vercel/analytics';

inject({
  beforeSend: (event) => {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  },
});
```

```ts {5-10} filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  });
</script>
```

```js {5-10} filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    if (event.url.includes('/private')) {
      return null;
    }
    return event;
  });
</script>
```

## `endpoint`

The `endpoint` option allows you to report the collected analytics to a different url than the default: `https://yourdomain.com/_vercel/insights`.

This is useful when deploying several projects under the same domain, as it allows you to keep each application isolated.

For example, when `yourdomain.com` is managed outside of Vercel:

1. "alice-app" is deployed under `yourdomain.com/alice/*`, vercel alias is `alice-app.vercel.sh`
2. "bob-app" is deployed under `yourdomain.com/bob/*`, vercel alias is `bob-app.vercel.sh`
3. `yourdomain.com/_vercel/*` is routed to `alice-app.vercel.sh`

Both applications are sending their analytics to `alice-app.vercel.sh`. To restore the isolation, "bob-app" should use:

```tsx
<Analytics endpoint="https://bob-app.vercel.sh/_vercel/insights" />
```

## `scriptSrc`

The `scriptSrc` option allows you to load the Web Analytics script from a different URL than the default one.

```tsx
<Analytics scriptSrc="https://bob-app.vercel.sh/_vercel/insights/script.js" />
```


---

[View full sitemap](/docs/sitemap)
