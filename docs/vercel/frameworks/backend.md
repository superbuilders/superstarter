---
title: Backends on Vercel
product: vercel
url: /docs/frameworks/backend
type: conceptual
prerequisites:
  - /docs/frameworks
related:
  - /docs/fluid-compute
  - /docs/functions/usage-and-pricing
  - /docs/instant-rollback
  - /docs/vercel-firewall
  - /docs/deployments/environments
summary: Vercel supports a wide range of the most popular backend frameworks, optimizing how your application builds and runs no matter what tooling you use.
---

# Backends on Vercel

Backends deployed to Vercel receive the benefits of Vercel's infrastructure, including:

- [Fluid compute](/docs/fluid-compute): Zero-configuration, optimized concurrency, dynamic scaling, background processing, automatic cold-start prevention, region failover, and more
- [Active CPU pricing](/docs/functions/usage-and-pricing): Only pay for the CPU you use, not waiting for I/O (e.g. calling AI models, database queries)
- [Instant Rollback](/docs/instant-rollback): Quickly revert to a previous production deployment
- [Vercel Firewall](/docs/vercel-firewall): A robust, multi-layered security system designed to protect your applications
- [Preview deployments with Deployment Protection](/docs/deployments/environments#preview-environment-pre-production): Secure your preview environments and test changes safely before production
- [Rolling releases](/docs/rolling-releases): Gradually roll out backends to detect errors early

## Zero-configuration backends

Deploy the following backends to Vercel with zero-configuration.

- **Elysia**: Ergonomic framework for humans
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/elysia)
- **Express**: Fast, unopinionated, minimalist web framework for Node.js
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/express) | [View Demo](https://express-vercel-example-demo.vercel.app/)
- **FastAPI**: FastAPI framework, high performance, easy to learn, fast to code, ready for production
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/fastapi) | [View Demo](https://vercel-fastapi-gamma-smoky.vercel.app/)
- **Fastify**: Fast and low overhead web framework, for Node.js
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/fastify)
- **Flask**: The Python micro web framework
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/flask)
- **H3**: Universal, Tiny, and Fast Servers
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/h3)
- **Hono**: Web framework built on Web Standards
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/hono) | [View Demo](https://hono.vercel.dev)
- **Koa**: Expressive middleware for Node.js using ES2017 async functions
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/koa)
- **NestJS**: Framework for building efficient, scalable Node.js server-side applications
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nestjs)
- **Nitro**: Nitro is a next generation server toolkit.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nitro) | [View Demo](https://nitro-template.vercel.app)
- **xmcp**: The MCP framework for building AI-powered tools
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/xmcp) | [View Demo](https://xmcp-template.vercel.app/)


## Adapting to Serverless and Fluid compute

If you are transitioning from a fully managed server or containerized environment to Vercel’s serverless architecture, you may need to rethink a few concepts in your application since there is no longer a server always running in the background.

The following are generally applicable to serverless, and therefore Vercel Functions (running with or without Fluid compute).

### Websockets

Serverless functions have maximum execution limits and should respond as quickly as possible. They should not subscribe to data events. Instead, we need a client that subscribes to data events and a serverless functions that publishes new data. Consider using a serverless friendly realtime data provider.

### Database Connections

To manage database connections efficiently, [use the `attachDatabasePool` function from `@vercel/functions`](/docs/functions/functions-api-reference/vercel-functions-package#database-connection-pool-management).


---

[View full sitemap](/docs/sitemap)
