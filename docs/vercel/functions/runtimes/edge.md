---
title: Edge Runtime
product: vercel
url: /docs/functions/runtimes/edge
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/fluid-compute
  - /docs/functions/usage-and-pricing
  - /docs/regions
  - /docs/functions/streaming-functions
  - /docs/functions/concurrency-scaling
summary: Learn about the Edge runtime, an environment in which Vercel Functions can run.
---

# Edge Runtime

> **⚠️ Warning:** We recommend migrating from edge to Node.js for improved performance and
> reliability. Both runtimes run on [Fluid compute](/docs/fluid-compute) with
> [Active CPU pricing](/docs/functions/usage-and-pricing).

To convert your Vercel Function to use the Edge runtime, add the following code to your function:

```ts {1} filename="app/api/my-function/route.ts" framework=nextjs-app
export const runtime = 'edge'; // 'nodejs' is the default

export function GET(request: Request) {
  return new Response(`I am an Vercel Function!`, {
    status: 200,
  });
}
```

```js {1} filename="app/api/my-function/route.js" framework=nextjs-app
export const runtime = 'edge'; // 'nodejs' is the default

export function GET(request) {
  return new Response(`I am an Vercel Function!`, {
    status: 200,
  });
}
```

```ts {4-6} filename="pages/api/handler.ts" framework=nextjs
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge', // 'nodejs' is the default
};

export default function handler(request: NextRequest) {
  return NextResponse.json({
    name: `I am an Vercel Function!`,
  });
}
```

```js {1-3} filename="pages/api/handler.js" framework=nextjs
export const config = {
  runtime: 'edge', // 'nodejs' is the default
};

export default function handler(request) {
  return NextResponse.json({
    name: `I am an Vercel Function!`,
  });
}
```

```ts {3-5} filename="api/runtime-example.ts" framework=other
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  runtime: 'edge', // this is a pre-requisite
};

export default function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  return response.status(200).json({ text: 'I am an Vercel Function!' });
}
```

```js {1-3} filename="api/runtime-example.js" framework=other
export const config = {
  runtime: 'edge', // this is a pre-requisite
};

export default function handler(request, response) {
  return response.status(200).json({ text: 'I am an Vercel Function!' });
}
```

> **💡 Note:** If you're not using a framework, you must either add
> `"type": "module"` to your
> `package.json` or change your JavaScript Functions'
> file extensions from `.js` to
> `.mjs`

## Region

By default, Vercel Functions using the Edge runtime execute in the region closest to the incoming request. You can set one or more preferred regions using the route segment [config](#setting-regions-in-your-function) `preferredRegion` or specify a `regions` key within a config object to set one or more regions for your functions to execute in.

### Setting regions in your function

If your function depends on a data source, you may want it to be close to that source for fast responses.

To configure which region (or multiple regions) you want your function to execute in, pass the [ID of your preferred region(s)](/docs/regions#region-list) in the following way:

```ts {5-7} filename="pages/api/regional-example.ts" framework=nextjs
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge', // this must be set to `edge`
  // execute this function on iad1 or hnd1, based on the connecting client location
  regions: ['iad1', 'hnd1'],
};

export default function handler(request: NextRequest) {
  return NextResponse.json({
    name: `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
  });
}
```

```js {2-4} filename="pages/api/regional-example.js" framework=nextjs
export const config = {
  runtime: 'edge', // this must be set to `edge`
  // execute this function on iad1 or hnd1, based on the connecting client location
  regions: ['iad1', 'hnd1'],
};

export default function handler(request) {
  return NextResponse.json({
    name: `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
  });
}
```

> For \['nextjs-app']:

The `preferredRegion` option can be used to specify a single region using a string value, or multiple regions using a string array. See the  for more information.

```ts {1-3} filename="app/api/regional-example/route.ts" framework=nextjs-app
export const runtime = 'edge'; // 'nodejs' is the default
// execute this function on iad1 or hnd1, based on the connecting client location
export const preferredRegion = ['iad1', 'hnd1'];
export const dynamic = 'force-dynamic'; // no caching

export function GET(request: Request) {
  return new Response(
    `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
    {
      status: 200,
    },
  );
}
```

```js {1-3} filename="app/api/regional-example/route.js" framework=nextjs-app
export const runtime = 'edge'; // 'nodejs' is the default
// execute this function on iad1 or hnd1, based on the connecting client location
export const preferredRegion = ['iad1', 'hnd1'];
export const dynamic = 'force-dynamic'; // no caching

export function GET(request) {
  return new Response(
    `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
    {
      status: 200,
    },
  );
}
```

```ts {2-4} filename="api/regional-example.ts" framework=other
export const config = {
  runtime: 'edge', // this must be set to `edge`
  // execute this function on iad1 or hnd1, based on the connecting client location
  regions: ['iad1', 'hnd1'],
};

export default function handler(request: Request, response: Response) {
  return response.status(200).json({
    text: `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
  });
}
```

```js {2-4} filename="api/regional-example.js" framework=other
export const config = {
  runtime: 'edge', // this must be set to `edge`
  // execute this function on iad1 or hnd1, based on the connecting client location
  regions: ['iad1', 'hnd1'],
};

export default function handler(request, response) {
  return response.status(200).json({
    text: `I am an Vercel Function! (executed on ${process.env.VERCEL_REGION})`,
  });
}
```

> **💡 Note:** If you're not using a framework, you must either add
> `"type": "module"` to your
> `package.json` or change your JavaScript Functions'
> file extensions from `.js` to
> `.mjs`

## Failover mode

In the event of regional downtime, Vercel will automatically reroute traffic to the next closest CDN region on all plans. For more information on which regions Vercel routes traffic to, see [Outage Resiliency](/docs/regions#outage-resiliency).

## Maximum duration

Vercel Functions using the Edge runtime must begin sending a response within 25 seconds to maintain streaming capabilities beyond this period, and can continue [streaming](/docs/functions/streaming-functions) data for up to 300 seconds.

## Concurrency

Vercel automatically scales your functions to handle traffic surges, ensuring optimal performance during increased loads. For more information, see [Concurrency scaling](/docs/functions/concurrency-scaling).

## Edge Runtime supported APIs

The Edge runtime is built on top of the [V8 engine](https://v8.dev/), allowing it to run in isolated execution environments that don't require a container or virtual machine.

### Supported APIs

The Edge runtime provides a subset of Web APIs such as [`fetch`](https://developer.mozilla.org/docs/Web/API/Fetch_API), [`Request`](https://developer.mozilla.org/docs/Web/API/Request), and [`Response`](https://developer.mozilla.org/docs/Web/API/Response).

The following tables list the APIs that are available in the Edge runtime.

### Network APIs

| API                                                                                      | Description                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [`fetch`](https://developer.mozilla.org/docs/Web/API/Fetch_API)                          | Fetches a resource                                                                                     |
| [`Request`](https://developer.mozilla.org/docs/Web/API/Request)                          | Represents an HTTP request                                                                             |
| [`Response`](https://developer.mozilla.org/docs/Web/API/Response)                        | Represents an HTTP response                                                                            |
| [`Headers`](https://developer.mozilla.org/docs/Web/API/Headers)                          | Represents HTTP headers                                                                                |
| [`FormData`](https://developer.mozilla.org/docs/Web/API/FormData)                        | Represents form data                                                                                   |
| [`File`](https://developer.mozilla.org/docs/Web/API/File)                                | Represents a file                                                                                      |
| [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob)                                | Represents a blob                                                                                      |
| [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)          | Represents URL search parameters                                                                       |
| [`Blob`](https://developer.mozilla.org/docs/Web/API/Blob)                                | Represents a blob                                                                                      |
| [`Event`](https://developer.mozilla.org/docs/Web/API/Event)                              | Represents an event                                                                                    |
| [`EventTarget`](https://developer.mozilla.org/docs/Web/API/EventTarget)                  | Represents an object that can handle events                                                            |
| [`PromiseRejectEvent`](https://developer.mozilla.org/docs/Web/API/PromiseRejectionEvent) | Represents an event that is sent to the global scope of a script when a JavaScript Promise is rejected |

### Encoding APIs

| API                                                                                 | Description                        |
| ----------------------------------------------------------------------------------- | ---------------------------------- |
| [`TextEncoder`](https://developer.mozilla.org/docs/Web/API/TextEncoder)             | Encodes a string into a Uint8Array |
| [`TextDecoder`](https://developer.mozilla.org/docs/Web/API/TextDecoder)             | Decodes a Uint8Array into a string |
| [`atob`](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/atob) | Decodes a base-64 encoded string   |
| [`btoa`](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/btoa) | Encodes a string in base-64        |

### Stream APIs

| API                                                                                                     | Description                             |
| ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| [`ReadableStream`](https://developer.mozilla.org/docs/Web/API/ReadableStream)                           | Represents a readable stream            |
| [`WritableStream`](https://developer.mozilla.org/docs/Web/API/WritableStream)                           | Represents a writable stream            |
| [`WritableStreamDefaultWriter`](https://developer.mozilla.org/docs/Web/API/WritableStreamDefaultWriter) | Represents a writer of a WritableStream |
| [`TransformStream`](https://developer.mozilla.org/docs/Web/API/TransformStream)                         | Represents a transform stream           |
| [`ReadableStreamDefaultReader`](https://developer.mozilla.org/docs/Web/API/ReadableStreamDefaultReader) | Represents a reader of a ReadableStream |
| [`ReadableStreamBYOBReader`](https://developer.mozilla.org/docs/Web/API/ReadableStreamBYOBReader)       | Represents a reader of a ReadableStream |

### Crypto APIs

| API                                                                       | Description                                                                                         |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [`crypto`](https://developer.mozilla.org/docs/Web/API/Window/crypto)      | Provides access to the cryptographic functionality of the platform                                  |
| [`SubtleCrypto`](https://developer.mozilla.org/docs/Web/API/SubtleCrypto) | Provides access to common cryptographic primitives, like hashing, signing, encryption or decryption |
| [`CryptoKey`](https://developer.mozilla.org/docs/Web/API/CryptoKey)       | Represents a cryptographic key                                                                      |

### Other Web Standard APIs

| API                                                                                                                   | Description                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`AbortController`](https://developer.mozilla.org/docs/Web/API/AbortController)                                       | Allows you to abort one or more DOM requests as and when desired                                                                                                                                     |
| [`AbortSignal`](https://developer.mozilla.org/docs/Web/API/AbortSignal)                                               | Represents a signal object that allows you to communicate with a DOM request (such as a [`Fetch`](https://developer.mozilla.org/docs/Web/API/Fetch_API) request) and abort it if required            |
| [`DOMException`](https://developer.mozilla.org/docs/Web/API/DOMException)                                             | Represents an error that occurs in the DOM                                                                                                                                                           |
| [`structuredClone`](https://developer.mozilla.org/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)            | Creates a deep copy of a value                                                                                                                                                                       |
| [`URLPattern`](https://developer.mozilla.org/docs/Web/API/URLPattern)                                                 | Represents a URL pattern                                                                                                                                                                             |
| [`Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)                           | Represents an array of values                                                                                                                                                                        |
| [`ArrayBuffer`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)               | Represents a generic, fixed-length raw binary data buffer                                                                                                                                            |
| [`Atomics`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Atomics)                       | Provides atomic operations as static methods                                                                                                                                                         |
| [`BigInt`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/BigInt)                         | Represents a whole number with arbitrary precision                                                                                                                                                   |
| [`BigInt64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/BigInt64Array)           | Represents a typed array of 64-bit signed integers                                                                                                                                                   |
| [`BigUint64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/BigUint64Array)         | Represents a typed array of 64-bit unsigned integers                                                                                                                                                 |
| [`Boolean`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean)                       | Represents a logical entity and can have two values: `true` and `false`                                                                                                                              |
| [`clearInterval`](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearInterval)                 | Cancels a timed, repeating action which was previously established by a call to `setInterval()`                                                                                                      |
| [`clearTimeout`](https://developer.mozilla.org/docs/Web/API/WindowOrWorkerGlobalScope/clearTimeout)                   | Cancels a timed, repeating action which was previously established by a call to `setTimeout()`                                                                                                       |
| [`console`](https://developer.mozilla.org/docs/Web/API/Console)                                                       | Provides access to the browser's debugging console                                                                                                                                                   |
| [`DataView`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/DataView)                     | Represents a generic view of an `ArrayBuffer`                                                                                                                                                        |
| [`Date`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date)                             | Represents a single moment in time in a platform-independent format                                                                                                                                  |
| [`decodeURI`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/decodeURI)                   | Decodes a Uniform Resource Identifier (URI) previously created by `encodeURI` or by a similar routine                                                                                                |
| [`decodeURIComponent`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent) | Decodes a Uniform Resource Identifier (URI) component previously created by `encodeURIComponent` or by a similar routine                                                                             |
| [`encodeURI`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/encodeURI)                   | Encodes a Uniform Resource Identifier (URI) by replacing each instance of certain characters by one, two, three, or four escape sequences representing the UTF-8 encoding of the character           |
| [`encodeURIComponent`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) | Encodes a Uniform Resource Identifier (URI) component by replacing each instance of certain characters by one, two, three, or four escape sequences representing the UTF-8 encoding of the character |
| [`Error`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)                           | Represents an error when trying to execute a statement or accessing a property                                                                                                                       |
| [`EvalError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/EvalError)                   | Represents an error that occurs regarding the global function `eval()`                                                                                                                               |
| [`Float32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Float32Array)             | Represents a typed array of 32-bit floating point numbers                                                                                                                                            |
| [`Float64Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Float64Array)             | Represents a typed array of 64-bit floating point numbers                                                                                                                                            |
| [`Function`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function)                     | Represents a function                                                                                                                                                                                |
| [`Infinity`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Infinity)                     | Represents the mathematical Infinity value                                                                                                                                                           |
| [`Int8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int8Array)                   | Represents a typed array of 8-bit signed integers                                                                                                                                                    |
| [`Int16Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int16Array)                 | Represents a typed array of 16-bit signed integers                                                                                                                                                   |
| [`Int32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Int32Array)                 | Represents a typed array of 32-bit signed integers                                                                                                                                                   |
| [`Intl`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl)                             | Provides access to internationalization and localization functionality                                                                                                                               |
| [`isFinite`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/isFinite)                     | Determines whether a value is a finite number                                                                                                                                                        |
| [`isNaN`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/isNaN)                           | Determines whether a value is `NaN` or not                                                                                                                                                           |
| [`JSON`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON)                             | Provides functionality to convert JavaScript values to and from the JSON format                                                                                                                      |
| [`Map`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)                               | Represents a collection of values, where each value may occur only once                                                                                                                              |
| [`Math`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Math)                             | Provides access to mathematical functions and constants                                                                                                                                              |
| [`Number`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Number)                         | Represents a numeric value                                                                                                                                                                           |
| [`Object`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object)                         | Represents the object that is the base of all JavaScript objects                                                                                                                                     |
| [`parseFloat`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/parseFloat)                 | Parses a string argument and returns a floating point number                                                                                                                                         |
| [`parseInt`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/parseInt)                     | Parses a string argument and returns an integer of the specified radix                                                                                                                               |
| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)                       | Represents the eventual completion (or failure) of an asynchronous operation, and its resulting value                                                                                                |
| [`Proxy`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Proxy)                           | Represents an object that is used to define custom behavior for fundamental operations (e.g. property lookup, assignment, enumeration, function invocation, etc)                                     |
| [`RangeError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RangeError)                 | Represents an error when a value is not in the set or range of allowed values                                                                                                                        |
| [`ReferenceError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/ReferenceError)         | Represents an error when a non-existent variable is referenced                                                                                                                                       |
| [`Reflect`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Reflect)                       | Provides methods for interceptable JavaScript operations                                                                                                                                             |
| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)                         | Represents a regular expression, allowing you to match combinations of characters                                                                                                                    |
| [`Set`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Set)                               | Represents a collection of values, where each value may occur only once                                                                                                                              |
| [`setInterval`](https://developer.mozilla.org/docs/Web/API/setInterval)                                               | Repeatedly calls a function, with a fixed time delay between each call                                                                                                                               |
| [`setTimeout`](https://developer.mozilla.org/docs/Web/API/setTimeout)                                                 | Calls a function or evaluates an expression after a specified number of milliseconds                                                                                                                 |
| [`SharedArrayBuffer`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer)   | Represents a generic, fixed-length raw binary data buffer                                                                                                                                            |
| [`String`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String)                         | Represents a sequence of characters                                                                                                                                                                  |
| [`Symbol`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Symbol)                         | Represents a unique and immutable data type that is used as the key of an object property                                                                                                            |
| [`SyntaxError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError)               | Represents an error when trying to interpret syntactically invalid code                                                                                                                              |
| [`TypeError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/TypeError)                   | Represents an error when a value is not of the expected type                                                                                                                                         |
| [`Uint8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)                 | Represents a typed array of 8-bit unsigned integers                                                                                                                                                  |
| [`Uint8ClampedArray`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8ClampedArray)   | Represents a typed array of 8-bit unsigned integers clamped to 0-255                                                                                                                                 |
| [`Uint32Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint32Array)               | Represents a typed array of 32-bit unsigned integers                                                                                                                                                 |
| [`URIError`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/URIError)                     | Represents an error when a global URI handling function was used in a wrong way                                                                                                                      |
| [`URL`](https://developer.mozilla.org/docs/Web/API/URL)                                                               | Represents an object providing static methods used for creating object URLs                                                                                                                          |
| [`URLSearchParams`](https://developer.mozilla.org/docs/Web/API/URLSearchParams)                                       | Represents a collection of key/value pairs                                                                                                                                                           |
| [`WeakMap`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)                       | Represents a collection of key/value pairs in which the keys are weakly referenced                                                                                                                   |
| [`WeakSet`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)                       | Represents a collection of objects in which each object may occur only once                                                                                                                          |
| [`WebAssembly`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly)               | Provides access to WebAssembly                                                                                                                                                                       |

## Check if you're running on the Edge runtime

You can check if your function is running on the Edge runtime by checking the global `globalThis.EdgeRuntime` property. This can be helpful if you need to validate that your function is running on the Edge runtime in tests, or if you need to use a different API depending on the runtime.

```ts
if (typeof EdgeRuntime !== 'string') {
  // dead-code elimination is enabled for the code inside this block
}
```

## Compatible Node.js modules

The following modules can be imported with and without the `node:` prefix when using the `import` statement:

| Module                                                   | Description                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`async_hooks`](https://nodejs.org/api/async_hooks.html) | Manage asynchronous resources lifecycles with `AsyncLocalStorage`. Supports the [WinterCG subset](https://github.com/wintercg/proposal-common-minimum-api/blob/main/asynclocalstorage.md) of APIs |
| [`events`](https://nodejs.org/api/events.html)           | Facilitate event-driven programming with custom event emitters and listeners. This API is fully supported                                                                                         |
| [`buffer`](https://nodejs.org/api/buffer.html)           | Efficiently manipulate binary data using fixed-size, raw memory allocations with `Buffer`. Every primitive compatible with `Uint8Array` accepts `Buffer` too                                      |
| [`assert`](https://nodejs.org/api/assert.html)           | Provide a set of assertion functions for verifying invariants in your code                                                                                                                        |
| [`util`](https://nodejs.org/api/util.html)               | Offer various utility functions where we include `promisify`/`callbackify` and `types`                                                                                                            |

Also, `Buffer` is globally exposed to maximize compatibility with existing Node.js modules.

## Unsupported APIs

The Edge runtime has some restrictions including:

- Some Node.js APIs other than the ones listed above **are not supported**. For example, you can't read or write to the filesystem
- `node_modules` *can* be used, as long as they implement ES Modules and do not use native Node.js APIs
- Calling `require` directly is **not allowed**. Use `import` instead

The following JavaScript language features are disabled, and **will not work:**

| API                                                                                                                             | Description                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`eval`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/eval)                                       | Evaluates JavaScript code represented as a string                   |
| [`new Function(evalString)`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function)               | Creates a new function with the code provided as an argument        |
| [`WebAssembly.compile`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/compile)         | Compiles a WebAssembly module from a buffer source                  |
| [`WebAssembly.instantiate`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate) | Compiles and instantiates a WebAssembly module from a buffer source |

> **💡 Note:** While `WebAssembly.instantiate` is supported in Edge Runtime, it requires the
> Wasm source code to be provided using the import statement. This means you
> cannot use a buffer or byte array to dynamically compile the module at
> runtime.

## Environment Variables

You can use `process.env` to access [Environment Variables](/docs/environment-variables).

## Many Node.js APIs are not available

Middleware with the `edge` runtime configured is neither a Node.js nor browser application, which means it doesn't have access to all browser and Node.js APIs. Currently, our runtime offers a subset of browser APIs and some Node.js APIs and we plan to implement more functionality in the future.

In summary:

- Use ES modules
- Most libraries that use Node.js APIs as dependencies can't be used in Middleware with the `edge` runtime configured.
- Dynamic code execution (such as `eval`) is not allowed (see the next section for more details)

## Dynamic code execution leads to a runtime error

Dynamic code execution is not available in Middleware with the `edge` runtime configured for security reasons. For example, the following APIs cannot be used:

| API                                                                                                                             | Description                                                         |
| ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| [`eval`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/eval)                                       | Evaluates JavaScript code represented as a string                   |
| [`new Function(evalString)`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Function)               | Creates a new function with the code provided as an argument        |
| [`WebAssembly.instantiate`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WebAssembly/instantiate) | Compiles and instantiates a WebAssembly module from a buffer source |

You need to make sure libraries used in your Middleware with the `edge` runtime configured don't rely on dynamic code execution because it leads to a runtime error.

## Maximum Execution Duration

Middleware with the `edge` runtime configured must begin sending a response within **25 seconds**.

You may continue streaming a response beyond that time and you can continue with asynchronous workloads in the background, after returning the response.

## Code size limit

| Plan       | Limit (after gzip compression) |
| ---------- | ------------------------------ |
| Hobby      | 1 MB                           |
| Pro        | 2 MB                           |
| Enterprise | 4 MB                           |

The maximum size for an Vercel Function using the Edge runtime includes your JavaScript code, imported libraries and files (such as fonts), and all files bundled in the function.

If you reach the limit, make sure the code you are importing in your function is used and is not too heavy. You can use a package size checker tool like [bundle](https://bundle.js.org/) to check the size of a package and search for a smaller alternative.

## Ignored Environment Variable Names

Environment Variables can be accessed through the `process.env` object.
Since JavaScript objects have methods to allow some operations on them, there are limitations
on the names of Environment Variables to avoid having ambiguous code.

The following names will be ignored as Environment Variables to avoid overriding the `process.env` object prototype:

- `constructor`
- `__defineGetter__`
- `__defineSetter__`
- `hasOwnProperty`
- `__lookupGetter__`
- `__lookupSetter__`
- `isPrototypeOf`
- `propertyIsEnumerable`
- `toString`
- `valueOf`
- `__proto__`
- `toLocaleString`

Therefore, your code will always be able to use them with their expected behavior:

```js
// returns `true`, if `process.env.MY_VALUE` is used anywhere & defined in the Vercel dashboard
process.env.hasOwnProperty('MY_VALUE');
```


---

[View full sitemap](/docs/sitemap)
