---
title: Tracking custom events
product: vercel
url: /docs/analytics/custom-events
type: how-to
prerequisites:
  - /docs/analytics
related:
  - /docs/analytics/quickstart
  - /docs/analytics/limits-and-pricing
summary: Learn how to send custom analytics events from your application.
---

# Tracking custom events

> **🔒 Permissions Required**: Custom Events

Vercel Web Analytics allows you to track custom events in your application using the `track()` function.
This is useful for tracking user interactions, such as button clicks, form submissions, or purchases.

> **💡 Note:** Make sure you have `@vercel/analytics` version 1.1.0 or later
> [installed](/docs/analytics/quickstart#add-@vercel/analytics-to-your-project).

## Tracking a client-side event

> For \['nextjs', 'nextjs-app', 'sveltekit', 'nuxt', 'remix', 'other']:

To track an event:

1. Make sure you have `@vercel/analytics` version 1.1.0 or later [installed](/docs/analytics/quickstart#add-@vercel/analytics-to-your-project).
2. Import `{ track }` from `@vercel/analytics`.
3. In most cases you will want to track an event when a user performs an action, such as clicking a button or submitting a form, so you should use this on the button handler.
4. Call `track` and pass in a string representing the event name as the first argument. You can also pass [custom data](#tracking-an-event-with-custom-data) as the second argument:

   ```ts filename="component.ts"
   import { track } from '@vercel/analytics';

   // Call this function when a user clicks a button or performs an action you want to track
   track('Signup');
   ```

> For \['html']:

1. Add the following snippet before the script tag in your HTML file:

   ```html filename="index.html"
   <script>
     window.va =
       window.va ||
       function () {
         (window.vaq = window.vaq || []).push(arguments);
       };
   </script>
   {/* Place it above this script tag when already added */}
   <script defer src="/_vercel/insights/script.js"></script>
   ```

2. In most cases you will want to track an event when a user performs an action, such as clicking a button or submitting a form, so you should use this on the button handler. Send an event with the name of the event you want to track as the first argument. You can also send [custom data](#tracking-an-event-with-custom-data) by using the `data` property with key-value pairs as the second argument:
   ```html filename="index.html"
   va('event', { name: 'Signup' });
   ```
   For example, if you have a button that says **Sign Up**, you can track an event when the user clicks the button:

```html filename="index.html"
<div>
  <button onclick="va('event', { name: 'Signup' })">Sign Up</button>
</div>
```

*This will track an event named Signup.*

> For \['nextjs', 'nextjs-app', 'sveltekit', 'nuxt', 'remix']:

For example, if you have a button that says **Sign Up**, you can track an event when the user clicks the button:

```ts filename="components/button.tsx" {6,7} framework=nextjs
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```js filename="components/button.jsx" {6,7}framework=nextjs
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```ts filename="components/button.tsx" {6,7}framework=nextjs-app
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```js filename="components/button.jsx" {6,7}framework=nextjs-app
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```ts filename="components/button.tsx" {6,7} framework=remix
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```js filename="components/button.jsx" {6,7} framework=remix
import { track } from '@vercel/analytics';

function SignupButton() {
  return (
    <button
      onClick={() => {
        track('Signup');
        // ... other logic
      }}
    >
      Sign Up
    </button>
  );
}
```

```ts filename="App.svelte" {2,3}framework=sveltekit
<script>
  function handleClick() {
    track('Signup');
    // ... other logic
  }
</script>

<button on:click|once="{handleClick}">Signup</button>
```

```js filename="App.svelte" {2,3} framework=sveltekit
<script>
  function handleClick() {
    track('Signup');
    // ... other logic
  }
</script>

<button on:click|once="{handleClick}">Signup</button>
```

```ts filename="App.vue" {5} framework=nuxt
<script>
  export default {
    methods: {
      signup(event) {
        track('Signup');
        // ... other logic
      },
    },
  };
</script>

<template>
  <button @click="signup">Sign up</button>
</template>
```

```js filename="App.vue" {5} framework=nuxt
<script>
  export default {
    methods: {
      signup(event) {
        track('Signup');
        // ... other logic
      },
    },
  };
</script>

<template>
  <button @click="signup">Sign up</button>
</template>
```

## Tracking an event with custom data

> For \['nextjs', 'nextjs-app', 'sveltekit', 'nuxt', 'remix', 'other']:

You can also pass custom data along with an event. To do so, pass an object
with key-value pairs as the second argument to `track()`:

> For \['html']:

You can also pass custom data along with an event. To do so, pass a `data`
property with key-value pairs as the second argument to `va()`:

```ts filename="component.ts" framework=nextjs
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=nextjs
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```ts filename="component.ts" framework=nextjs-app
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=nextjs-app
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```ts filename="component.ts"  framework=remix
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=remix
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```ts filename="component.ts"  framework=sveltekit
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=sveltekit
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```ts filename="component.ts"  framework=nuxt
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=nuxt
track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

> For \['html']:

```html filename="index.html"
<script>
  va('event', { name: 'Signup', data: { location: 'footer' } });
  va('event', {
    name: 'Purchase',
    data: { productName: 'Shoes', price: 49.99 },
  });
</script>
```

```ts filename="component.ts"  framework=other
import { track } from '@vercel/analytics';

track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

```js filename="component.js"  framework=other
import { track } from '@vercel/analytics';

track('Signup', { location: 'footer' });
track('Purchase', { productName: 'Shoes', price: 49.99 });
```

*This tracks a "Signup" event that occurred in the "footer" location. The
second event tracks a "Purchase" event with product name and a price.*

> For \['nextjs', 'nextjs-app', 'sveltekit', 'nuxt', 'remix']:

## Tracking a server-side event

In scenarios such as when a user signs up or makes a purchase, it's more useful to track an event on the server-side. For this, you can use the `track` function on API routes or server actions.

To set up server-side events:

1. Make sure you have `@vercel/analytics` version 1.1.0 or later [installed](/docs/analytics/quickstart#add-@vercel/analytics-to-your-project).
2. Import `{ track }` from `@vercel/analytics/server`.
3. Use the `track` function in your API routes or server actions.
4. Pass in a string representing the event name as the first argument to the `track` function. You can also pass [custom data](#tracking-an-event-with-custom-data) as the second argument.

For example, if you want to track a purchase event:

```ts filename="pages/api/purchase.ts" {8} framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import { track } from '@vercel/analytics/server';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```js filename="pages/api/purchase.js" {4} framework=nextjs
import { track } from '@vercel/analytics/server';

export default async function handler(req, res) {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```ts filename="app/actions.ts" {5}framework=nextjs-app
'use server';
import { track } from '@vercel/analytics/server';

export async function purchase() {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```js filename="app/actions.js" {5} framework=nextjs-app
'use server';
import { track } from '@vercel/analytics/server';

export async function purchase() {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```ts filename="app/routes/purchase.tsx" {4-6} framework=remix
import { track } from '@vercel/analytics/server';

export async function action() {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```js filename="app/routes/purchase.jsx" {4-6} framework=remix
import { track } from '@vercel/analytics/server';

export async function action() {
  await track('Item purchased', {
    quantity: 1,
  });
}
```

```ts filename="routes/+page.server.js" {6-8} framework=sveltekit
import { track } from '@vercel/analytics/server';

/** @type {import('./$types').Actions} */
export const actions = {
  default: async () => {
    await track('Item purchased', {
      quantity: 1,
    });
  },
};
```

```js filename="routes/+page.server.js" {6-8} framework=sveltekit
import { track } from '@vercel/analytics/server';

/** @type {import('./$types').Actions} */
export const actions = {
  default: async () => {
    await track('Item purchased', {
      quantity: 1,
    });
  },
};
```

```ts filename="server/api/event.ts" {4-6} framework=nuxt
import { track } from '@vercel/analytics/server';

export default defineEventHandler(async () => {
  await track('Item purchased', {
    quantity: 1,
  });
});
```

```js filename="server/api/event.js" {4-6} framework=nuxt
import { track } from '@vercel/analytics/server';

export default defineEventHandler(async () => {
  await track('Item purchased', {
    quantity: 1,
  });
});
```

## Limitations

The following limitations apply to custom data:

- The number of custom data properties you can pass is limited based on your [plan](/docs/analytics/limits-and-pricing).
- Nested objects are not supported.
- Allowed values are `strings`, `numbers`, `booleans`, and `null`.
- You cannot set event name, key, or values to longer than 255 characters each.

## Tracking custom events in the dashboard

Once you have tracked an event, you can view and filter for it in the dashboard. To view your events:

1. Go to your [dashboard](/dashboard), select your project, and click the **Analytics** tab.
2. From the **Web Analytics** page, scroll to the **Events** panel.
3. The events panel displays a list of all the event names that you have created in your project. Select the event name to drill down into the event data.
4. The event details page displays a list, organized by custom data properties, of all the events that have been tracked.


---

[View full sitemap](/docs/sitemap)
