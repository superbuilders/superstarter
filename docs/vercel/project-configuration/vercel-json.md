---
title: Static Configuration with vercel.json
product: vercel
url: /docs/project-configuration/vercel-json
type: reference
prerequisites:
  - /docs/project-configuration
related:
  - /docs/deployments/configure-a-build
  - /docs/functions
  - /docs/routing-middleware
  - /docs/functions/runtimes/edge
  - /docs/incremental-static-regeneration
summary: Learn how to use vercel.json to configure and override the default behavior of Vercel from within your project. 
---

# Static Configuration with vercel.json

The `vercel.json` file lets you configure, and override the default behavior of Vercel from within your project.

This file should be created in your project's root directory and allows you to set:

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

## schema autocomplete

To add autocompletion, type checking, and schema validation to your `vercel.json` file, add the following to the top of your file:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

## buildCommand

**Type:** `string | null`

The `buildCommand` property can be used to override the Build Command in the Project Settings dashboard, and the `build` script from the `package.json` file for a given deployment. For more information on the default behavior of the Build Command, visit the [Configure a Build - Build Command](/docs/deployments/configure-a-build#build-command) section.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "next build"
}
```

This value overrides the [Build Command](/docs/deployments/configure-a-build#build-command) in Project Settings.

## bunVersion

> **🔒 Permissions Required**: The Bun runtime

**Type:** `string`

**Value:** `"1.x"`

The `bunVersion` property configures your project to use the Bun runtime instead of Node.js. When set, all [Vercel Functions](/docs/functions) and [Routing Middleware](/docs/routing-middleware) not using the [Edge runtime](/docs/functions/runtimes/edge) will run using the specified Bun version.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x"
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/every-minute",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/every-hour",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/every-day",
      "schedule": "0 0 * * *"
    }
  ]
}
```

## devCommand

This value overrides the [Development Command](/docs/deployments/configure-a-build#development-command) in Project Settings.

**Type:** `string | null`

The `devCommand` property can be used to override the Development Command in the Project Settings dashboard. For more information on the default behavior of the Development Command, visit the [Configure a Build - Development Command](/docs/deployments/configure-a-build#development-command) section.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "devCommand": "next dev"
}
```

## fluid

This value allows you to enable [Fluid compute](/docs/fluid-compute) programmatically.

**Type:** `boolean | null`

The `fluid` property allows you to test Fluid compute on a per-deployment or per [custom environment](/docs/deployments/environments#custom-environments) basis when using branch tracking, without needing to enable Fluid in production.

> **💡 Note:** As of April 23, 2025, Fluid compute is enabled by default for new projects.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "fluid": true
}
```

## framework

This value overrides the [Framework](/docs/deployments/configure-a-build#framework-preset) in Project Settings.

**Type:** `string | null`

Available framework slugs:

The `framework` property can be used to override the Framework Preset in the Project Settings dashboard. The value must be a valid framework slug. For more information on the default behavior of the Framework Preset, visit the [Configure a Build - Framework Preset](/docs/deployments/configure-a-build#framework-preset) section.

> **💡 Note:** To select "Other" as the Framework Preset, use `null`.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs"
}
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
- `memory`: Memory cannot be set in `vercel.json` with [Fluid compute](/docs/fluid-compute) enabled. Instead set it in the **Functions** tab of your project dashboard. See [setting default function memory](/docs/functions/configuring-functions/memory#setting-your-default-function-memory-/-cpu-size) for more information.
- `maxDuration` (optional): An integer defining how long your Vercel Function should be allowed to run on every request in seconds (between `1` and the maximum limit of your plan, as mentioned below).
- `supportsCancellation` (optional): A boolean defining whether your Vercel Function should [support request cancellation](/docs/functions/functions-api-reference#cancel-requests). This is only available when you're using the Node.js runtime.
- `includeFiles` (optional): A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern to match files that should be included in your Vercel Function. If you’re using a Community Runtime, the behavior might vary. Please consult its documentation for more details. (Not supported in Next.js, instead use [`outputFileTracingIncludes`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats) in `next.config.js` )
- `excludeFiles` (optional): A [glob](https://github.com/isaacs/node-glob#glob-primer) pattern to match files that should be excluded from your Vercel Function. If you’re using a Community Runtime, the behavior might vary. Please consult its documentation for more details. (Not supported in Next.js, instead use [`outputFileTracingExcludes`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output#caveats) in `next.config.js` )

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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.js": {
      "memory": 3009,
      "maxDuration": 30
    },
    "api/*.js": {
      "memory": 3009,
      "maxDuration": 30
    }
  }
}
```

#### `functions` property with ISR

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "pages/blog/[hello].tsx": {
      "memory": 1024
    },
    "src/pages/isr/**/*": {
      "maxDuration": 10
    }
  }
}
```

### Using unsupported runtimes

In order to use a runtime that is not [officially supported](/docs/functions/runtimes), you can add a `runtime` property to the definition:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.php": {
      "runtime": "vercel-php@0.5.2"
    }
  }
}
```

In the example above, the `api/test.php` Vercel Function does not use one of the [officially supported runtimes](/docs/functions/runtimes). In turn, a `runtime` property was added in order to invoke the [vercel-php](https://www.npmjs.com/package/vercel-php) community runtime.

For more information on Runtimes, see the [Runtimes documentation](/docs/functions/runtimes):

## headers

**Type:** `Array` of header `Object`.

**Valid values:** a list of header definitions.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/service-worker.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    },
    {
      "source": "/:path*",
      "has": [
        {
          "type": "query",
          "key": "authorized"
        }
      ],
      "headers": [
        {
          "key": "x-authorized",
          "value": "true"
        }
      ]
    }
  ]
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "header",
          "key": "X-Custom-Header",
          "value": {
            "pre": "valid",
            "suf": "value"
          }
        }
      ],
      "headers": [
        {
          "key": "x-authorized",
          "value": "true"
        }
      ]
    }
  ]
}
```

Learn more about [headers](/docs/headers) on Vercel and see [limitations](/docs/cdn-cache#limits).

## ignoreCommand

This value overrides the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step) in Project Settings.

**Type:** `string | null`

This `ignoreCommand` property will override the Command for Ignoring the Build Step for a given deployment. When the command exits with code 1, the build will continue. When the command exits with 0, the build is ignored. For more information on the default behavior of the Ignore Command, visit the [Ignored Build Step](/docs/project-configuration/project-settings#ignored-build-step) section.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

## installCommand

This value overrides the [Install Command](/docs/deployments/configure-a-build#install-command) in Project Settings.

**Type:** `string | null`

The `installCommand` property can be used to override the Install Command in the Project Settings dashboard for a given deployment. This setting is useful for trying out a new package manager for the project. An empty string value will cause the Install Command to be skipped. For more information on the default behavior of the install command visit the [Configure a Build - Install Command](/docs/deployments/configure-a-build#install-command)
section.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "npm install"
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "images": {
    "sizes": [256, 640, 1080, 2048, 3840],
    "localPatterns": [{
      "pathname": "^/assets/.*$",
      "search": ""
    }],
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "example.com",
        "port": "",
        "pathname": "^/account123/.*$",
        "search": "?v=1"
      }
    ],
    "minimumCacheTTL": 60,
    "qualities": [25, 50, 75],
    "formats": ["image/webp"],
    "dangerouslyAllowSVG": false,
    "contentSecurityPolicy": "script-src 'none'; frame-src 'none'; sandbox;",
    "contentDispositionType": "inline"
  }
}
```

## outputDirectory

This value overrides the [Output Directory](/docs/deployments/configure-a-build#output-directory) in Project Settings.

**Type:** `string | null`

The `outputDirectory` property can be used to override the Output Directory in the Project Settings dashboard for a given deployment.

In the following example, the deployment will look for the `build` directory rather than the default `public` or `.` root directory. For more information on the default behavior of the Output Directory see the [Configure a Build - Output Directory](/docs/deployments/configure-a-build#output-directory) section. The following example is a `vercel.json` file that overrides the `outputDirectory` to `build`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "outputDirectory": "build"
}
```

## public

**Type**: `Boolean`.

**Default Value**: `false`.

When set to `true`, both the [source view](/docs/deployments/build-features#source-view) and [logs view](/docs/deployments/build-features#logs-view) will be publicly accessible.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "public": true
}
```

## redirects

**Type:** `Array` of redirect `Object`.

**Valid values:** a list of redirect definitions.

### Redirects examples

This example redirects requests to the path `/me` from your site's root to the `profile.html` file relative to your site's root with a [307 Temporary Redirect](https://developer.mozilla.org/docs/Web/HTTP/Status/307):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/me", "destination": "/profile.html", "permanent": false }
  ]
}
```

This example redirects requests to the path `/me` from your site's root to the `profile.html` file relative to your site's root with a [308 Permanent Redirect](https://developer.mozilla.org/docs/Web/HTTP/Status/308):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/me", "destination": "/profile.html", "permanent": true }
  ]
}
```

This example redirects requests to the path `/user` from your site's root to the api route `/api/user` relative to your site's root with a [301 Moved Permanently](https://developer.mozilla.org/docs/Web/HTTP/Status/301):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    { "source": "/user", "destination": "/api/user", "statusCode": 301 }
  ]
}
```

This example redirects requests to the path `/view-source` from your site's root to the absolute path `https://github.com/vercel/vercel` of an external site with a redirect status of 308:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/view-source",
      "destination": "https://github.com/vercel/vercel"
    }
  ]
}
```

This example redirects requests to all the paths (including all sub-directories and pages) from your site's root to the absolute path `https://vercel.com/docs` of an external site with a redirect status of 308:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://vercel.com/docs"
    }
  ]
}
```

This example uses wildcard path matching to redirect requests to any path (including subdirectories) under `/blog/` from your site's root to a corresponding path under `/news/` relative to your site's root with a redirect status of 308:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/blog/:path*",
      "destination": "/news/:path*"
    }
  ]
}
```

This example uses regex path matching to redirect requests to any path under `/posts/` that only contain numerical digits from your site's root to a corresponding path under `/news/` relative to your site's root with a redirect status of 308:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/post/:path(\\d{1,})",
      "destination": "/news/:path*"
    }
  ]
}
```

This example redirects requests to any path from your site's root that does not start with `/uk/` and has `x-vercel-ip-country` header value of `GB` to a corresponding path under `/uk/` relative to your site's root with a redirect status of 307:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/:path((?!uk/).*)",
      "has": [
        {
          "type": "header",
          "key": "x-vercel-ip-country",
          "value": "GB"
        }
      ],
      "destination": "/uk/:path*",
      "permanent": false
    }
  ]
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/start",
      "destination": "/end",
      "has": [
        {
          "type": "header",
          "key": "X-Custom-Header",
          "value": {
            "pre": "valid",
            "suf": "value"
          }
        }
      ]
    }
  ]
}
```

Learn more about [redirects on Vercel](/docs/redirects) and see [limitations](/docs/redirects#limits).

## bulkRedirectsPath

Learn more about [bulk redirects on Vercel](/docs/redirects/bulk-redirects) and see [limits and pricing](/docs/redirects/bulk-redirects#limits-and-pricing).

**Type:** `string` path to a file or folder.

The `bulkRedirectsPath` property can be used to import many thousands of redirects per project. These redirects do not support wildcard or header matching.

CSV, JSON, and JSONL file formats are supported, and the redirect files can be generated at build time as long as they end up in the location specified by `bulkRedirectsPath`. This can point to either a single file or a folder containing multiple redirect files.

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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["sfo1"]
}
```

## functionFailoverRegions

> **🔒 Permissions Required**: Setting failover regions for Vercel functions

Set this property to specify the [region](/docs/functions/regions) to which a Vercel Function should fallback when the default region(s) are unavailable.

**Type:** `Array` of region identifier `String`.

**Valid values:** List of [regions](/docs/regions).

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functionFailoverRegions": ["iad1", "sfo1"]
}
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

If [`cleanUrls`](/docs/project-configuration/vercel-json#cleanurls) is set to `true` in
your project's `vercel.json`, do not include the file extension in the source
or destination path. For example, `/about-our-company.html` would be
`/about-our-company`

### Rewrites examples

- This example rewrites requests to the path `/about` from your site's root to the `/about-our-company.html` file relative to your site's root:

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      { "source": "/about", "destination": "/about-our-company.html" }
    ]
  }
  ```

- This example rewrites all requests to the root path which is often used for a Single Page Application (SPA).

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
  }
  ```

- This example rewrites requests to the paths under `/resize` with 2 path levels (defined as variables `width` and `height` that can be used in the destination value) to the api route `/api/sharp` relative to your site's root:

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      { "source": "/resize/:width/:height", "destination": "/api/sharp" }
    ]
  }
  ```

- This example uses wildcard path matching to rewrite requests to any path (including subdirectories) under `/proxy/` from your site's root to a corresponding path under the root of an external site `https://example.com/`:

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      {
        "source": "/proxy/:match*",
        "destination": "https://example.com/:match*"
      }
    ]
  }
  ```

- This example rewrites requests to any path from your site's root that does not start with /uk/ and has x-vercel-ip-country header value of GB to a corresponding path under /uk/ relative to your site's root:

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      {
        "source": "/:path((?!uk/).*)",
        "has": [
          {
            "type": "header",
            "key": "x-vercel-ip-country",
            "value": "GB"
          }
        ],
        "destination": "/uk/:path*"
      }
    ]
  }
  ```

- This example rewrites requests to the path `/dashboard` from your site's root that **does not** have a cookie with key `auth_token` to the path `/login` relative to your site's root:

  ```json filename="vercel.json"
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "rewrites": [
      {
        "source": "/dashboard",
        "missing": [
          {
            "type": "cookie",
            "key": "auth_token"
          }
        ],
        "destination": "/login"
      }
    ]
  }
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/start",
      "destination": "/end",
      "has": [
        {
          "type": "header",
          "key": "X-Custom-Header",
          "value": {
            "pre": "valid",
            "suf": "value"
          }
        }
      ]
    }
  ]
}
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

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "trailingSlash": false
}
```

### true

When `trailingSlash: true`, visiting a path that does not end with a forward slash will respond with a 308 status code and redirect to the path with a trailing slash.

For example, the `/about` path will redirect to `/about/`.

However, paths with a file extension will not redirect to a trailing slash.

For example, the `/about/styles.css` path will not redirect, but the `/about/styles` path will redirect to `/about/styles/`.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "trailingSlash": true
}
```

### undefined

When `trailingSlash: undefined`, visiting a path with or without a trailing slash will not redirect.

For example, both `/about` and `/about/` will serve the same content without redirecting.

This is not recommended because it could lead to search engines indexing two different pages with duplicate content.

## Legacy

Legacy properties are still supported for backwards compatibility, but are deprecated.

### name

The `name` property has been deprecated in favor of [Project Linking](/docs/cli/project-linking), which allows you to link a Vercel project to your local codebase when you run `vercel`.

**Type**: `String`.

**Valid values**: string name for the deployment.

**Limits**:

- A maximum length of 52 characters
- Only lower case alphanumeric characters or hyphens are allowed
- Cannot begin or end with a hyphen, or contain multiple consecutive hyphens

The prefix for all new deployment instances. Vercel CLI usually generates this field automatically based on the name of the directory. But if you'd like to define it explicitly, this is the way to go.

The defined name is also used to organize the deployment into [a project](/docs/projects/overview).

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "name": "example-app"
}
```

### version

The `version` property should not be used anymore.

**Type**: `Number`.

**Valid values**: `1`, `2`.

Specifies the Vercel Platform version the deployment should use.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "version": 2
}
```

### alias

The `alias` property should not be used anymore. To assign a custom Domain to your project, please [define it in the Project Settings](/docs/domains/add-a-domain) instead. Once your domains are, they will take precedence over the configuration property.

**Type**: `Array` or `String`.

**Valid values**: [domain names](/docs/domains/add-a-domain) (optionally including subdomains) added to the account, or a string for a suffixed URL using `.vercel.app` or a Custom Deployment Suffix ([available on the Enterprise plan](/pricing)).

**Limit**: A maximum of 64 aliases in the array.

The alias or aliases are applied automatically using [Vercel for GitHub](/docs/git/vercel-for-github), [Vercel for GitLab](/docs/git/vercel-for-gitlab), or [Vercel for Bitbucket](/docs/git/vercel-for-bitbucket) when merging or pushing to the [Production Branch](/docs/git#production-branch).

You can deploy to the defined aliases using [Vercel CLI](/docs/cli) by setting the [production deployment environment target](/docs/domains/deploying-and-redirecting).

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "alias": ["my-domain.com", "my-alias"]
}
```

### scope

The `scope` property has been deprecated in favor of [Project Linking](/docs/cli/project-linking), which allows you to link a Vercel project to your local codebase when you run `vercel`.

**Type**: `String`.

**Valid values**: For teams, either an ID or slug. For users, either a email address, username, or ID.

This property determines the scope ([Hobby team](/docs/accounts/create-an-account#creating-a-hobby-account) or [team](/docs/accounts/create-a-team)) under which the project will be deployed by [Vercel CLI](/cli).

It also affects any other actions that the user takes within the directory that contains this configuration (e.g. listing [environment variables](/docs/environment-variables) using `vercel secrets ls`).

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "scope": "my-team"
}
```

Deployments made through [Git](/docs/git) will **ignore** the `scope` property because the repository is already connected to [project](/docs/projects/overview).

### env

We recommend against using this property. To add custom environment variables to your project [define them in the Project Settings](/docs/environment-variables).

**Type:** `Object` of `String` keys and values.

**Valid values:** environment keys and values.

Environment variables passed to the invoked [Vercel functions](/docs/functions).

This example will pass the `MY_KEY` static env to all [Vercel functions](/docs/functions) and the `SECRET` resolved from the `my-secret-name` [secret](/docs/environment-variables/reserved-environment-variables) dynamically.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "env": {
    "MY_KEY": "this is the value",
    "SECRET": "@my-secret-name"
  }
}
```

### build.env

We recommend against using this property. To add custom environment variables to your project [define them in the Project Settings](/docs/environment-variables).

**Type:** `Object` of `String` keys and values inside the `build` `Object`.

**Valid values:** environment keys and values.

[Environment variables](/docs/environment-variables) passed to the [Build](/docs/deployments/configure-a-build) processes.

The following example will pass the `MY_KEY` environment variable to all [Builds](/docs/deployments/configure-a-build) and the `SECRET` resolved from the `my-secret-name` [secret](/docs/environment-variables/reserved-environment-variables) dynamically.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "env": {
    "MY_KEY": "this is the value",
    "SECRET": "@my-secret-name"
  }
}
```

### builds

We recommend against using this property. To customize Vercel functions, please use the [functions](#functions) property instead. If you'd like to deploy a monorepo, see the [Monorepo docs](/docs/monorepos).

**Type:** `Array` of build `Object`.

**Valid values:** a list of build descriptions whose `src` references valid source files.

#### Build object definition

- `src` (`String`): A glob expression or pathname. If more than one file is resolved, one build will be created per matched file. It can include `*` and `**`.
- `use` (`String`): An npm module to be installed by the build process. It can include a semver compatible version (e.g.: `@org/proj@1`).
- `config` (`Object`): Optionally, an object including arbitrary metadata to be passed to the Builder.

The following will include all HTML files as-is (to be served statically), and build all Python files and JS files into [Vercel functions](/docs/functions):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "builds": [
    { "src": "*.html", "use": "@vercel/static" },
    { "src": "*.py", "use": "@vercel/python" },
    { "src": "*.js", "use": "@vercel/node" }
  ]
}
```

When at least one `builds` item is specified, only the outputs of the build processes will be included in the resulting deployment as a security precaution. This is why we need to allowlist static files explicitly with `@vercel/static`.

### routes

We recommend using [cleanUrls](#cleanurls), [trailingSlash](#trailingslash), [redirects](#redirects), [rewrites](#rewrites), and/or [headers](#headers) instead.

The `routes` property is only meant to be used for advanced integration purposes, such as the [Build Output API](/docs/build-output-api/v3), and cannot be used in conjunction with any of the properties mentioned above.

See the [upgrading routes section](#upgrading-legacy-routes) to learn how to migrate away from this property.

**Type:** `Array` of route `Object`.

**Valid values:** a list of route definitions.

#### Route object definition

- `src`: A [PCRE-compatible regular expression](https://www.pcre.org/original/doc/html/pcrepattern.html) that matches each incoming pathname (excluding querystring).
- `methods`: A set of HTTP method types. If no method is provided, requests with any HTTP method will be a candidate for the route.
- `dest`: A destination pathname or full URL, including querystring, with the ability to embed capture groups as $1, $2…
- `headers`: A set of headers to apply for responses.
- `status`: A status code to respond with. Can be used in tandem with `Location:` header to implement redirects.
- `continue`: A boolean to change matching behavior. If `true`, routing will continue even when the `src` is matched.
- `has`: An optional array of `has` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the **presence** of specified properties
- `missing`: An optional array of `missing` objects with the `type`, `key` and `value` properties. Used for conditional path matching based on the **absence** of specified properties
- `mitigate`: An optional object with the property `action`, which can either be "challenge" or "deny". These perform [mitigation actions](/docs/vercel-firewall/vercel-waf/custom-rules#custom-rule-configuration) on requests that match the route.
- `transforms`: An optional array of `transform` objects to apply. Transform rules let you append, set, or remove request/response headers and query parameters at the edge so you can enforce security headers, inject analytics tags, or personalize content without touching your application code. See examples [below](#transform-examples).

Routes are processed in the order they are defined in the array, so wildcard/catch-all patterns should usually be last.

#### Route has and missing object definition

If `value` is an object, it has one or more of the following fields:

This example uses the expressive `value` object to define a route that will only rewrite users to `/end` if the `X-Custom-Header` header's value is prefixed by `valid` and ends with `value`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/start",
      "dest": "/end",
      "has": [
        {
          "type": "header",
          "key": "X-Custom-Header",
          "value": {
            "pre": "valid",
            "suf": "value"
          }
        }
      ]
    }
  ]
}
```

This example configures custom routes that map to static files and [Vercel functions](/docs/functions):

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/redirect",
      "status": 308,
      "headers": { "Location": "https://example.com/" }
    },
    {
      "src": "/custom-page",
      "headers": { "cache-control": "s-maxage=1000" },
      "dest": "/index.html"
    },
    { "src": "/api", "dest": "/my-api.js" },
    { "src": "/users", "methods": ["POST"], "dest": "/users-api.js" },
    { "src": "/users/(?<id>[^/]*)", "dest": "/users-api.js?id=$id" },
    { "src": "/legacy", "status": 404 },
    { "src": "/.*", "dest": "https://my-old-site.com" }
  ]
}
```

### Transform object definition

| Property | Type                                  | Description                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`   | `String`                              | Must be either `request.query`, `request.headers`, or `response.headers`. This specifies the scope of what your transforms will apply to.                                                                                                                                                                  |
| `op`     | `String`                              | These specify the possible operations:- `append` appends `args` to the value of the key, and will set if missing- `set` sets the key and value if missing- `delete` deletes the key entirely if `args` is not provided; otherwise, it will delete the value of `args` from the matching key |
| `target` | `Object`                              | An object with key `key`, which is either a `String` or an `Object`. If it is a string, it will be used as the key for the target. If it is an object, it may contain one or more of the properties [seen below.](#transform-target-object-definition)                                                     |
| `args`   | `String` or `String[]` or `undefined` | If `args` is a string or string array, it will be used as the value for the target according to the `op` property.                                                                                                                                                                                         |

#### Transform target object definition

Target is an object with a `key` property. For the `set` operation, the `key` property is used as the header or query key. For other operations, it is used as a matching condition to determine if the transform should be applied.

| Property | Type                 | Description                                                                                                                                                                               |
| -------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`    | `String` or `Object` | It may be a string or an object. If it is an object, it must have one or more of the properties defined in the [Transform key object definition](#transform-key-object-definition) below. |

#### Transform key object definition

When the `key` property is an object, it can contain one or more of the following conditional matching properties:

| Property | Type                 | Description                                |
| -------- | -------------------- | ------------------------------------------ |
| `eq`     | `String` or `Number` | Check equality on a value                  |
| `neq`    | `String`             | Check inequality on a value                |
| `inc`    | `String[]`           | Check inclusion in an array of values      |
| `ninc`   | `String[]`           | Check non-inclusion in an array of values  |
| `pre`    | `String`             | Check if value starts with a prefix        |
| `suf`    | `String`             | Check if value ends with a suffix          |
| `gt`     | `Number`             | Check if value is greater than             |
| `gte`    | `Number`             | Check if value is greater than or equal to |
| `lt`     | `Number`             | Check if value is less than                |
| `lte`    | `Number`             | Check if value is less than or equal to    |

#### Transform examples

These examples demonstrate practical use-cases for route transforms.

In this example, you remove the incoming request header `x-custom-header` from all requests and responses to the `/home` route:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/home",
      "transforms": [
        {
          "type": "request.headers",
          "op": "delete",
          "target": {
            "key": "x-custom-header"
          }
        },
        {
          "type": "response.headers",
          "op": "delete",
          "target": {
            "key": "x-custom-header"
          }
        }
      ]
    }
  ]
}
```

In this example, you override the incoming query parameter `theme` to `dark` for all requests to the `/home` route, and set if it doesn't already exist:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/home",
      "transforms": [
        {
          "type": "request.query",
          "op": "set",
          "target": {
            "key": "theme"
          },
          "args": "dark"
        }
      ]
    }
  ]
}
```

In this example, you append multiple values to the incoming request header `x-content-type-options` for all requests to the `/home` route:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/home",
      "transforms": [
        {
          "type": "request.headers",
          "op": "append",
          "target": {
            "key": "x-content-type-options"
          },
          "args": ["nosniff", "no-sniff"]
        }
      ]
    }
  ]
}
```

In this example, you delete any header that begins with `x-react-router-` for all requests to the `/home` route:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/home",
      "transforms": [
        {
          "type": "request.headers",
          "op": "delete",
          "target": {
            "key": {
              "pre": "x-react-router-"
            }
          }
        }
      ]
    }
  ]
}
```

You can integrate transforms with existing matching capabilities through the [`has` and `missing` properties for routes](/docs/project-configuration#routes), along with using expressive matching conditions through the [Transform key object definition](#transform-key-object-definition).

### Upgrading legacy routes

In most cases, you can upgrade legacy `routes` usage to the newer [`rewrites`](/docs/project-configuration#rewrites), [`redirects`](/docs/project-configuration#redirects), [`headers`](/docs/project-configuration#headers), [`cleanUrls`](/docs/project-configuration#cleanurls) or [`trailingSlash`](/docs/project-configuration#trailingslash) properties.

Here are some examples that show how to upgrade legacy `routes` to the equivalent new property.

#### Route Parameters

With `routes`, you use a [PCRE Regex](https://en.wikipedia.org/wiki/Perl_Compatible_Regular_Expressions) named group to match the ID and then pass that parameter in the query string. The following example matches a URL like `/product/532004` and proxies to `/api/product?id=532004`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [{ "src": "/product/(?<id>[^/]+)", "dest": "/api/product?id=$id" }]
}
```

With [`rewrites`](/docs/project-configuration#rewrites), named parameters are automatically passed in the query string. The following example is equivalent to the legacy `routes` usage above, but uses `rewrites` instead:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/product/:id", "destination": "/api/product" }]
}
```

#### Legacy redirects

With `routes`, you specify the status code to use a 307 Temporary Redirect. Also, this redirect needs to be defined before other routes. The following example redirects all paths in the `posts` directory to the `blog` directory, but keeps the path in the new location:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/posts/(.*)",
      "headers": { "Location": "/blog/$1" },
      "status": 307
    }
  ]
}
```

With [`redirects`](/docs/project-configuration#redirects), you disable the `permanent` property to use a 307 Temporary Redirect. Also, `redirects` are always processed before `rewrites`. The following example is equivalent to the legacy `routes` usage above, but uses `redirects` instead:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [
    {
      "source": "/posts/:id",
      "destination": "/blog/:id",
      "permanent": false
    }
  ]
}
```

#### Legacy SPA Fallback

With `routes`, you use `"handle": "filesystem"` to give precedence to the filesystem and exit early if the requested path matched a file. The following example will serve the `index.html` file for all paths that do not match a file in the filesystem:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

With [`rewrites`](/docs/project-configuration#rewrites), the filesystem check is the default behavior. If you want to change the name of files at the filesystem level, file renames can be performed during the [Build Step](/docs/deployments/configure-a-build), but not with `rewrites`. The following example is equivalent to the legacy `routes` usage above, but uses `rewrites` instead:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

#### Legacy Headers

With `routes`, you use `"continue": true` to prevent stopping at the first match. The following example adds `Cache-Control` headers to the favicon and other static assets:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [
    {
      "src": "/favicon.ico",
      "headers": { "Cache-Control": "public, max-age=3600" },
      "continue": true
    },
    {
      "src": "/assets/(.*)",
      "headers": { "Cache-Control": "public, max-age=31556952, immutable" },
      "continue": true
    }
  ]
}
```

With [`headers`](/docs/project-configuration#headers), this is no longer necessary since that is the default behavior. The following example is equivalent to the legacy `routes` usage above, but uses `headers` instead:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "headers": [
    {
      "source": "/favicon.ico",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31556952, immutable"
        }
      ]
    }
  ]
}
```

#### Legacy Pattern Matching

With `routes`, you need to escape a dot with two backslashes, otherwise it would match any character [PCRE Regex](https://en.wikipedia.org/wiki/Perl_Compatible_Regular_Expressions). The following example matches the literal `atom.xml` and proxies to `/api/rss` to dynamically generate RSS:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [{ "src": "/atom\\.xml", "dest": "/api/rss" }]
}
```

With [`rewrites`](/docs/project-configuration#rewrites), the `.` is not a special character so it does not need to be escaped. The following example is equivalent to the legacy `routes` usage above, but instead uses `rewrites`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/atom.xml", "destination": "/api/rss" }]
}
```

#### Legacy Negative Lookahead

With `routes`, you use [PCRE Regex](https://en.wikipedia.org/wiki/Perl_Compatible_Regular_Expressions) negative lookahead. The following example proxies all requests to the `/maintenance` page except for `/maintenance` itself to avoid infinite loop:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "routes": [{ "src": "/(?!maintenance)", "dest": "/maintenance" }]
}
```

With [`rewrites`](/docs/project-configuration#rewrites), the Regex needs to be wrapped. The following example is equivalent to the legacy `routes` usage above, but instead uses `rewrites`:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/((?!maintenance).*)", "destination": "/maintenance" }
  ]
}
```

#### Legacy Case Sensitivity

With `routes`, the `src` property is case-insensitive leading to duplicate content, where multiple request paths with difference cases serve the same page.

With [`rewrites`](/docs/project-configuration#rewrites) / [`redirects`](/docs/project-configuration#redirects) / [`headers`](/docs/project-configuration#headers), the `source` property is case-sensitive so you don't accidentally create duplicate content.


---

[View full sitemap](/docs/sitemap)
