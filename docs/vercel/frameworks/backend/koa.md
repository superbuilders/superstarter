---
title: Koa on Vercel
product: vercel
url: /docs/frameworks/backend/koa
type: how-to
prerequisites:
  - /docs/frameworks/backend
  - /docs/frameworks
related:
  - /docs/functions
  - /docs/fluid-compute
  - /docs/deployments/environments
  - /docs/instant-rollback
  - /docs/vercel-firewall
summary: Deploy Koa applications to Vercel with zero configuration.
---

# Koa on Vercel

Koa is an expressive HTTP middleware framework for building web applications and APIs with zero configuration.​​​​ You can deploy a Koa app to Vercel with zero configuration using [Vercel Functions](/docs/functions).

Koa applications on Vercel benefit from:

- [Fluid compute](/docs/fluid-compute): Pay for the CPU you use, automatic cold start reduction, optimized concurrency, background processing, and more
- [Preview deployments](/docs/deployments/environments#preview-environment-pre-production): Test your changes in a copy of your production infrastructure
- [Instant Rollback](/docs/instant-rollback): Recover from breaking changes or bugs in milliseconds
- [Vercel Firewall](/docs/vercel-firewall): Protect your applications from a wide range of threats with a robust, multi-layered security system
- [Secure Compute](/docs/secure-compute): Create private links between your Vercel-hosted backend and other clouds

## Koa entrypoint detection

To allow Vercel to deploy your Koa application and process web requests, your server entrypoint file should be named one of the following:

- `src/app.{js,mjs,cjs,ts,cts,mts}`
- `src/index.{js,mjs,cjs,ts,cts,mts}`
- `src/server.{js,mjs,cjs,ts,cts,mts}`
- `app.{js,mjs,cjs,ts,cts,mts}`
- `index.{js,mjs,cjs,ts,cts,mts}`
- `server.{js,mjs,cjs,ts,cts,mts}`

For example, use the following code as an entrypoint:

```ts filename="src/index.ts"
import Koa from 'koa'
import { Router } from '@koa/router'

const app = new Koa()
const router = new Router()

router.get('/', (ctx) => {
  ctx.body = { message: 'Hello from Koa!' }
})

app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000)
```

### Local development

Use `vercel dev` to run your application locally.

```bash filename="terminal"
vercel dev
```

> **💡 Note:** Minimum CLI version required: 50.4.8

### Deploying the application

To deploy, [connect your Git repository](/new) or [use Vercel CLI](/docs/cli/deploy):

```bash filename="terminal"
vc deploy
```

> **💡 Note:** Minimum CLI version required: 50.4.8

## Vercel Functions

When you deploy a Koa app to Vercel, your Koa application becomes a single [Vercel Function](/docs/functions) and uses [Fluid compute](/docs/fluid-compute) by default. Vercel automatically scales your Koa app up and down based on traffic.

## Limitations

All [Vercel Functions limitations](/docs/functions/limitations) apply to the Koa application, including the size of the application being limited to 250MB.

## More resources

Learn more about deploying Koa projects on Vercel with the following resources:

- [Koa official documentation](https://koajs.com)
- [Vercel Functions documentation](/docs/functions)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)


---

[View full sitemap](/docs/sitemap)
