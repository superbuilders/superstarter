---
title: Using WebAssembly (Wasm)
product: vercel
url: /docs/functions/runtimes/wasm
type: how-to
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/functions
  - /docs/routing-middleware
  - /docs/functions/runtimes/edge
  - /docs/functions/runtimes/node-js
  - /docs/functions/runtimes/bun
summary: Learn how to use WebAssembly (Wasm) to enable low-level languages to run on Vercel Functions and Routing Middleware.
---

# Using WebAssembly (Wasm)

[WebAssembly](https://webassembly.org), or Wasm, is a portable, low-level, assembly-like language that can be used as a compilation target for languages like C, Go, and Rust. Wasm was built to run more efficiently on the web and *alongside* JavaScript, so that it runs in most JavaScript virtual machines.

With Vercel, you can use Wasm in [Vercel Functions](/docs/functions) or [Routing Middleware](/docs/routing-middleware) when the runtime is set to [`edge`](/docs/functions/runtimes/edge), [`nodejs`](/docs/functions/runtimes/node-js), or [`bun`](/docs/functions/runtimes/bun#configuring-the-runtime).

Pre-compiled WebAssembly can be imported with the `?module` suffix. This will provide an array of the Wasm data that can be instantiated using `WebAssembly.instantiate()`.

> **💡 Note:** While `WebAssembly.instantiate` is supported in Edge Runtime, it requires the
> Wasm source code to be provided using the import statement. This means you
> cannot use a buffer or byte array to dynamically compile the module at
> runtime.

## Using a Wasm file

You can use Wasm in your production deployment or locally, using [`vercel dev`](/docs/cli/dev).

- ### Get your Wasm file ready
  - Compile your existing C, Go, and Rust project to create a binary `.wasm` file. For this example, we use a [rust](https://github.com/vercel/next.js/blob/canary/examples/with-webassembly/src/add.rs) function that adds one to any number.
  - Copy the compiled file (in our example, [`add.wasm`](https://github.com/vercel/next.js/blob/canary/examples/with-webassembly/add.wasm)) to the root of your Next.js project. If you're using Typescript, add a `ts` definition for the function such as [add.wasm.d.ts](https://github.com/vercel/next.js/blob/canary/examples/with-webassembly/add.wasm.d.ts).

- ### Create an API route for calling the Wasm file
  With `nodejs` runtime that uses [Fluid compute](/docs/fluid-compute) by default:
  ```ts filename="api/wasm/route.ts"
  import path from 'node:path';
  import fs from 'node:fs';
  import type * as addWasmModule from '../../../add.wasm'; // import type definitions at the root of your project

  const wasmBuffer = fs.readFileSync(path.resolve(process.cwd(), './add.wasm')); // path from root
  const wasmPromise = WebAssembly.instantiate(wasmBuffer);

  export async function GET(request: Request) {
    const url = new URL(request.url);
    const num = Number(url.searchParams.get('number') || 10);
    const { add_one: addOne } = (await wasmPromise).instance
      .exports as typeof addWasmModule;

    return new Response(`got: ${addOne(num)}`);
  }
  ```

- ### Call the Wasm endpoint
  - Run the project locally with `vercel dev`
  - Browse to `http://localhost:3000/api/wasm?number=12` which should return `got: 13`


---

[View full sitemap](/docs/sitemap)
