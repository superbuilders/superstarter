---
title: Using the Node.js Runtime with Vercel Functions
product: vercel
url: /docs/functions/runtimes/node-js
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/functions/functions-api-reference?framework=other\&language=ts
  - /docs/functions/functions-api-reference
  - /docs/functions/runtimes/node-js/advanced-node-configuration
  - /docs/functions/runtimes/node-js/node-js-versions
  - /docs/package-managers
summary: Learn how to use the Node.js runtime with Vercel Functions to create functions.
---

# Using the Node.js Runtime with Vercel Functions

You can create Vercel Function in JavaScript or TypeScript by using the Node.js runtime. By default, the runtime builds and serves any function created within the `/api` directory of a project to Vercel.

[Node.js](/docs/functions/runtimes/node-js)-powered functions are suited to computationally intense or large functions and provide benefits like:

- **More RAM and CPU power**: For computationally intense workloads, or functions that have bundles up to 250 MB in size, this runtime is ideal
- **Complete Node.js compatibility**: The Node.js runtime offers access to all Node.js APIs, making it a powerful tool for many applications

## Creating a Node.js function

In order to use the Node.js runtime, create a file inside the `api` directory with a function using the [`fetch` Web Standard export](/docs/functions/functions-api-reference?framework=other\&language=ts#fetch-web-standard). No additional configuration is needed:

```ts filename="api/hello.ts"
export default {
  fetch(request: Request) {
    return new Response('Hello from Vercel!');
  },
};
```

Alternatively, you can export each HTTP method as a separate export instead of using the `fetch` Web Standard export:

```ts filename="api/hello.ts"
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

To learn more about creating Vercel Functions, see the [Functions API Reference](/docs/functions/functions-api-reference). If you need more advanced behavior, such as a custom build step or private npm modules, see the [advanced Node.js usage page](/docs/functions/runtimes/node-js/advanced-node-configuration).

> **💡 Note:** The entry point for `src` must be a glob matching `.js`, `.mjs`, or `.ts`
> files\*\* that export a default function.

## Supported APIs

Vercel Functions using the Node.js runtime support [all Node.js APIs](https://nodejs.org/docs/latest/api/), including standard Web APIs such as the [Request and Response Objects](/docs/functions/runtimes/node-js#node.js-request-and-response-objects).

## Node.js version

To learn more about the supported Node.js versions on Vercel, see [Supported Node.js Versions](/docs/functions/runtimes/node-js/node-js-versions).

## Node.js dependencies

For dependencies listed in a `package.json` file at the root of a project, the following behavior is used:

- If `bun.lock` or `bun.lockb` is present, `bun install` is executed
- If `yarn.lock` is present `yarn install` is executed
- If `pnpm-lock.yaml` is present, `pnpm install` is executed
  - See [supported package managers](/docs/package-managers#supported-package-managers) for pnpm detection details
- If `package-lock.json` is present, `npm install` is executed
- If `vlt-lock.json` is present, `vlt install` is executed
- Otherwise, `npm install` is executed

If you need to select a specific version of a package manager, see [corepack](/docs/deployments/configure-a-build#corepack).

## Using TypeScript with the Node.js runtime

The Node.js runtime supports files ending with `.ts` inside of the `/api` directory as TypeScript files to compile and serve when deploying.

An example TypeScript file that exports a Web signature handler is as follows:

```typescript filename="api/hello.ts"
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const name = url.searchParams.get('name') || 'World';

    return Response.json({ message: `Hello ${name}!` });
  },
};
```

You can use a `tsconfig.json` file at the root of your project to configure the TypeScript compiler. Most options are supported aside from ["Path Mappings"](https://www.typescriptlang.org/docs/handbook/module-resolution.html#path-mapping) and ["Project References"](https://www.typescriptlang.org/docs/handbook/project-references.html).

## Node.js request and response objects

Each request to a Node.js Vercel Function gives access to Request and Response objects. These objects are the [standard](https://nodejs.org/api/http.html#http_event_request) HTTP [Request](https://nodejs.org/api/http.html#http_class_http_incomingmessage) and [Response](https://nodejs.org/api/http.html#http_class_http_serverresponse) objects from Node.js.

### Node.js helpers

Vercel additionally provides helper methods inside of the Request and Response objects passed to Node.js Vercel Functions. These methods are:

| method                                                  | description                                                                                                                                                                                         | object   |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `request.query`                                         | An object containing the request's [query string](https://en.wikipedia.org/wiki/Query_string), or `{}` if the request does not have a query string.                                                 | Request  |
| `request.cookies`                                       | An object containing the cookies sent by the request, or `{}` if the request contains no cookies.                                                                                                   | Request  |
| [`request.body`](#node.js-request-and-response-objects) | An object containing the body sent by the request, or `null` if no body is sent.                                                                                                                    | Request  |
| `response.status(code)`                                 | A function to set the status code sent with the response where `code` must be a valid [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes). Returns `response` for chaining. | Response |
| `response.send(body)`                                   | A function to set the content of the response where `body` can be a `string`, an `object` or a `Buffer`.                                                                                            | Response |
| `response.json(obj)`                                    | A function to send a JSON response where `obj` is the JSON object to send.                                                                                                                          | Response |
| `response.redirect(url)`                                | A function to redirect to the URL derived from the specified path with status code "307 Temporary Redirect".                                                                                        | Response |
| `response.redirect(statusCode, url)`                    | A function to redirect to the URL derived from the specified path, with specified [HTTP status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes).                                      | Response |

The following Node.js Vercel Function example showcases the use of `request.query`, `request.cookies` and `request.body` helpers:

```javascript filename="api/hello.ts"
import { VercelRequest, VercelResponse } from "@vercel/node";

module.exports = (request: VercelRequest, response: VercelResponse) => {
  let who = 'anonymous';

  if (request.body && request.body.who) {
    who = request.body.who;
  } else if (request.query.who) {
    who = request.query.who;
  } else if (request.cookies.who) {
    who = request.cookies.who;
  }

  response.status(200).send(`Hello ${who}!`);
};
```

*Example Node.js Vercel Function using the \`request.query\`, \`request.cookies\`,
and \`request.body\` helpers. It returns greetings for the user specified using
\`request.send()\`.*

> **💡 Note:** If needed, you can opt-out of Vercel providing `helpers` using [advanced
> configuration](#disabling-helpers-for-node.js).

### Request body

We populate the `request.body` property with a parsed version of the content sent with the request when possible.

We follow a set of rules on the `Content-type` header sent by the request to do so:

| `Content-Type` header               | Value of `request.body`                                                                 |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| No header                           | `undefined`                                                                             |
| `application/json`                  | An object representing the parsed JSON sent by the request.                             |
| `application/x-www-form-urlencoded` | An object representing the parsed data sent by with the request.                        |
| `text/plain`                        | A string containing the text sent by the request.                                       |
| `application/octet-stream`          | A [Buffer](https://nodejs.org/api/buffer.html) containing the data sent by the request. |

With the `request.body` helper, you can build applications without extra dependencies or having to parse the content of the request manually.

> **💡 Note:** The `request.body` helper is set using a [JavaScript
> getter](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Functions/get).
> In turn, it is only computed when it is accessed.

When the request body contains malformed JSON, accessing `request.body` will throw an error. You can catch that error by wrapping `request.body` with [`try...catch`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Statements/try...catch):

```javascript filename="api/hello.ts"
try {
  request.body;
} catch (error) {
  return response.status(400).json({ error: 'My custom 400 error' });
}
```

*Catching the error thrown by \`request.body\` with
\`try...catch\`.*

### Cancelled Requests

Request cancellation must be enabled on a per-route basis. See [Functions API Reference](/docs/functions/functions-api-reference#cancel-requests) for more information.

You can listen for the `error` event on the request object to detect request cancellation:

```typescript filename="api/cancel.ts" {5-8}
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (request: VercelRequest, response: VercelResponse) => {
  let cancelled = false;
  request.on('error', (error) => {
    if (error.message === 'aborted') {
      console.log('request aborted');
    }
    cancelled = true;
  });

  response.writeHead(200);

  for (let i = 1; i < 5; i++) {
    if (cancelled) {
      // the response must be explicitly ended
      response.end();
      return;
    }

    response.write(`Count: ${i}\n`);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  response.end('All done!');
};
```

## Using Express with Vercel

Express.js is a popular framework used with Node.js. For information on how to use Express with Vercel, see the guide: [Using Express.js with Vercel](/kb/guide/using-express-with-vercel).

## Using Node.js with middleware

The Node.js runtime can be used as an experimental feature to run middleware. To enable, add the flag to your `next.config.ts` file:

```ts filename="next.config.ts" framework=all
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    nodeMiddleware: true,
  },
};

export default nextConfig;
```

```js filename="next.config.ts" framework=all
const nextConfig = {
  experimental: {
    nodeMiddleware: true,
  },
};

export default nextConfig;
```

Then in your middleware file, set the runtime to `nodejs` in the `config` object:

```js {3} filename="middleware.ts" framework=all
export const config = {
  matcher: '/about/:path*',
  runtime: 'nodejs',
};
```

```ts {3} filename="middleware.ts" framework=all
export const config = {
  matcher: '/about/:path*',
  runtime: 'nodejs',
};
```

> **💡 Note:** Running middleware on the Node.js runtime incurs charges under [Vercel
> Functions pricing](/docs/functions/usage-and-pricing#pricing). These functions
> only run using [Fluid compute](/docs/fluid-compute#fluid-compute).


---

[View full sitemap](/docs/sitemap)
