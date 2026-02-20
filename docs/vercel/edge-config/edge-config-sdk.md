---
title: @vercel/edge-config
product: vercel
url: /docs/edge-config/edge-config-sdk
type: reference
prerequisites:
  - /docs/edge-config
related:
  - /docs/functions/runtimes/edge
  - /docs/edge-config/vercel-api
  - /docs/edge-config/edge-config-dashboard
  - /docs/edge-config/using-edge-config
  - /docs/rest-api
summary: The Edge Config client SDK is the most ergonomic way to read data from Edge Configs. Learn how to set up the SDK so you can start reading Edge...
---

# @vercel/edge-config

The [Edge Config](/edge-config) client SDK is the most ergonomic way to read data from Edge Configs. It provides several helper methods for reading values from one or multiple Edge Configs, and is compatible with Node.js, [the Edge Runtime](/docs/functions/runtimes/edge), and the browser.

It does not have functionality for *creating* new Edge Configs and *writing* to existing Edge Configs, which can be done [using the Vercel REST API](/docs/edge-config/vercel-api) or the [Dashboard](/docs/edge-config/edge-config-dashboard).

You can also [read Edge Config data with the Vercel REST API](/docs/edge-config/vercel-api#read-all-items). Review [Reading from an Edge Config](/docs/edge-config/using-edge-config#reading-data-from-edge-configs) to understand when to use the SDK versus the Vercel REST API.

## Requirements

Before you can start using the SDK, you need to have done the following:

- Created an Edge Config, which can be done using the [API](/docs/edge-config/vercel-api#create-an-edge-config) or the [Dashboard](/docs/edge-config/edge-config-dashboard#creating-an-edge-config)
- Added [an Edge Config read access token](/docs/edge-config/using-edge-config#creating-a-read-access-token) to access your Edge Config
- Defined [a connection string](/docs/edge-config/using-edge-config#using-a-connection-string) with the Edge Config read access token and Edge Config id and stored it as an environment variable

## Setting up the SDK

To get started, install the SDK:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/edge-config
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/edge-config
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/edge-config
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/edge-config
    ```
  </Code>
</CodeBlock>

## Use connection strings

Use connection strings to connect your Edge Config to one or more projects. This allows Vercel to optimize your reads when you read the Edge Config through the SDK. You can learn how to create a connection string [here](/docs/edge-config/using-edge-config#using-a-connection-string).

By default, the SDK will run all helper methods using the connection string stored in the `EDGE_CONFIG` environment variable. That means, if you have the `EDGE_CONFIG` environment variable set in your project, you can import any of the helper methods and use them like so:

```typescript filename="example.ts"
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

const configItems = await getAll();
```

However, you can store your connection string as **any** environment variable, and even connect to multiple Edge Configs by storing more than one connection string in your environment variables.

To do so, you must use the `createClient` helper.

The `createClient` helper method takes a connection string and returns an object that lets you use helper methods on the associated Edge Config. Using `createClient`, you can store multiple Edge Configs as environment variables and read data from all of them.

```typescript filename="example.ts
import { createClient } from '@vercel/edge-config';

// Fetch a single value from one config
const firstConfig = createClient(process.env.FIRST_EDGE_CONFIG);
const firstExampleValue1 = await firstConfig.get('other_example_key_1');

// Fetch all values from another config
const secondConfig = createClient(process.env.SECOND_EDGE_CONFIG);
const allValues = await secondConfig.getAll();
```

The following sections will teach you how to use all of the SDK's helper methods.

## Read a single value

The `get` helper method allows you to fetch a value at a given key in your Edge Config.

```ts filename="app/api/get-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return NextResponse.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

```js filename="app/api/get-example/route.js" framework=nextjs
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return NextResponse.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

```ts filename="api/get-example.ts" framework=other
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return Response.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

```js filename="api/get-example.js" framework=other
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return Response.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

```ts filename="app/api/get-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return NextResponse.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

```js filename="app/api/get-example/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { get } from '@vercel/edge-config';

export async function GET() {
  const val = await get('key');

  return NextResponse.json({
    label: `Value of "key" in my Edge Config.`,
    value: val,
  });
}
```

## Read multiple values

The `getAll` helper method returns all of your Edge Config's items.

```ts filename="app/api/getall-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return NextResponse.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

```js filename="app/api/getall-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return NextResponse.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

```ts filename="app/api/getall-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return NextResponse.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

```js filename="app/api/getall-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return NextResponse.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

```ts filename="api/getall-example.ts" framework=other
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return Response.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

```js filename="api/getall-example.js" framework=other
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const configItems = await getAll();

  return Response.json({
    label: `These are all the values in my Edge Config.`,
    value: configItems,
  });
}
```

Passing an array of key names causes `getAll` to return only the specified keys.

```ts filename="app/api/getall-keys-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return NextResponse.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

```js filename="app/api/getall-keys-example/route.js" framework=nextjs
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return NextResponse.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

```ts filename="app/api/getall-keys-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return NextResponse.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

```js filename="app/api/getall-keys-example/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return NextResponse.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

```ts filename="api/getall-keys-example.ts" framework=other
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return Response.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

```js filename="api/getall-keys-example.js" framework=other
import { getAll } from '@vercel/edge-config';

export async function GET() {
  const someItems = await getAll(['keyA', 'keyB']);

  return Response.json({
    label: `These are a few values in my Edge Config.`,
    value: someItems,
  });
}
```

## Check if a key exists

The `has` helper method lets you verify if a key exists in your Edge Config. It returns `true` if the key does, and `false` if it doesn't.

```ts filename="app/api/has-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return NextResponse.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

```js filename="app/api/has-example/route.js" framework=nextjs
import { NextResponse } from 'next/server';
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return NextResponse.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

```ts filename="app/api/has-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return NextResponse.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

```js filename="app/api/has-example/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return NextResponse.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

```ts filename="api/has-example.ts" framework=other
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return Response.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

```js filename="api/has-example.js" framework=other
import { has } from '@vercel/edge-config';

export async function GET() {
  const exists = await has('key');

  return Response.json({
    keyExists: exists ? `The key exists!` : `The key doesn't exist!`,
  });
}
```

## Check the Edge Config version

Every Edge Config has a hash string associated with it, which is updated whenever the Config is updated. Checking this digest can help you verify whether your Edge Config has properly updated, and confirm which version of the Config you're working with.

The `digest` helper method lets you check the version of the Edge Config you're reading.

```ts filename="app/api/digest-example/route.ts" framework=nextjs
import { NextResponse } from 'next/server';
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return NextResponse.json({
    digest: version,
  });
}
```

```js filename="app/api/digest-example/route.js" framework=nextjs
import { NextResponse } from 'next/server';
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return NextResponse.json({
    digest: version,
  });
}
```

```ts filename="app/api/digest-example/route.ts" framework=nextjs-app
import { NextResponse } from 'next/server';
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return NextResponse.json({
    digest: version,
  });
}
```

```js filename="app/api/digest-example/route.js" framework=nextjs-app
import { NextResponse } from 'next/server';
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return NextResponse.json({
    digest: version,
  });
}
```

```ts filename="api/digest-example.ts" framework=other
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return Response.json({
    digest: version,
  });
}
```

```js filename="api/digest-example.js" framework=other
import { digest } from '@vercel/edge-config';

export async function GET() {
  const version = await digest();

  return Response.json({
    digest: version,
  });
}
```

The digest's creation may change, so it is not documented. A matching digest indicates that the Edge Config content remains unchanged, while a different digest suggests changes but does not guarantee them.

## Writing Edge Config Items

You cannot write to Edge Config items using the Edge Config SDK. Instead, you can programmatically write using the [Vercel REST API](/docs/edge-config/vercel-api#update-your-edge-config-items).

The Edge Config SDK is designed to read from our `edge-config.vercel.com` endpoint using read only tokens to authenticate reads, while writing requires [Vercel Access Tokens to authenticate with the Vercel REST API](/docs/rest-api#authentication). This core distinction makes it impractical to use the SDK for writes.

If your project requires frequent writes, you should consider using a [Redis database from the Vercel Marketplace](/marketplace?category=storage\&search=redis), such as [Upstash Redis](https://vercel.com/marketplace/upstash).

## Errors

All helper methods throw errors when:

- Your Edge Config read access token is invalid
- The Edge Config you're reading from doesn't exists
- A network error occurs

## Up Next


---

[View full sitemap](/docs/sitemap)
