---
title: Express on Vercel
product: vercel
url: /docs/frameworks/backend/express
type: how-to
prerequisites:
  - /docs/frameworks/backend
  - /docs/frameworks
related:
  - /docs/fluid-compute
  - /docs/deployments/environments
  - /docs/instant-rollback
  - /docs/vercel-firewall
  - /docs/secure-compute
summary: Deploy Express applications to Vercel with zero configuration. Learn about middleware and Vercel Functions.
---

# Express on Vercel

Express is a fast, unopinionated, minimalist web framework for Node.js. You can deploy an Express app to Vercel with zero configuration.

Express applications on Vercel benefit from:

- [Fluid compute](/docs/fluid-compute): Active CPU billing, automatic cold start prevention, optimized concurrency, background processing, and more
- [Preview deployments](/docs/deployments/environments#preview-environment-pre-production): Test your changes on a copy of your production infrastructure
- [Instant Rollback](/docs/instant-rollback): Recover from unintended changes or bugs in milliseconds
- [Vercel Firewall](/docs/vercel-firewall): Protect your applications from a wide range of threats with a multi-layered security system
- [Secure Compute](/docs/secure-compute): Create private links between your Vercel-hosted backend and other clouds

## Get started with Express on Vercel

You can quickly deploy an Express application to Vercel by creating an Express app or using an existing one:

### Get started with Vercel CLI

Get started by initializing a new Express project using [Vercel CLI init command](/docs/cli/init):

```bash filename="terminal"
vc init express
```

This will clone the [Express example repository](https://github.com/vercel/vercel/tree/main/examples/express) in a directory called `express`.

## Exporting the Express application

To run an Express application on Vercel, create a file that imports the `express` package at any one of the following locations:

- `app.{js,cjs,mjs,ts,cts,mts}`
- `index.{js,cjs,mjs,ts,cts,mts}`
- `server.{js,cjs,mjs,ts,cts,mts}`
- `src/app.{js,cjs,mjs,ts,cts,mts}`
- `src/index.{js,cjs,mjs,ts,cts,mts}`
- `src/server.{js,mjs,cjs,ts,cts,mts}`

The file must also export the application as a default export of the module or use a port listener.

### Using a default export

For example, use the following code that exports your Express app:

```js filename="src/index.js" framework=express
// Use "type: commonjs" in package.json to use CommonJS modules
const express = require('express');
const app = express();

// Define your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

// Export the Express app
module.exports = app;
```

```ts filename="src/index.ts" framework=express
// Use "type: module" in package.json to use ES modules
import express from 'express';
const app = express();

// Define your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

// Export the Express app
export default app;
```

### Using a port listener

You may also run your application using the `app.listen` pattern that exposes the server on a port.

```js filename="src/index.js" framework=express
// Use "type: commonjs" in package.json to use CommonJS modules
const express = require('express');
const app = express();
const port = 3000;

// Define your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

```ts filename="src/index.ts" framework=express
// Use "type: module" in package.json to use ES modules
import express from 'express';
const app = express();
const port = 3000;

// Define your routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Express on Vercel!' });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
```

### Local development

Use `vercel dev` to run your application locally

```bash filename="terminal"
vercel dev
```

> **💡 Note:** Minimum CLI version required: 47.0.5

### Deploying the application

To deploy, [connect your Git repository](/new) or [use Vercel CLI](/docs/cli/deploy):

```bash filename="terminal"
vc deploy
```

> **💡 Note:** Minimum CLI version required: 47.0.5

## Serving static assets

To serve static assets, place them in the `public/**` directory. They will be served as a part of our [CDN](/docs/cdn) using default [headers](/docs/headers) unless otherwise specified in `vercel.json`.

`express.static()` will be ignored and will not serve static assets.

## Vercel Functions

When you deploy an Express app to Vercel, your Express application becomes a single [Vercel Function](/docs/functions) and uses [Fluid compute](/docs/fluid-compute) by default. This means your Express app will automatically scale up and down based on traffic.

## Limitations

- `express.static()` will not serve static assets. You must use [the `public/**` directory](#serving-static-assets).

Additionally, all [Vercel Functions limitations](/docs/functions/limitations) apply to the Express application, including:

- **Application size**: The Express application becomes a single bundle, which must fit within the 250MB limit of Vercel Functions. Our bundling process removes all unneeded files from the deployment's bundle to reduce size, but does not perform application bundling (e.g., Webpack or Rollup).
- **Error handling**: Express.js will swallow errors that can put the main function into an undefined state unless properly handled. Express.js will render its own error pages (500), which prevents Vercel from discarding the function and resetting its state. Implement robust error handling to ensure errors are properly managed and do not interfere with the serverless function's lifecycle.

## More resources

Learn more about deploying Express projects on Vercel with the following resources:

- [Express official documentation](https://expressjs.com/)
- [Vercel Functions documentation](/docs/functions)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)
- [Express middleware guide](https://expressjs.com/en/guide/using-middleware.html)


---

[View full sitemap](/docs/sitemap)
