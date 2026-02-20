---
title: Vercel Primitives
product: vercel
url: /docs/build-output-api/primitives
type: reference
prerequisites:
  - /docs/build-output-api
related:
  - /docs/cdn
  - /docs/build-output-api/v3/configuration
  - /docs/functions
  - /docs/rest-api/reference
  - /docs/functions/runtimes
summary: Learn about the Vercel platform primitives and how they work together to create a Vercel Deployment.
---

# Vercel Primitives

The following directories, code files, and configuration files represent all Vercel platform primitives.
These primitives are the "building blocks" that make up a Vercel Deployment.

Files outside of these directories are ignored and will not be served to visitors.

## Static files

Static files that are *publicly accessible* from the Deployment URL should be placed in the `.vercel/output/static` directory.

These files are served with the [Vercel Edge CDN](/docs/cdn).

Files placed within this directory will be made available at the root (`/`) of the Deployment URL and neither their contents, nor their file name or extension will be modified in any way. Sub directories within `static` are also retained in the URL, and are appended before the file name.

### Configuration

There is no standalone configuration file that relates to static files.

However, certain properties of static files (such as the `Content-Type` response header) can be modified by utilizing the [`overrides` property of the `config.json` file](/docs/build-output-api/v3/configuration#overrides).

### Directory structure for static files

The following example shows static files placed into the `.vercel/output/static` directory:

## Serverless Functions

A [Vercel Function](/docs/functions) is represented on the file system as
a directory with a `.func` suffix on the name, contained within the `.vercel/output/functions` directory.

Conceptually, you can think of this `.func` directory as a filesystem mount for a Vercel Function:
the files below the `.func` directory are included (recursively) and files above the `.func` directory are not included.
Private files may safely be placed within this directory
because they will not be directly accessible to end-users. However, they can be referenced by code
that will be executed by the Vercel Function.

A `.func` directory may be a symlink to another `.func` directory in cases where you want to have more than one path point to the same underlying Vercel Function.

A configuration file named `.vc-config.json` **must** be included within the `.func` directory,
which contains information about how Vercel should construct the Vercel Function.

The `.func` suffix on the directory name is *not included* as part of the URL path of Vercel Function on the Deployment.
For example, a directory located at `.vercel/output/functions/api/posts.func` will be accessible at the URL path `/api/posts` of the Deployment.

### Serverless function configuration

The `.vc-config.json` configuration file contains information related to how the Vercel Function will be created by Vercel.

#### Base config

```ts
type ServerlessFunctionConfig = {
  handler: string;
  runtime: string;
  memory?: number;
  maxDuration?: number;
  environment: Record<string, string>[];
  regions?: string[];
  supportsWrapper?: boolean;
  supportsResponseStreaming?: boolean;
};
```

| Key                           | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **runtime**                   | [String](/docs/rest-api/reference#types)       | Yes      | Specifies which "runtime" will be used to execute the Vercel Function. See [Runtimes](/docs/functions/runtimes) for more information.                     |
| **handler**                   | [String](/docs/rest-api/reference#types)       | Yes      | Indicates the initial file where code will be executed for the Vercel Function.                                                                           |
| **memory**                    | [Integer](/docs/rest-api/reference#types)      | No       | Amount of memory (RAM in MB) that will be allocated to the Vercel Function. See [size limits](/docs/functions/runtimes#size-limits) for more information. |
| **architecture**              | [String](/docs/rest-api/reference#types)       | No       | Specifies the instruction set "architecture" the Vercel Function supports. Either `x86_64` or `arm64`. The default value is `x86_64`.                     |
| **maxDuration**               | [Integer](/docs/rest-api/reference#types)      | No       | Maximum duration (in seconds) that will be allowed for the Vercel Function. See [size limits](/docs/functions/runtimes#size-limits) for more information. |
| **environment**               | [Map](/docs/rest-api/reference#types)          | No       | Map of additional environment variables that will be available to the Vercel Function, in addition to the env vars specified in the Project Settings.     |
| **regions**                   | [String\[\]](/docs/rest-api/reference#types)     | No       | List of Vercel Regions where the Vercel Function will be deployed to.                                                                                     |
| **supportsWrapper**           | [Boolean](/docs/rest-api/reference#types)      | No       | True if a custom runtime has support for Lambda runtime wrappers.                                                                                         |
| **supportsResponseStreaming** | [Boolean](/docs/rest-api/reference#types)      | No       | When true, the Vercel Function will stream the response to the client.                                                                                    |

#### Node.js config

This extends the [Base Config](#base-config) for Node.js Serverless Functions.

```ts
type NodejsServerlessFunctionConfig = ServerlessFunctionConfig & {
  launcherType: 'Nodejs';
  shouldAddHelpers?: boolean; // default: false
  shouldAddSourcemapSupport?: boolean; // default: false
};
```

| Key                           | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **launcherType**              | "Nodejs"                                                                | Yes      | Specifies which launcher to use. Currently only "Nodejs" is supported.                                                                         |
| **shouldAddHelpers**          | [Boolean](/docs/rest-api/reference#types)      | No       | Enables request and response helpers methods.                                                                                                  |
| **shouldAddSourcemapSupport** | [Boolean](/docs/rest-api/reference#types)      | No       | Enables source map support for stack traces at runtime.                                                                                        |
| **awsLambdaHandler**          | [String](/docs/rest-api/reference#types)       | No       | [AWS Handler Value](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html) for when the serverless function uses AWS Lambda syntax. |

#### Node.js config example

This is what the `.vc-config.json` configuration file could look like in a real scenario:

```json
{
  "runtime": "nodejs22.x",
  "handler": "serve.js",
  "maxDuration": 3,
  "launcherType": "Nodejs",
  "shouldAddHelpers": true,
  "shouldAddSourcemapSupport": true
}
```

### Directory structure for Serverless Functions

The following example shows a directory structure where the Vercel Function will be accessible at the `/serverless` URL path of the Deployment:

## Edge Functions

An [Edge Function](/docs/functions/edge-functions) is represented on the file system as
a directory with a `.func` suffix on the name, contained within the `.vercel/output/functions` directory.

The `.func` directory requires at least one JavaScript or TypeScript source file which will serve as the `entrypoint` of the function. Additional source files may also be included in the `.func` directory. All imported source files will be *bundled* at build time.

WebAssembly (Wasm) files may also be placed in this directory for an Edge Function to import.
See [Using a WebAssembly file](/docs/functions/runtimes/wasm) for more information.

A configuration file named `.vc-config.json` **must** be included within the `.func` directory, which contains information about how Vercel should configure the Edge Function.

The `.func` suffix is *not included* in the URL path. For example, a directory located at `.vercel/output/functions/api/edge.func` will be accessible at the URL path `/api/edge` of the Deployment.

### Supported content types

Edge Functions will bundle an `entrypoint` and all supported source files that are imported by that `entrypoint`. The following list includes all supported content types by their common file extensions.

- `.js`
- `.json`
- `.wasm`

### Edge Function configuration

The `.vc-config.json` configuration file contains information related to how the Edge Function will be created by Vercel.

```ts
type EdgeFunctionConfig = {
  runtime: 'edge';
  entrypoint: string;
  envVarsInUse?: string[];
  regions?: 'all' | string | string[];
};
```

| Key              | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                                                                        |
| ---------------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **runtime**      | ["edge"](/docs/rest-api/reference#types)       | Yes      | The `runtime: "edge"` property is required to indicate that this directory represents an Edge Function.                                                                            |
| **entrypoint**   | [String](/docs/rest-api/reference#types)       | Yes      | Indicates the initial file where code will be executed for the Edge Function.                                                                                                      |
| **envVarsInUse** | [String\[\]](/docs/rest-api/reference#types)     | No       | List of environment variable names that will be available for the Edge Function to utilize.                                                                                        |
| **regions**      | [String\[\]](/docs/rest-api/reference#types)     | No       | List of regions or a specific region that the edge function will be available in, defaults to `all`. [View available regions](/docs/regions#region-list). |

#### Edge Function config example

This is what the `.vc-config.json` configuration file could look like in a real scenario:

```json
{
  "runtime": "edge",
  "entrypoint": "index.js",
  "envVarsInUse": ["DATABASE_API_KEY"]
}
```

### Directory structure for Edge Functions

The following example shows a directory structure where the Edge Function will be accessible at the `/edge` URL path of the Deployment:

## Prerender Functions

A Prerender asset is a Vercel Function that will be cached by the Vercel CDN
in the same way as a static file. This concept is also known as [Incremental Static Regeneration](/docs/incremental-static-regeneration).

On the file system, a Prerender is represented in the same way as a Vercel Function,
with an additional configuration file that describes the cache invalidation rules for the Prerender asset.

An optional "fallback" static file can also be specified, which will be served when there is no cached version available.

### Prerender configuration file

The `<name>.prerender-config.json` configuration file contains information related to how the Prerender Function will be created by Vercel.

```ts
type PrerenderFunctionConfig = {
  expiration: number | false;
  group?: number;
  bypassToken?: string;
  fallback?: string;
  allowQuery?: string[];
  passQuery?: boolean;
  initialHeaders?: Record<string, string>;
  initialStatus?: number;
  exposeErrBody?: boolean;
};
```

| Key                | [Type](/docs/rest-api/reference#types)                 | Required | Description                                                                                                                                                                                          |
| ------------------ | --------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **expiration**     | [Integer | false](/docs/rest-api/reference#types)         | Yes      | Expiration time (in seconds) before the cached asset will be re-generated by invoking the Vercel Function. Setting the value to `false` means it will never expire.                                  |
| **group**          | [Integer](/docs/rest-api/reference#types)                      | No       | Option group number of the asset. Prerender assets with the same group number will all be re-validated at the same time.                                                                             |
| **bypassToken**    | [String](/docs/draft-mode)                                     | No       | Random token assigned to the `__prerender_bypass` cookie when [Draft Mode](/docs/draft-mode) is enabled, in order to safely bypass the CDN cache                                                     |
| **fallback**       | [String](/docs/rest-api/reference#types)                       | No       | Name of the optional fallback file relative to the configuration file.                                                                                                                               |
| **allowQuery**     | [String\[\]](/docs/rest-api/reference#types)                     | No       | List of query string parameter names that will be cached independently. If an empty array, query values are not considered for caching. If undefined each unique query value is cached independently |
| **passQuery**      | [Boolean](/docs/rest-api/reference#types)                      | No       | When true, the query string will be present on the `request` argument passed to the invoked function. The `allowQuery` filter still applies.                                                         |
| **initialHeaders** | [Record\<string, string>](/docs/rest-api/reference#types) | No       | Initial headers to be included with the prerendered response that was generated at build time.                                                                                                       |
| **initialStatus**  | [Integer](/docs/rest-api/reference#types)                      | No       | Initial HTTP status code to be included with the prerendered response that was generated at build time. (default 200)                                                                                |
| **exposeErrBody**  | [Boolean](/docs/rest-api/reference#types)                      | No       | When true, expose the response body regardless of status code including error status codes. (default false)                                                                                          |

#### Fallback static file

A Prerender asset may also include a static "fallback" version that is generated at build-time.
The fallback file will be served by Vercel while there is not yet a cached version that was generated during runtime.

When the fallback file is served, the Vercel Function will also be invoked "out-of-band" to
re-generate a new version of the asset that will be cached and served for future HTTP requests.

#### Prerender config example

This is what an `example.prerender-config.json` file could look like in a real scenario:

```json
{
  "expiration": 60,
  "group": 1,
  "bypassToken": "03326da8bea31b919fa3a31c85747ddc",
  "fallback": "example.prerender-fallback.html",
  "allowQuery": ["id"]
}
```

### Directory structure for Prerender Functions

The following example shows a directory structure where the Prerender will be accessible at the `/blog` URL path of the Deployment:


---

[View full sitemap](/docs/sitemap)
