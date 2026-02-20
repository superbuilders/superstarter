---
title: Programmatic Configuration with vercel.ts
product: vercel
url: /docs/project-configuration/vercel-ts
type: reference
prerequisites:
  - /docs/project-configuration
related:
  - /docs/deployments/configure-a-build
  - /docs/functions
  - /docs/routing-middleware
  - /docs/functions/runtimes/edge
  - /docs/incremental-static-regeneration
summary: Define your Vercel configuration in vercel.ts with @vercel/config for type-safe routing and build settings.
---

# Programmatic Configuration with vercel.ts

The `vercel.ts` file lets you configure and override the default behavior of Vercel from within your project. Unlike `vercel.json`, which is static, `vercel.ts` executes at build time, which lets you dynamically generate configuration. For example, you can fetch content from APIs, use environment variables to conditionally set routes, or compute configuration values based on your project structure.

## Getting Started

### Requirements

Use only one configuration file: `vercel.ts` or `vercel.json`.

You can have any sort of code in your `vercel.ts` file, but the final set of rules and configuration properties must be in a `config` struct export. Use the same property names as `vercel.json` in your `config` export. For rewrites, redirects, headers, and transforms, prefer the helper functions from `routes`:

```typescript
export const config: VercelConfig = {
  buildCommand: 'npm run build',
  cleanUrls: true,
  trailingSlash: false,
  // See the sections below for all available options
};
```

To migrate from `vercel.json`, copy its contents into your `config` export, then add new capabilities as needed.

### Install @vercel/config

Install the NPM package to get access to types and helpers.

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/config
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/config
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/config
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/config
    ```
  </Code>
</CodeBlock>

Create a `vercel.ts` in your project root and export a typed config. The example below shows how to configure build commands, framework settings, routing rules (rewrites and redirects), and headers:

> **💡 Note:** You can also use `vercel.js`, `vercel.mjs`, `vercel.cjs`, or `vercel.mts` to create this configuration file.

```typescript filename="vercel.ts"
import { routes, deploymentEnv, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'npm run build',
  framework: 'nextjs',

  rewrites: [
    routes.rewrite('/api/(.*)', 'https://backend.api.example.com/$1'),
    routes.rewrite('/(.*)', 'https://api.example.com/$1', {
      requestHeaders: {
        authorization: `Bearer ${deploymentEnv('API_TOKEN')}`,
      },
    }),
    routes.rewrite(
      '/users/:userId/posts/:postId',
      'https://api.example.com/users/$1/posts/$2',
      ({ userId, postId }) => ({
        requestHeaders: {
          'x-user-id': userId,
          'x-post-id': postId,
          authorization: `Bearer ${deploymentEnv('API_KEY')}`,
        },
      }),
    ),
  ],

  redirects: [routes.redirect('/old-docs', '/docs', { permanent: true })],

  headers: [
    routes.cacheControl('/static/(.*)', {
      public: true,
      maxAge: '1 week',
      immutable: true,
    }),
  ],

  crons: [{ path: '/api/cleanup', schedule: '0 0 * * *' }],
};
```

### Migrating from vercel.json

To migrate from an existing `vercel.json`, paste its contents into a `config` export in a new vercel.ts file:

```typescript filename="vercel.ts"
export const config = {
  buildCommand: 'pnpm run generate-config',
  outputDirectory: ".next",
  headers: [
    {
      source: "/(.*)\\\\.(js|css|jpg|jpeg|gif|png|svg|txt|ttf|woff2|webmanifest)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=2592000, s-maxage=2592000"
        }
      ]
    }
  ]
}
```

Then install the `@vercel/config` package and enhance your configuration:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1'

export const config: VercelConfig = {
  buildCommand: 'pnpm run generate-config',
  outputDirectory: `.${process.env.framework}`,
  headers: [
    routes.cacheControl(
      '/(.*)\\\\.(js|css|jpg|jpeg|gif|png|svg|txt|ttf|woff2|webmanifest)',
      {
        public: true,
        maxAge: '30days',
        sMaxAge: '30days'
      }
    )
  ]
}
```

## Config export options

- [schema autocomplete](#schema-autocomplete)
- [buildCommand](#buildcommand)
- [bunVersion](#bunversion)
- [cleanUrls](#cleanurls)
- [crons](#crons)
- [devCommand](#devcommand)
- [fluid](#fluid)
- [framework](#framework)
- [functions](#functions)
- [headers](#headers)
- [ignoreCommand](#ignorecommand)
- [images](#images)
- [installCommand](#installcommand)
- [outputDirectory](#outputdirectory)
- [public](#public)
- [redirects](#redirects)
- [bulkRedirectsPath](#bulkredirectspath)
- [regions](#regions)
- [functionFailoverRegions](#functionfailoverregions)
- [rewrites](#rewrites)
- [trailingSlash](#trailingslash)
- [legacy](#legacy)

## schema autocomplete

Via the types imported from the `@vercel/config` package, autocomplete for all config properties and helpers are automatically available in `vercel.ts`.

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [routes.rewrite('/about', '/about-our-company.html')],
  // add more properties here
};
```

## buildCommand

**Type:** `string | null`

The `buildCommand` property can be used to override the Build Command in the Project Settings dashboard, and the `build` script from the `package.json` file for a given deployment. For more information on the default behavior of the Build Command, visit the [Configure a Build - Build Command](/docs/deployments/configure-a-build#build-command) section.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  buildCommand: 'next build',
};
```

This value overrides the [Build Command](/docs/deployments/configure-a-build#build-command) in Project Settings.

## bunVersion

> **🔒 Permissions Required**: The Bun runtime

**Type:** `string`

**Value:** `"1.x"`

The `bunVersion` property configures your project to use the Bun runtime instead of Node.js. When set, all [Vercel Functions](/docs/functions) and [Routing Middleware](/docs/routing-middleware) not using the [Edge runtime](/docs/functions/runtimes/edge) will run using the specified Bun version.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  bunVersion: '1.x',
};
```

> **💡 Note:** Vercel manages the Bun minor and patch versions automatically. `1.x` is the
> only valid value currently.

When using Next.js with [ISR](/docs/incremental-static-regeneration) (Incremental Static Regeneration), you must also update your `build` and `dev` commands in `package.json`:

```json filename="package.json"
{
  "scripts": {
    "dev": "bun run --bun next dev",
    "build": "bun run --bun next build"
  }
}
```

To learn more about using Bun with Vercel Functions, see the [Bun runtime documentation](/docs/functions/runtimes/bun).

## cleanUrls

**Type**: `Boolean`.

**Default Value**: `false`.

When set to `true`, all HTML files and Vercel functions will have their extension removed. When visiting a path that ends with the extension, a 308 response will redirect the client to the extensionless path.

For example, a static file named `about.html` will be served when visiting the `/about` path. Visiting `/about.html` will redirect to `/about`.

Similarly, a Vercel Function named `api/user.go` will be served when visiting `/api/user`. Visiting `/api/user.go` will redirect to `/api/user`.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  cleanUrls: true,
};
```

If you are using Next.js and running `vercel dev`, you will get a 404 error when visiting a route configured with `cleanUrls` locally. It does however work fine when deployed to Vercel. In the example above, visiting `/about` locally will give you a 404 with `vercel dev` but `/about` will render correctly on Vercel.

## crons

Used to configure [cron jobs](/docs/cron-jobs) for the production deployment of a project.

**Type**: `Array` of cron `Object`.

**Limits**:

- A maximum of string length of 512 for the `path` value.
- A maximum of string length of 256 for the `schedule` value.

### Cron object definition

- `path` - **Required** - The path to invoke when the cron job is triggered. Must start with `/`.
- `schedule` - **Required** - The [cron schedule expression](/docs/cron-jobs#cron-expressions) to use for the cron job.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  crons: [
    {
      path: '/api/every-minute',
      schedule: '* * * * *',
    },
    {
      path: '/api/every-hour',
      schedule: '0 * * * *',
    },
    {
      path: '/api/every-day',
      schedule: '0 0 * * *',
    },
  ],
};
```

## devCommand

This value overrides the [Development Command](/docs/deployments/configure-a-build#development-command) in Project Settings.

**Type:** `string | null`

The `devCommand` property can be used to override the Development Command in the Project Settings dashboard. For more information on the default behavior of the Development Command, visit the [Configure a Build - Development Command](/docs/deployments/configure-a-build#development-command) section.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  devCommand: 'next dev',
};
```

## fluid

This value allows you to enable [Fluid compute](/docs/fluid-compute) programmatically.

**Type:** `boolean | null`

The `fluid` property allows you to test Fluid compute on a per-deployment or per [custom environment](/docs/deployments/environments#custom-environments) basis when using branch tracking, without needing to enable Fluid in production.

> **💡 Note:** As of April 23, 2025, Fluid compute is enabled by default for new projects.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  fluid: true,
};
```

## framework

This value overrides the [Framework](/docs/deployments/configure-a-build#framework-preset) in Project Settings.

**Type:** `string | null`

Available framework slugs:

The `framework` property can be used to override the Framework Preset in the Project Settings dashboard. The value must be a valid framework slug. For more information on the default behavior of the Framework Preset, visit the [Configure a Build - Framework Preset](/docs/deployments/configure-a-build#framework-preset) section.

> **💡 Note:** To select "Other" as the Framework Preset, use `null`.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
};
```

## functions

**Type:** `Object` of key `String` and value `Object`.

### Key definition

A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern that matches the paths of the Vercel functions you would like to customize:

- `api/*.js` (matches one level e.g. `api/hello.js` but not `api/hello/world.js`)
- `api/**/*.ts` (matches all levels `api/hello.ts` and `api/hello/world.ts`)
- `src/pages/**/*` (matches all functions from `src/pages`)
- `api/test.js`

### Value definition

- `runtime` (optional): The npm package name of a [Runtime](/docs/functions/runtimes), including its version.
- `memory`: Memory cannot be set in `vercel.ts` with [Fluid compute](/docs/fluid-compute) enabled. Instead set it in the **Functions** tab of your project dashboard. See [setting default function memory](/docs/functions/configuring-functions/memory#setting-your-default-function-memory-/-cpu-size) for more information.
- `maxDuration` (optional): An integer defining how long your Vercel Function should be allowed to run on every request in seconds (between `1` and the maximum limit of your plan, as mentioned below).
- `supportsCancellation` (optional): A boolean defining whether your Vercel Function should [support request cancellation](/docs/functions/functions-api-reference#cancel-requests). This is only available when you're using the Node.js runtime.
- `includeFiles` (optional): A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern to match files that should be included in your Vercel Function. If you're using a Community Runtime, the behavior might vary. Please consult its documentation for more details. (Not supported in Next.js, instead use [`outputFileTracingIncludes`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats) in `next.config.js` )
- `excludeFiles` (optional): A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern to match files that should be excluded from your Vercel Function. If you're using a Community Runtime, the behavior might vary. Please consult its documentation for more details. (Not supported in Next.js, instead use [`outputFileTracingExcludes`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats) in `next.config.js` )

### Description

By default, no configuration is needed to deploy Vercel functions to Vercel.

For all [officially supported runtimes](/docs/functions/runtimes), the only requirement is to create an `api` directory at the root of your project directory, placing your Vercel functions inside.

The `functions` property cannot be used in combination with `builds`. Since the latter is a legacy configuration property, we recommend dropping it in favor of the new one.

Because [Incremental Static Regeneration (ISR)](/docs/incremental-static-regeneration) uses Vercel functions, the same configurations apply. The ISR route can be defined using a glob pattern, and accepts the same properties as when using Vercel functions.

When deployed, each Vercel Function receives the following properties:

- **Memory:** 1024 MB (1 GB) - **(Optional)**
- **Maximum Duration:** 10s default - 60s / 1 minute (Hobby), 15s default - 300s / 5 minutes (Pro), or 15s default - 900s / 15 minutes (Enterprise). This [can be configured](/docs/functions/configuring-functions/duration) up to the respective plan limit) - **(Optional)**

To configure them, you can add the `functions` property.

#### `functions` property with Vercel functions

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  functions: {
    'api/test.js': {
      memory: 3009,
      maxDuration: 30,
    },
    'api/*.js': {
      memory: 3009,
      maxDuration: 30,
    },
  },
};
```

#### `functions` property with ISR

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  functions: {
    'pages/blog/[hello].tsx': {
      memory: 1024,
    },
    'src/pages/isr/**/*': {
      maxDuration: 10,
    },
  },
};
```

### Using unsupported runtimes

In order to use a runtime that is not [officially supported](/docs/functions/runtimes), you can add a `runtime` property to the definition:

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  functions: {
    'api/test.php': {
      runtime: 'vercel-php@0.5.2',
    },
  },
};
```

In the example above, the `api/test.php` Vercel Function does not use one of the [officially supported runtimes](/docs/functions/runtimes). In turn, a `runtime` property was added in order to invoke the [vercel-php](https://www.npmjs.com/package/vercel-php) community runtime.

For more information on Runtimes, see the [Runtimes documentation](/docs/functions/runtimes):

## headers

**Type:** `Array` of header `Object`.

**Valid values:** a list of header definitions.

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  headers: [
    routes.header('/service-worker.js', [
      { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
    ]),
    routes.header('/(.*)', [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-XSS-Protection', value: '1; mode=block' },
    ]),
    routes.header('/:path*', [{ key: 'x-authorized', value: 'true' }], {
      has: [{ type: 'query', key: 'authorized' }],
    }),
  ],
};
```

This example configures custom response headers for static files, [Vercel functions](/docs/functions), and a wildcard that matches all routes.

### Header object definition

| Property  | Description                                                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`  | A pattern that matches each incoming pathname (excluding querystring).                                                                                                     |
| `headers` | A non-empty array of key/value pairs representing each response header.                                                                                                    |
| `has`     | An optional array of `has` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the **presence** of specified properties.    |
| `missing` | An optional array of `missing` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the **absence** of specified properties. |

### Header `has` or `missing` object definition

If `value` is an object, it has one or more of the following fields:

This example demonstrates using the expressive `value` object to append the header `x-authorized: true` if the `X-Custom-Header` request header's value is prefixed by `valid` and ends with `value`.

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  headers: [
    routes.header('/:path*', [{ key: 'x-authorized', value: 'true' }], {
      has: [
        {
          type: 'header',
          key: 'X-Custom-Header',
          value: { pre: 'valid', suf: 'value' },
        },
      ],
    }),
  ],
};
```

Learn more about [headers](/docs/headers) on Vercel and see [limitations](/docs/cdn-cache#limits).

## ignoreCommand

This value overrides the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step) in Project Settings.

**Type:** `string | null`

This `ignoreCommand` property will override the Command for Ignoring the Build Step for a given deployment. When the command exits with code 1, the build will continue. When the command exits with 0, the build is ignored. For more information on the default behavior of the Ignore Command, visit the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step) section.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  ignoreCommand: 'git diff --quiet HEAD^ HEAD ./',
};
```

## installCommand

This value overrides the [Install Command](/docs/deployments/configure-a-build#install-command) in Project Settings.

**Type:** `string | null`

The `installCommand` property can be used to override the Install Command in the Project Settings dashboard for a given deployment. This setting is useful for trying out a new package manager for the project. An empty string value will cause the Install Command to be skipped. For more information on the default behavior of the install command visit the [Configure a Build - Install Command](/docs/deployments/configure-a-build#install-command)
section.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  installCommand: 'npm install',
};
```

## images

The `images` property defines the behavior of [Vercel's native Image Optimization API](/docs/image-optimization), which allows on-demand optimization of images at runtime.

**Type**: `Object`

### Value definition

- `sizes` - **Required** - Array of allowed image widths. The Image Optimization API will return an error if the `w` parameter is not defined in this list.
- `localPatterns` - Allow-list of local image paths which can be used with the Image Optimization API.
- `remotePatterns` - Allow-list of external domains which can be used with the Image Optimization API.
- `minimumCacheTTL` - Cache duration (in seconds) for the optimized images.
- `qualities` - Array of allowed image qualities. The Image Optimization API will return an error if the `q` parameter is not defined in this list.
- `formats` - Supported output image formats. Allowed values are either `"image/avif"` and/or `"image/webp"`.
- `dangerouslyAllowSVG` - Allow SVG input image URLs. This is disabled by default for security purposes.
- `contentSecurityPolicy` - Specifies the [Content Security Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) of the optimized images.
- `contentDispositionType` - Specifies the value of the `"Content-Disposition"` response header. Allowed values are `"inline"` or `"attachment"`.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  images: {
    sizes: [256, 640, 1080, 2048, 3840],
    localPatterns: [
      {
        pathname: '^/assets/.*$',
        search: '',
      },
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        port: '',
        pathname: '^/account123/.*$',
        search: '?v=1',
      },
    ],
    minimumCacheTTL: 60,
    qualities: [25, 50, 75],
    formats: ['image/webp'],
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "script-src 'none'; frame-src 'none'; sandbox;",
    contentDispositionType: 'inline',
  },
};
```

## outputDirectory

This value overrides the [Output Directory](/docs/deployments/configure-a-build#output-directory) in Project Settings.

**Type:** `string | null`

The `outputDirectory` property can be used to override the Output Directory in the Project Settings dashboard for a given deployment.

In the following example, the deployment will look for the `build` directory rather than the default `public` or `.` root directory. For more information on the default behavior of the Output Directory see the [Configure a Build - Output Directory](/docs/deployments/configure-a-build#output-directory) section. The following example is a `vercel.ts` file that overrides the `outputDirectory` to `build`:

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  outputDirectory: 'build',
};
```

## public

**Type**: `Boolean`.

**Default Value**: `false`.

When set to `true`, both the [source view](/docs/deployments/build-features#source-view) and [logs view](/docs/deployments/build-features#logs-view) will be publicly accessible.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  public: true,
};
```

## redirects

**Type:** `Array` of redirect `Object`.

**Valid values:** a list of redirect definitions.

### Redirects examples

This example redirects requests to the path `/me` from your site's root to the `profile.html` file relative to your site's root with a [307 Temporary Redirect](https://developer.mozilla.org/docs/Web/HTTP/Status/307):

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/me', '/profile.html', { permanent: false }),
  ],
};
```

This example redirects requests to the path `/me` from your site's root to the `profile.html` file relative to your site's root with a [308 Permanent Redirect](https://developer.mozilla.org/docs/Web/HTTP/Status/308):

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/me', '/profile.html', { permanent: true }),
  ],
};
```

This example redirects requests to the path `/user` from your site's root to the api route `/api/user` relative to your site's root with a [301 Moved Permanently](https://developer.mozilla.org/docs/Web/HTTP/Status/301):

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/user', '/api/user', { statusCode: 301 }),
  ],
};
```

This example redirects requests to the path `/view-source` from your site's root to the absolute path `https://github.com/vercel/vercel` of an external site with a redirect status of 308:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/view-source', 'https://github.com/vercel/vercel'),
  ],
};
```

This example redirects requests to all the paths (including all sub-directories and pages) from your site's root to the absolute path `https://vercel.com/docs` of an external site with a redirect status of 308:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/(.*)', 'https://vercel.com/docs'),
  ],
};
```

This example uses wildcard path matching to redirect requests to any path (including subdirectories) under `/blog/` from your site's root to a corresponding path under `/news/` relative to your site's root with a redirect status of 308:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/blog/:path*', '/news/:path*'),
  ],
};
```

This example uses regex path matching to redirect requests to any path under `/posts/` that only contain numerical digits from your site's root to a corresponding path under `/news/` relative to your site's root with a redirect status of 308:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/post/:path(\\d{1,})', '/news/:path*'),
  ],
};
```

This example redirects requests to any path from your site's root that does not start with `/uk/` and has `x-vercel-ip-country` header value of `GB` to a corresponding path under `/uk/` relative to your site's root with a redirect status of 307:

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/:path((?!uk/).*)', '/uk/:path*', {
      has: [
        {
          type: 'header',
          key: 'x-vercel-ip-country',
          value: 'GB',
        },
      ],
      permanent: false,
    }),
  ],
};
```

> **💡 Note:** Using `has` does not yet work locally while using
> `vercel dev`, but does work when deployed.

### Redirect object definition

| Property      | Description                                                                                                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`      | A pattern that matches each incoming pathname (excluding querystring).                                                                                                                                                                                                                 |
| `destination` | A location destination defined as an absolute pathname or external URL.                                                                                                                                                                                                                |
| `permanent`   | An optional boolean to toggle between permanent and temporary redirect (default `true`). When `true`, the status code is [308](https://developer.mozilla.org/docs/Web/HTTP/Status/308). When `false` the status code is [307](https://developer.mozilla.org/docs/Web/HTTP/Status/307). |
| `statusCode`  | An optional integer to define the status code of the redirect. Used when you need a value other than 307/308 from `permanent`, and therefore cannot be used with `permanent` boolean.                                                                                                  |
| `has`         | An optional array of `has` objects with the `type`, `key` and `value` properties. Used for conditional redirects based on the **presence** of specified properties.                                                                                                                    |
| `missing`     | An optional array of `missing` objects with the `type`, `key` and `value` properties. Used for conditional redirects based on the **absence** of specified properties.                                                                                                                 |

### Redirect `has` or `missing` object definition

If `value` is an object, it has one or more of the following fields:

This example uses the expressive `value` object to define a route that redirects users with a redirect status of 308 to `/end` only if the `X-Custom-Header` header's value is prefixed by `valid` and ends with `value`.

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  redirects: [
    routes.redirect('/start', '/end', {
      has: [
        {
          type: 'header',
          key: 'X-Custom-Header',
          value: { pre: 'valid', suf: 'value' },
        },
      ],
    }),
  ],
};
```

Learn more about [redirects on Vercel](/docs/redirects) and see [limitations](/docs/redirects#limits).

## bulkRedirectsPath

Learn more about [bulk redirects on Vercel](/docs/redirects/bulk-redirects) and see [limits and pricing](/docs/redirects/bulk-redirects#limits-and-pricing).

**Type:** `string` path to a file or folder.

The `bulkRedirectsPath` property can be used to import many thousands of redirects per project. These redirects do not support wildcard or header matching.

CSV, JSON, and JSONL file formats are supported, and the redirect files can be generated at build time as long as they end up in the location specified by `bulkRedirectsPath`. This can point to either a single file or a folder containing multiple redirect files.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  bulkRedirectsPath: 'redirects.csv',
};
```

### CSV

> **💡 Note:** CSV headers must match the field names below, can be specific in any order, and optional fields can be ommitted.

```csv filename="redirects.csv"
source,destination,permanent
/source/path,/destination/path,true
/source/path-2,https://destination-site.com/destination/path,true
```

### JSON

```json filename="redirects.json"
[
    {
        "source": "/source/path",
        "destination": "/destination/path",
        "permanent": true
    },
    {
        "source": "/source/path-2",
        "destination": "https://destination-site.com/destination/path",
        "permanent": true
    }
]
```

### JSONL

```jsonl filename="redirects.jsonl"
{"source": "/source/path", "destination": "/destination/path", "permanent": true}
{"source": "/source/path-2", "destination": "https://destination-site.com/destination/path", "permanent": true}
```

> **💡 Note:** Bulk redirects do not work locally while using `vercel dev`

### Bulk redirect field definition

| Field                 | Type      | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`              | `string`  | Yes      | An absolute path that matches each incoming pathname (excluding querystring). Max 2048 characters.                                                                                                                                                                                                                                                                                                                                                |
| `destination`         | `string`  | Yes      | A location destination defined as an absolute pathname or external URL. Max 2048 characters.                                                                                                                                                                                                                                                                                                                                                      |
| `permanent`           | `boolean` | No       | Toggle between permanent ([308](https://developer.mozilla.org/docs/Web/HTTP/Status/308)) and temporary ([307](https://developer.mozilla.org/docs/Web/HTTP/Status/307)) redirect. Default: `false`.                                                                                                                                                                                                                                                |
| `statusCode`          | `integer` | No       | Specify the exact status code. Can be [301](https://developer.mozilla.org/docs/Web/HTTP/Status/301), [302](https://developer.mozilla.org/docs/Web/HTTP/Status/302), [303](https://developer.mozilla.org/docs/Web/HTTP/Status/303), [307](https://developer.mozilla.org/docs/Web/HTTP/Status/307), or [308](https://developer.mozilla.org/docs/Web/HTTP/Status/308). Overrides permanent when set, otherwise defers to permanent value or default. |
| `caseSensitive`       | `boolean` | No       | Toggle whether source path matching is case sensitive. Default: `false`.                                                                                                                                                                                                                                                                                                                                                                          |
| `preserveQueryParams` | `boolean` | No       | Toggle whether to preserve the query string on the redirect. Default: `false`.                                                                                                                                                                                                                                                                                                                                                                    |

In order to improve space efficiency, all boolean values can be the single characters `t` (true) or `f` (false) while using the CSV format.

## regions

This value overrides the [Vercel Function Region](/docs/functions/regions) in Project Settings.

**Type:** `Array` of region identifier `String`.

**Valid values:** List of [regions](/docs/regions), defaults to `iad1`.

You can define the **regions** where your [Vercel functions](/docs/functions) are executed. Users on Pro and Enterprise can deploy to multiple regions. Hobby plans can select any single region. To learn more, see [Configuring Regions](/docs/functions/configuring-functions/region#project-configuration).

Function responses [can be cached](/docs/cdn-cache) in the requested regions. Selecting a Vercel Function region does not impact static files, which are deployed to every region by default.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  regions: ['sfo1'],
};
```

## functionFailoverRegions

> **🔒 Permissions Required**: Setting failover regions for Vercel functions

Set this property to specify the [region](/docs/functions/regions) to which a Vercel Function should fallback when the default region(s) are unavailable.

**Type:** `Array` of region identifier `String`.

**Valid values:** List of [regions](/docs/regions).

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  functionFailoverRegions: ['iad1', 'sfo1'],
};
```

These regions serve as a fallback to any regions specified in the [`regions` configuration](/docs/project-configuration#regions). The region Vercel selects to invoke your function depends on availability and ingress. For instance:

- Vercel always attempts to invoke the function in the primary region. If you specify more than one primary region in the `regions` property, Vercel selects the region geographically closest to the request
- If all primary regions are unavailable, Vercel automatically fails over to the regions specified in `functionFailoverRegions`, selecting the region geographically closest to the request
- The order of the regions in `functionFailoverRegions` does not matter as Vercel automatically selects the region geographically closest to the request

To learn more about automatic failover for Vercel Functions, see [Automatic failover](/docs/functions/configuring-functions/region#automatic-failover). Vercel Functions using the Edge runtime will [automatically failover](/docs/functions/configuring-functions/region#automatic-failover) with no configuration required.

Region failover is supported with Secure Compute, see [Region Failover](/docs/secure-compute#region-failover) to learn more.

## rewrites

**Type:** `Array` of rewrite `Object`.

**Valid values:** a list of rewrite definitions.

If [`cleanUrls`](/docs/project-configuration/vercel-ts#cleanurls) is set to `true` in
your project's `vercel.ts`, do not include the file extension in the source
or destination path. For example, `/about-our-company.html` would be
`/about-our-company`

### Rewrites examples

- This example rewrites requests to the path `/about` from your site's root to the `/about-our-company.html` file relative to your site's root:

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [routes.rewrite('/about', '/about-our-company.html')],
  };
  ```

- This example rewrites all requests to the root path which is often used for a Single Page Application (SPA).

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [routes.rewrite('/(.*)', '/index.html')],
  };
  ```

- This example rewrites requests to the paths under `/resize` with 2 path levels (defined as variables `width` and `height` that can be used in the destination value) to the api route `/api/sharp` relative to your site's root:

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [routes.rewrite('/resize/:width/:height', '/api/sharp')],
  };
  ```

- This example uses wildcard path matching to rewrite requests to any path (including subdirectories) under `/proxy/` from your site's root to a corresponding path under the root of an external site `https://example.com/`:

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [
      routes.rewrite('/proxy/:match*', 'https://example.com/:match*'),
    ],
  };
  ```

- This example rewrites requests to any path from your site's root that does not start with /uk/ and has x-vercel-ip-country header value of GB to a corresponding path under /uk/ relative to your site's root:

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [
      routes.rewrite('/:path((?!uk/).*)', '/uk/:path*', {
        has: [
          {
            type: 'header',
            key: 'x-vercel-ip-country',
            value: 'GB',
          },
        ],
      }),
    ],
  };
  ```

- This example rewrites requests to the path `/dashboard` from your site's root that **does not** have a cookie with key `auth_token` to the path `/login` relative to your site's root:

  ```typescript filename="vercel.ts"
  import { routes, type VercelConfig } from '@vercel/config/v1';

  export const config: VercelConfig = {
    rewrites: [
      routes.rewrite('/dashboard', '/login', {
        missing: [
          {
            type: 'cookie',
            key: 'auth_token',
          },
        ],
      }),
    ],
  };
  ```

### Rewrite object definition

| Property      | Description                                                                                                                                                                                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`      | A pattern that matches each incoming pathname (excluding querystring).                                                                                                                                                                                                     |
| `destination` | A location destination defined as an absolute pathname or external URL.                                                                                                                                                                                                    |
| `permanent`   | A boolean to toggle between permanent and temporary redirect (default true). When `true`, the status code is [308](https://developer.mozilla.org/docs/Web/HTTP/Status/308). When `false` the status code is [307](https://developer.mozilla.org/docs/Web/HTTP/Status/307). |
| `has`         | An optional array of `has` objects with the `type`, `key` and `value` properties. Used for conditional rewrites based on the **presence** of specified properties.                                                                                                         |
| `missing`     | An optional array of `missing` objects with the `type`, `key` and `value` properties. Used for conditional rewrites based on the **absence** of specified properties.                                                                                                      |

### Rewrite `has` or `missing` object definition

If `value` is an object, it has one or more of the following fields:

This example demonstrates using the expressive `value` object to define a route that rewrites users to `/end` only if the `X-Custom-Header` header's value is prefixed by `valid` and ends with `value`.

```typescript filename="vercel.ts"
import { routes, type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  rewrites: [
    routes.rewrite('/start', '/end', {
      has: [
        {
          type: 'header',
          key: 'X-Custom-Header',
          value: { pre: 'valid', suf: 'value' },
        },
      ],
    }),
  ],
};
```

The `source` property should **NOT** be a file because precedence is given to the filesystem prior to rewrites being applied. Instead, you should rename your static file or Vercel Function.

> **💡 Note:** Using `has` does not yet work locally while using
> `vercel dev`, but does work when deployed.

Learn more about [rewrites](/docs/rewrites) on Vercel.

## trailingSlash

**Type**: `Boolean`.

**Default Value**: `undefined`.

### false

When `trailingSlash: false`, visiting a path that ends with a forward slash will respond with a 308 status code and redirect to the path without the trailing slash.

For example, the `/about/` path will redirect to `/about`.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  trailingSlash: false,
};
```

### true

When `trailingSlash: true`, visiting a path that does not end with a forward slash will respond with a 308 status code and redirect to the path with a trailing slash.

For example, the `/about` path will redirect to `/about/`.

However, paths with a file extension will not redirect to a trailing slash.

For example, the `/about/styles.css` path will not redirect, but the `/about/styles` path will redirect to `/about/styles/`.

```typescript filename="vercel.ts"
import type { VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  trailingSlash: true,
};
```

### undefined

When `trailingSlash: undefined`, visiting a path with or without a trailing slash will not redirect.

For example, both `/about` and `/about/` will serve the same content without redirecting.

This is not recommended because it could lead to search engines indexing two different pages with duplicate content.

## Legacy properties

Legacy properties like `routes` and `builds` are still supported in `vercel.ts` for backwards compatibility, but are deprecated. We recommend using the helper-based options above (`rewrites`, `redirects`, `headers`) for type safety and better developer experience.

For details on legacy properties, see the [legacy section of the static configuration reference](/docs/project-configuration/vercel-json#legacy).


---

[View full sitemap](/docs/sitemap)
