---
title: Redacting Sensitive Data from Web Analytics Events
product: vercel
url: /docs/analytics/redacting-sensitive-data
type: how-to
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/package
summary: Learn how to redact sensitive data from your Web Analytics events.
---

# Redacting Sensitive Data from Web Analytics Events

Sometimes, URLs and query parameters may contain sensitive data. This could be a user ID, a token, an order ID, or any other data that you don't want to be sent to Vercel. In this case, you may not want them to be tracked automatically.

To prevent sensitive data from being sent to Vercel, you can pass in the `beforeSend` function that modifies the event before it is sent. To learn more about the `beforeSend` function and how it can be used with other frameworks, see the [@vercel/analytics](/docs/analytics/package) package documentation.

## Ignoring events or routes

To ignore an event or route, you can return `null` from the `beforeSend` function. Returning the event or a modified version of it will track it normally.

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

## Removing query parameters

To apply changes to the event, you can parse the URL and adjust it to your needs before you return the modified event.

In this example the query parameter `secret` is removed on all events.

```js filename="pages/_app.jsx" framework=nextjs
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event) => {
          const url = new URL(event.url);
          url.searchParams.delete('secret');
          return {
            ...event,
            url: url.toString(),
          };
        }}
      />
    </>
  );
}

export default MyApp;
```

```ts filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event) => {
          const url = new URL(event.url);
          url.searchParams.delete('secret');
          return {
            ...event,
            url: url.toString(),
          };
        }}
      />
    </>
  );
}

export default MyApp;
```

```js filename="app/layout.jsx" framework=nextjs-app
'use client';
import { Analytics } from '@vercel/analytics/react';

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
            const url = new URL(event.url);
            url.searchParams.delete('secret');
            return {
              ...event,
              url: url.toString(),
            };
          }}
        />
      </body>
    </html>
  );
}
```

```ts filename="app/layout.tsx" framework=nextjs-app
'use client';
import { Analytics } from '@vercel/analytics/react';

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
          beforeSend={(event) => {
            const url = new URL(event.url);
            url.searchParams.delete('secret');
            return {
              ...event,
              url: url.toString(),
            };
          }}
        />
      </body>
    </html>
  );
}
```

```js filename="main.js" framework=other
import { inject } from '@vercel/analytics';

inject({
  beforeSend: (event) => {
    const url = new URL(event.url);
    url.searchParams.delete('secret');
    return {
      ...event,
      url: url.toString(),
    };
  },
});
```

```ts filename="main.ts" framework=other
import { inject } from '@vercel/analytics';

inject({
  beforeSend: (event) => {
    const url = new URL(event.url);
    url.searchParams.delete('secret');
    return {
      ...event,
      url: url.toString(),
    };
  },
});
```

```js filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    const url = new URL(event.url);
    url.searchParams.delete('secret');
    return {
      ...event,
      url: url.toString(),
    }
  });
</script>
```

```ts filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    const url = new URL(event.url);
    url.searchParams.delete('secret');
    return {
      ...event,
      url: url.toString(),
    }
  });
</script>
```

## Allowing users to opt-out of tracking

You can also use `beforeSend` to allow users to opt-out of all tracking by setting a `localStorage` value (for example `va-disable`).

```js filename="pages/_app.jsx" framework=nextjs
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event) => {
          if (localStorage.getItem('va-disable')) {
            return null;
          }
          return event;
        }}
      />
    </>
  );
}

export default MyApp;
```

```ts filename="pages/_app.tsx" framework=nextjs
import type { AppProps } from 'next/app';
import { Analytics } from '@vercel/analytics/react';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics
        beforeSend={(event) => {
          if (localStorage.getItem('va-disable')) {
            return null;
          }
          return event;
        }}
      />
    </>
  );
}

export default MyApp;
```

```js filename="app/layout.jsx" framework=nextjs-app
'use client';
import { Analytics } from '@vercel/analytics/react';

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
            if (localStorage.getItem('va-disable')) {
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

```ts filename="app/layout.tsx" framework=nextjs-app
'use client';
import { Analytics } from '@vercel/analytics/react';

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
          beforeSend={(event) => {
            if (localStorage.getItem('va-disable')) {
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

```js filename="main.js" framework=other
import { inject } from '@vercel/analytics';

inject({
  beforeSend: (event) => {
    if (localStorage.getItem('va-disable')) {
      return null;
    }
    return event;
  },
});
```

```ts filename="main.ts" framework=other
import { inject } from '@vercel/analytics';

inject({
  beforeSend: (event) => {
    if (localStorage.getItem('va-disable')) {
      return null;
    }
    return event;
  },
});
```

```js filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    if (localStorage.getItem('va-disable')) {
      return null;
    }
    return event;
  });
</script>
```

```ts filename="index.html" framework=html
<script>
  window.va = function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', (event) => {
    if (localStorage.getItem('va-disable')) {
      return null;
    }
    return event;
  });
</script>
```


---

[View full sitemap](/docs/sitemap)
