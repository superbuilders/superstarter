---
title: @vercel/functions API Reference (Node.js)
product: vercel
url: /docs/functions/functions-api-reference/vercel-functions-package
type: reference
prerequisites:
  - /docs/functions/functions-api-reference
  - /docs/functions
related:
  - /docs/functions/runtimes/edge
  - /docs/environment-variables/system-environment-variables
  - /docs/cdn-cache/purge
  - /docs/incremental-static-regeneration
  - /docs/pricing/regional-pricing
summary: Learn about available APIs when working with Vercel Functions.
---

# @vercel/functions API Reference (Node.js)

## Install and use the package

1. Install the `@vercel/functions` package:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/functions
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/functions
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/functions
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/functions
    ```
  </Code>
</CodeBlock>

2. Import the `@vercel/functions` package (non-Next.js frameworks or Next.js versions below 15.1):

```ts {1} filename="api/hello.ts" framework=other
import { waitUntil, attachDatabasePool } from '@vercel/functions';

export default {
  fetch(request: Request) {
    // ...
  },
};
```

```js {1} filename="api/hello.js" framework=other
import { waitUntil, attachDatabasePool } from '@vercel/functions';

export default {
  fetch(request) {
    // ...
  },
};
```

For [OIDC](/docs/functions/functions-api-reference/vercel-functions-package#oidc-methods) methods, import `@vercel/oidc`

## Usage with Next.js

If you’re using **Next.js 15.1 or above**, we recommend using the built-in [`after()`](https://nextjs.org/docs/app/api-reference/functions/after) function from `next/server` **instead** of `waitUntil()`.

`after()` allows you to schedule work that runs **after** the response has been sent or the prerender has completed. This is especially useful to avoid blocking rendering for side effects such as logging, analytics, or other background tasks.

```ts v0="build" filename="app/api/hello/route.ts"
import { after } from 'next/server';

export async function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country') || 'unknown';

  // Returns a response immediately
  const response = new Response(`You're visiting from ${country}`);

  // Schedule a side-effect after the response is sent
  after(async () => {
    // For example, log or increment analytics in the background
    await fetch(
      `https://my-analytics-service.example.com/log?country=${country}`,
    );
  });

  return response;
}
```

- `after()` does **not** block the response. The callback runs once rendering or the response is finished.
- `after()` is not a [Dynamic API](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-apis); calling it does not cause a route to become dynamic.
- If you need to configure or extend the timeout for tasks, you can use [`maxDuration`](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration) in Next.js.
- For more usage examples (including in **Server Components**, **Server Actions**, or **Middleware**), see [after() in the Next.js docs](https://nextjs.org/docs/app/api-reference/functions/after).

## Helper methods (non-Next.js usage or older Next.js versions)

If you're **not** using Next.js 15.1 or above (or you are using other frameworks), you can use the methods from `@vercel/functions` below.

### `waitUntil`

**Description**: Extends the lifetime of the request handler for the lifetime of the given Promise. The `waitUntil()` method enqueues an asynchronous task to be performed during the lifecycle of the request. You can use it for anything that can be done after the response is sent, such as logging, sending analytics, or updating a cache, without blocking the response. `waitUntil()` is available in Node.js and in the [Edge Runtime](/docs/functions/runtimes/edge).

Promises passed to `waitUntil()` will have the same timeout as the function itself. If the function times out, the promises will be cancelled.

| Name      | Type                                                                                                  | Description              |
| :-------- | :---------------------------------------------------------------------------------------------------- | :----------------------- |
| `promise` | [`Promise`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) | The promise to wait for. |

> **💡 Note:** If you're using Next.js 15.1 or above, use [`after()`](#using-after-in-nextjs)
> from `next/server` instead. Otherwise, see below.

```ts v0="build" {1,9} filename="api/hello.ts"
import { waitUntil } from '@vercel/functions';

async function getBlog() {
  const res = await fetch('https://my-analytics-service.example.com/blog/1');
  return res.json();
}

export default {
  fetch(request: Request) {
    waitUntil(getBlog().then((json) => console.log({ json })));
    return new Response(`Hello from ${request.url}, I'm a Vercel Function!`);
  },
};
```

### `getEnv`

**Description**: Gets the [System Environment Variables](/docs/environment-variables/system-environment-variables#system-environment-variables) exposed by Vercel.

```ts filename="api/example.ts"
import { getEnv } from '@vercel/functions';

export default {
  fetch(request) {
    const { VERCEL_REGION } = getEnv();
    return new Response(`Hello from ${VERCEL_REGION}`);
  },
};
```

### `geolocation`

**Description**: Returns the location information for the incoming request, in the following way:

```json
{
  "city": "New York",
  "country": "US",
  "flag": "🇺🇸",
  "countryRegion": "NY",
  "region": "iad1",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "postalCode": "10001"
}
```

| Name      | Type                                                                  | Description                                       |
| :-------- | :-------------------------------------------------------------------- | :------------------------------------------------ |
| `request` | [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) | The incoming request object which provides the IP |

```ts filename="api/example.ts"
import { geolocation } from '@vercel/functions';

export default {
  fetch(request) {
    const details = geolocation(request);
    return Response.json(details);
  },
};
```

### `ipAddress`

**Description**: Returns the IP address of the request from the headers.

| Name      | Type                                                                  | Description                                       |
| :-------- | :-------------------------------------------------------------------- | :------------------------------------------------ |
| `request` | [`Request`](https://developer.mozilla.org/en-US/docs/Web/API/Request) | The incoming request object which provides the IP |

```ts filename="api/example.ts"
import { ipAddress } from '@vercel/functions';

export default {
  fetch(request) {
    const ip = ipAddress(request);
    return new Response(`Your ip is ${ip}`);
  },
};
```

### `invalidateByTag`

**Description**: Marks a cache tag as stale, causing cache entries associated with that tag to be revalidated in the background on the next request.

| Name  | Type                   | Description                                     |
| :---- | :--------------------- | :---------------------------------------------- |
| `tag` | `string` or `string[]` | The cache tag (or multiple tags) to invalidate. |

```ts filename="api/example.ts"
import { invalidateByTag } from '@vercel/functions';

export default {
  async fetch(request) {
    await invalidateByTag('my-tag-name');
    return new Response('Success');
  },
};
```

### `dangerouslyDeleteByTag`

**Description**: Marks a cache tag as deleted, causing cache entries associated with that tag to be revalidated in the foreground on the next request. Use this method with caution because one tag can be associated with many paths and deleting the cache can cause many concurrent requests to the origin leading to [cache stampede problem](https://en.wikipedia.org/wiki/Cache_stampede). This method is for advanced use cases and is not recommended; prefer using `invalidateByTag` instead.

| Name      | Type                                      | Description                                                                                                                                                                                                |
| :-------- | :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tag`     | `string` or `string[]`                    | The cache tag (or multiple tags) to dangerously delete.                                                                                                                                                    |
| `options` | `{ revalidationDeadlineSeconds: number }` | The time in seconds before the delete deadline. If a request is made before the deadline, it will revalidate in the background. Otherwise it will be dangerously deleted and revalidate in the foreground. |

```ts filename="api/example.ts"
import { dangerouslyDeleteByTag } from '@vercel/functions';

export default {
  async fetch(request) {
    await dangerouslyDeleteByTag('my-tag-name', {
      revalidationDeadlineSeconds: 10,
    });
    return new Response('Success');
  },
};
```

### `invalidateBySrcImage`

**Description**: Marks all cached content associated with a source image as stale, causing those cache entries to be revalidated in the background on the next request. This invalidates all cached transformations of the source image.

Learn more about [purging Vercel CDN cache](/docs/cdn-cache/purge).

| Name       | Type     | Description                     |
| :--------- | :------- | :------------------------------ |
| `srcImage` | `string` | The source image to invalidate. |

```ts filename="api/example.ts"
import { invalidateBySrcImage } from '@vercel/functions';

export default {
  async fetch(request) {
    await invalidateBySrcImage('/api/avatar/1');
    return new Response('Success');
  },
};
```

### `dangerouslyDeleteBySrcImage`

**Description**: Marks all cached content associated with a source image as deleted, causing those cache entries to be revalidated in the foreground on the next request. Use this method with caution because deleting the cache can cause many concurrent requests to the origin leading to [cache stampede problem](https://en.wikipedia.org/wiki/Cache_stampede). This method is for advanced use cases and is not recommended; prefer using `invalidateBySrcImage` instead.

Learn more about [purging Vercel CDN cache](/docs/cdn-cache/purge).

| Name       | Type                                      | Description                                                                                                                                                                                                |
| :--------- | :---------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `srcImage` | `string`                                  | The source image to dangerously delete.                                                                                                                                                                    |
| `options`  | `{ revalidationDeadlineSeconds: number }` | The time in seconds before the delete deadline. If a request is made before the deadline, it will revalidate in the background. Otherwise it will be dangerously deleted and revalidate in the foreground. |

```ts filename="api/example.ts"
import { dangerouslyDeleteBySrcImage } from '@vercel/functions';

export default {
  async fetch(request) {
    await dangerouslyDeleteBySrcImage('/api/avatar/1', {
      revalidationDeadlineSeconds: 10,
    });
    return new Response('Success');
  },
};
```

### `addCacheTag`

**Description**: Adds one or more tags to a cached response, so that you can later invalidate the cache associated with these tag(s) using `invalidateByTag()`.

| Name  | Type                   | Description                                     |
| :---- | :--------------------- | :---------------------------------------------- |
| `tag` | `string` or `string[]` | One or more tags to add to the cached response. |

```ts filename="api/example.ts"
import { addCacheTag } from '@vercel/functions';

export default {
  async fetch(request) {
    const id = new URL(request.url).searchParams.get('id');
    const res = await fetch(`https://api.example.com/${id}`);
    const product = await res.json();
    await addCacheTag(`product-${id},products`);
    return Response.json(product, {
      headers: {
        'Vercel-CDN-Cache-Control': 'public, max-age=86400',
      },
    });
  },
};
```

> **💡 Note:** Alternatively, you can set the `Vercel-Cache-Tag` response header with a
> comma-separated list of tags instead of using `addCacheTag()`. See [cache
> tags](/docs/cdn-cache/purge#cache-tags) for more details.

#### Limits

- A cached response can have a maximum of 128 tags.
- The maximum tag length is 256 bytes (UTF-8 encoded).
- Tag names cannot contain commas.

### `getCache`

**Description**: Returns a `RuntimeCache` object that allows you to interact with the Vercel Runtime Cache in any Vercel region. Use this for storing and retrieving data across function, routing middleware, and build execution within a Vercel region.

| Name                 | Type                      | Description                                        |
| -------------------- | ------------------------- | -------------------------------------------------- |
| `keyHashFunction`    | `(key: string) => string` | Optional custom hash function for generating keys. |
| `namespace`          | `String`                  | Optional namespace to prefix cache keys.           |
| `namespaceSeparator` | `String`                  | Optional separator string for the namespace.       |

#### Specification

`RuntimeCache` provides the following methods:

| Method      | Description                                                                                                                                                                                     | Parameters                                                                                                                                                                                                |
| :---------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get`       | Retrieves a value from the Vercel Runtime Cache.                                                                                                                                                | `key: string`: The cache key                                                                                                                                                                              |
| `set`       | Stores a value in the Vercel Runtime Cache with optional `ttl` and/or `tags`. The `name` option allows a human-readable label to be associated with the cache entry for observability purposes. |  |
| `delete`    | Removes a value from the Vercel Runtime Cache by key                                                                                                                                            | `key: string`: The cache key to delete                                                                                                                                                                    |
| `expireTag` | Expires all cache entries associated with one or more tags                                                                                                                                      | `tag: string \| string[]`: Tag or array of tags to expire                                                                                                                                                 |

```ts filename="api/example.ts"
import { getCache } from '@vercel/functions';

export default {
  async fetch(request) {
    const cache = getCache();

    // Get a value from cache
    const value = await cache.get('somekey');

    if (value) {
      return new Response(JSON.stringify(value));
    }

    const res = await fetch('https://api.vercel.app/blog');
    const originValue = await res.json();

    // Set a value in cache with TTL and tags
    await cache.set('somekey', originValue, {
      ttl: 3600, // 1 hour in seconds
      tags: ['example-tag'],
    });

    return new Response(JSON.stringify(originValue));
  },
};
```

After assigning tags to your cached data, use the `expireTag` method to invalidate all cache entries associated with that tag. This operation is propagated globally across all Vercel regions within 300ms.

```ts filename="app/actions.ts"
'use server';

import { getCache } from '@vercel/functions';

export default async function action() {
  await getCache().expireTag('blog');
}
```

#### Limits and usage

The Runtime Cache is isolated per Vercel project and deployment environment (`preview` and `production`). Cached data is persisted across deployments and can be invalidated either through time-based expiration or by calling `expireTag`. However, TTL (time-to-live) and tag updates aren't reconciled between deployments. In those cases, we recommend either purging the runtime cache or modifying the cache key.

The Runtime Cache API does not have first class integration with [Incremental Static Regeneration](/docs/incremental-static-regeneration). This means that:

- Runtime Cache entry tags will not apply to ISR pages, so you cannot use expireTag to invalidate both caches.
- Runtime Cache entry TTLs will have no effect on the ISR revalidation time and
- Next.js's `revalidatePath` and `revalidateTag`API does not invalidate the Runtime Cache.

The following Runtime Cache limits apply:

- The maximum size of an item in the cache is 2 MB. Items larger than this will not be cached.
- A cached item can have a maximum of 128 tags.
- The maximum tag length is 256 bytes.

Usage of the Vercel Runtime Cache is charged, learn more about pricing in the [regional pricing docs](/docs/pricing/regional-pricing).

### Database Connection Pool Management

#### `attachDatabasePool`

Call this function right after creating a database pool to ensure proper connection
management in [Fluid Compute](/docs/fluid-compute). This function ensures that idle pool clients are
properly released before functions suspend.

Supports PostgreSQL (pg), MySQL2, MariaDB, MongoDB, Redis (ioredis), Cassandra (cassandra-driver), and other compatible pool types.

| Name     | Type     | Description               |
| :------- | :------- | :------------------------ |
| `dbPool` | `DbPool` | The database pool object. |

```ts {8} filename="api/database.ts" framework=all
import { Pool } from 'pg';
import { attachDatabasePool } from '@vercel/functions';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

attachDatabasePool(pool);

export default {
  async fetch() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT NOW()');
      return Response.json(result.rows[0]);
    } finally {
      client.release();
    }
  },
};
```

### OIDC methods

#### `awsCredentialsProvider`

> **💡 Note:** This function has moved from @vercel/functions/oidc to
> @vercel/oidc-aws-credentials-provider. It is now deprecated from
> @vercel/functions and will be removed in a future release.

**Description**: Obtains the Vercel OIDC token and creates an AWS credential provider function that gets AWS credentials by calling the STS `AssumeRoleWithWebIdentity` API.

| Name                         | Type       | Description                                                                                                             |
| ---------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| `roleArn`                    | `string`   | ARN of the role that the caller is assuming.                                                                            |
| `clientConfig`               | `Object`   | Custom STS client configurations overriding the default ones.                                                           |
| `clientPlugins`              | `Array`    | Custom STS client middleware plugin to modify the client default behavior.                                              |
| `roleAssumerWithWebIdentity` | `Function` | A function that assumes a role with web identity and returns a promise fulfilled with credentials for the assumed role. |
| `roleSessionName`            | `string`   | An identifier for the assumed role session.                                                                             |
| `providerId`                 | `string`   | The fully qualified host component of the domain name of the identity provider.                                         |
| `policyArns`                 | `Array`    | ARNs of the IAM managed policies that you want to use as managed session policies.                                      |
| `policy`                     | `string`   | An IAM policy in JSON format that you want to use as an inline session policy.                                          |
| `durationSeconds`            | `number`   | The duration, in seconds, of the role session. Defaults to 3600 seconds.                                                |

```ts filename="api/example.ts"
import * as s3 from '@aws-sdk/client-s3';
import { awsCredentialsProvider } from '@vercel/oidc-aws-credentials-provider';

const s3Client = new s3.S3Client({
  credentials: awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN,
  }),
});
```

#### `getVercelOidcToken`

> **💡 Note:** This function has moved from @vercel/functions/oidc to @vercel/oidc. It is now
> deprecated from @vercel/functions and will be removed in a future release.

**Description**: Returns the OIDC token from the request context or the environment variable. This function first checks if the OIDC token is available in the environment variable
`VERCEL_OIDC_TOKEN`. If it is not found there, it retrieves the token from the request context headers.

```ts filename="api/example.ts"
import { ClientAssertionCredential } from '@azure/identity';
import { CosmosClient } from '@azure/cosmos';
import { getVercelOidcToken } from '@vercel/oidc';

const credentialsProvider = new ClientAssertionCredential(
  process.env.AZURE_TENANT_ID,
  process.env.AZURE_CLIENT_ID,
  getVercelOidcToken,
);

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_DB_ENDPOINT,
  aadCredentials: credentialsProvider,
});

export const GET = () => {
  const container = cosmosClient
    .database(process.env.COSMOS_DB_NAME)
    .container(process.env.COSMOS_DB_CONTAINER);
  const items = await container.items.query('SELECT * FROM f').fetchAll();
  return Response.json({ items: items.resources });
};
```


---

[View full sitemap](/docs/sitemap)
