---
title: Build Output Configuration
product: vercel
url: /docs/build-output-api/configuration
type: conceptual
prerequisites:
  - /docs/build-output-api
related:
  - /docs/project-configuration
  - /docs/rest-api/reference
  - /docs/image-optimization
  - /docs/domains
  - /docs/build-output-api/v3/primitives
summary: Learn about the Build Output Configuration file, which is used to configure the behavior of a Deployment.
---

# Build Output Configuration

Schema (as TypeScript):

```ts
type Config = {
  version: 3;
  routes?: Route[];
  images?: ImagesConfig;
  wildcard?: WildcardConfig;
  overrides?: OverrideConfig;
  cache?: string[];
  crons?: CronsConfig;
};
```

Config Types:

- [Route](#routes)
- [ImagesConfig](#images)
- [WildcardConfig](#wildcard)
- [OverrideConfig](#overrides)
- [CronsConfig](#crons)

The `config.json` file contains configuration information and metadata for a Deployment.
The individual properties are described in greater detail in the sub-sections below.

At a minimum, a `config.json` file with a `"version"` property is *required*.

## `config.json` supported properties

### version

The `version` property indicates which version of the Build Output API has been implemented.
The version described in this document is version `3`.

#### `version` example

```json
  "version": 3
```

### routes

The `routes` property describes the routing rules that will be applied to the Deployment. It uses the same syntax as the [`routes` property of the `vercel.json` file](/docs/project-configuration#routes).

Routes may be used to point certain URL paths to others on your Deployment, attach response headers to paths, and various other routing-related use-cases.

```ts
type Route = Source | Handler;
```

#### `Source` route

```ts
type Source = {
  src: string;
  dest?: string;
  headers?: Record<string, string>;
  methods?: string[];
  continue?: boolean;
  caseSensitive?: boolean;
  check?: boolean;
  status?: number;
  has?: HasField;
  missing?: HasField;
  locale?: Locale;
  middlewareRawSrc?: string[];
  middlewarePath?: string;
  mitigate?: Mitigate;
  transforms?: Transform[];
};
```

| Key                  | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **src**              | [String](/docs/rest-api/reference#types)       | Yes      | A PCRE-compatible regular expression that matches each incoming pathname (excluding querystring).                                            |
| **dest**             | [String](/docs/rest-api/reference#types)       | No       | A destination pathname or full URL, including querystring, with the ability to embed capture groups as $1, $2, or named capture value $name. |
| **headers**          | [Map](/docs/rest-api/reference#types)          | No       | A set of headers to apply for responses.                                                                                                     |
| **methods**          | [String\[\]](/docs/rest-api/reference#types)     | No       | A set of HTTP method types. If no method is provided, requests with any HTTP method will be a candidate for the route.                       |
| **continue**         | [Boolean](/docs/rest-api/reference#types)      | No       | A boolean to change matching behavior. If true, routing will continue even when the src is matched.                                          |
| **caseSensitive**    | [Boolean](/docs/rest-api/reference#types)      | No       | Specifies whether or not the route `src` should match with case sensitivity.                                                                 |
| **check**            | [Boolean](/docs/rest-api/reference#types)      | No       | If `true`, the route triggers `handle: 'filesystem'` and `handle: 'rewrite'`                                                                 |
| **status**           | [Number](/docs/rest-api/reference#types)       | No       | A status code to respond with. Can be used in tandem with Location: header to implement redirects.                                           |
| **has**              | HasField                                                                | No       | Conditions of the HTTP request that must exist to apply the route.                                                                           |
| **missing**          | HasField                                                                | No       | Conditions of the HTTP request that must NOT exist to match the route.                                                                       |
| **locale**           | Locale                                                                  | No       | Conditions of the Locale of the requester that will redirect the browser to different routes.                                                |
| **middlewareRawSrc** | [String\[\]](/docs/rest-api/reference#types)     | No       | A list containing the original routes used to generate the `middlewarePath`.                                                                 |
| **middlewarePath**   | [String](/docs/rest-api/reference#types)       | No       | Path to an Edge Runtime function that should be invoked as middleware.                                                                       |
| **mitigate**         | Mitigate                                                                | No       | A mitigation action to apply to the route.                                                                                                   |
| **transforms**       | Transform\[]                                                             | No       | A list of transforms to apply to the route.                                                                                                  |

##### Source route: `MatchableValue`

```ts
type MatchableValue = {
  eq?: string | number;
  neq?: string;
  inc?: string[];
  ninc?: string[];
  pre?: string;
  suf?: string;
  re?: string;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
};
```

| Key      | [Type](/docs/rest-api/reference#types)                                                                | Required | Description                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| **eq**   | [String](/docs/rest-api/reference#types) | [Number](/docs/rest-api/reference#types) | No       | Value must equal this exact value.                  |
| **neq**  | [String](/docs/rest-api/reference#types)                                                                      | No       | Value must not equal this value.                    |
| **inc**  | [String\[\]](/docs/rest-api/reference#types)                                                                    | No       | Value must be included in this array.               |
| **ninc** | [String\[\]](/docs/rest-api/reference#types)                                                                    | No       | Value must not be included in this array.           |
| **pre**  | [String](/docs/rest-api/reference#types)                                                                      | No       | Value must start with this prefix.                  |
| **suf**  | [String](/docs/rest-api/reference#types)                                                                      | No       | Value must end with this suffix.                    |
| **re**   | [String](/docs/rest-api/reference#types)                                                                      | No       | Value must match this regular expression.           |
| **gt**   | [Number](/docs/rest-api/reference#types)                                                                      | No       | Value must be greater than this number.             |
| **gte**  | [Number](/docs/rest-api/reference#types)                                                                      | No       | Value must be greater than or equal to this number. |
| **lt**   | [Number](/docs/rest-api/reference#types)                                                                      | No       | Value must be less than this number.                |
| **lte**  | [Number](/docs/rest-api/reference#types)                                                                      | No       | Value must be less than or equal to this number.    |

##### Source route: `HasField`

```ts
type HasField = Array<
  | { type: 'host'; value: string | MatchableValue }
  | {
      type: 'header' | 'cookie' | 'query';
      key: string;
      value?: string | MatchableValue;
    }
>;
```

| Key       | [Type](/docs/rest-api/reference#types)             | Required | Description                                                             |
| --------- | ----------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| **type**  | "host" | "header" | "cookie" | "query"                                           | Yes      | Determines the HasField type.                                           |
| **key**   | [String](/docs/rest-api/reference#types)                   | No\*     | Required for header, cookie, and query types. The key to match against. |
| **value** | [String](/docs/rest-api/reference#types) | MatchableValue | No       | The value to match against using string or MatchableValue conditions.   |

##### Source route: `Locale`

```ts
type Locale = {
  redirect?: Record<string, string>;
  cookie?: string;
};
```

| Key          | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                    |
| ------------ | ----------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **redirect** | [Map](/docs/rest-api/reference#types)          | Yes      | An object of keys that represent locales to check for (`en`, `fr`, etc.) that map to routes to redirect to (`/`, `/fr`, etc.). |
| **cookie**   | [String](/docs/rest-api/reference#types)       | No       | Cookie name that can override the Accept-Language header for determining the current locale.                                   |

##### Source route: `Mitigate`

```ts
type Mitigate = {
  action: 'challenge' | 'deny';
};
```

| Key        | [Type](/docs/rest-api/reference#types) | Required | Description                                   |
| ---------- | ----------------------------------------------------------------------- | -------- | --------------------------------------------- |
| **action** | "challenge" | "deny"                                                   | Yes      | The action to take when the route is matched. |

##### Source route: `Transform`

```ts
type Transform = {
  type: 'request.headers' | 'request.query' | 'response.headers';
  op: 'append' | 'set' | 'delete';
  target: {
    key: string | Omit<MatchableValue, 're'>; // re is not supported for transforms
  };
  args?: string | string[];
};
```

| Key        | [Type](/docs/rest-api/reference#types)                                                                  | Required | Description                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- |
| **type**   | "request.headers" | "response.headers" | "request.query"                                                                               | Yes      | The type of transform to apply.                                            |
| **op**     | "append" | "set" | "delete"                                                                                                            | Yes      | The operation to perform on the target.                                    |
| **target** | `{ key: string \| Omit<MatchableValue, 're'> }`                                                                                          | Yes      | The target of the transform. Regular expression matching is not supported. |
| **args**   | [String](/docs/rest-api/reference#types) | [String\[\]](/docs/rest-api/reference#types) | No       | The arguments to pass to the transform.                                    |

#### Handler route

The routing system has multiple phases. The `handle` value indicates the start of a phase. All following routes are only checked in that phase.

```ts
type HandleValue =
  | 'rewrite'
  | 'filesystem' // check matches after the filesystem misses
  | 'resource'
  | 'miss' // check matches after every filesystem miss
  | 'hit'
  | 'error'; //  check matches after error (500, 404, etc.)

type Handler = {
  handle: HandleValue;
  src?: string;
  dest?: string;
  status?: number;
};
```

| Key        | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                    |
| ---------- | ----------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| **handle** | HandleValue                                                             | Yes      | The phase of routing when all subsequent routes should apply.                                                  |
| **src**    | [String](/docs/rest-api/reference#types)       | No       | A PCRE-compatible regular expression that matches each incoming pathname (excluding querystring).              |
| **dest**   | [String](/docs/rest-api/reference#types)       | No       | A destination pathname or full URL, including querystring, with the ability to embed capture groups as $1, $2. |
| **status** | [String](/docs/rest-api/reference#types)       | No       | A status code to respond with. Can be used in tandem with `Location:` header to implement redirects.           |

#### Routing rule example

The following example shows a routing rule that will cause the `/redirect` path to perform an HTTP redirect to an external URL:

```json
  "routes": [
    {
      "src": "/redirect",
      "status": 308,
      "headers": { "Location": "https://example.com/" }
    }
  ]
```

### images

The `images` property defines the behavior of Vercel's native [Image Optimization API](/docs/image-optimization), which allows on-demand optimization of images at runtime.

```ts
type ImageFormat = 'image/avif' | 'image/webp';

type RemotePattern = {
  protocol?: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
  search?: string;
};

type LocalPattern = {
  pathname?: string;
  search?: string;
};

type ImagesConfig = {
  sizes: number[];
  domains: string[];
  remotePatterns?: RemotePattern[];
  localPatterns?: LocalPattern[];
  qualities?: number[];
  minimumCacheTTL?: number; // seconds
  formats?: ImageFormat[];
  dangerouslyAllowSVG?: boolean;
  contentSecurityPolicy?: string;
  contentDispositionType?: string;
};
```

| Key                        | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **sizes**                  | [Number\[\]](/docs/rest-api/reference#types)     | Yes      | Allowed image widths.                                                                                                                    |
| **domains**                | [String\[\]](/docs/rest-api/reference#types)     | Yes      | Allowed external domains that can use Image Optimization. Leave empty for only allowing the deployment domain to use Image Optimization. |
| **remotePatterns**         | RemotePattern\[]                                                         | No       | Allowed external patterns that can use Image Optimization. Similar to `domains` but provides more control with RegExp.                   |
| **localPatterns**          | LocalPattern\[]                                                          | No       | Allowed local patterns that can use Image Optimization. Leave undefined to allow all or use empty array to deny all.                     |
| **qualities**              | [Number\[\]](/docs/rest-api/reference#types)     | No       | Allowed image qualities. Leave undefined to allow all possibilities, 1 to 100.                                                           |
| **minimumCacheTTL**        | [Number](/docs/rest-api/reference#types)       | No       | Cache duration (in seconds) for the optimized images.                                                                                    |
| **formats**                | ImageFormat\[]                                                           | No       | Supported output image formats                                                                                                           |
| **dangerouslyAllowSVG**    | [Boolean](/docs/rest-api/reference#types)      | No       | Allow SVG input image URLs. This is disabled by default for security purposes.                                                           |
| **contentSecurityPolicy**  | [String](/docs/rest-api/reference#types)       | No       | Change the [Content Security Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) of the optimized images.                           |
| **contentDispositionType** | [String](/docs/rest-api/reference#types)       | No       | Specifies the value of the `"Content-Disposition"` response header.                                                                      |

#### `images` example

The following example shows an image optimization configuration that specifies allowed image size dimensions, external domains, caching lifetime and file formats:

```json
  "images": {
    "sizes": [640, 750, 828, 1080, 1200],
    "domains": [],
    "minimumCacheTTL": 60,
    "formats": ["image/avif", "image/webp"],
    "qualities": [25, 50, 75],
    "localPatterns": [{
      "pathname": "^/assets/.*$",
      "search": ""
    }]
    "remotePatterns": [{
      "protocol": "https",
      "hostname": "^via\\.placeholder\\.com$",
      "port": "",
      "pathname": "^/1280x640/.*$",
      "search": "?v=1"
    }]
  }
```

#### API

When the `images` property is defined, the Image Optimization API will be available by visiting the `/_vercel/image` path. When the `images` property is undefined, visiting the `/_vercel/image` path will respond with 404 Not Found.

The API accepts the following query string parameters:

| Key     | [Type](/docs/rest-api/reference#types) | Required | Example          | Description                                                                                                                             |
| ------- | ----------------------------------------------------------------------- | -------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **url** | [String](/docs/rest-api/reference#types)       | Yes      | `/assets/me.png` | The URL of the source image that should be optimized. Absolute URLs must match a pattern defined in the `remotePatterns` configuration. |
| **w**   | [Integer](/docs/rest-api/reference#types)      | Yes      | `200`            | The width (in pixels) that the source image should be resized to. Must match a value defined in the `sizes` configuration.              |
| **q**   | [Integer](/docs/rest-api/reference#types)      | Yes      | `75`             | The quality that the source image should be reduced to. Must be between 1 (lowest quality) to 100 (highest quality).                    |

### wildcard

The `wildcard` property relates to Vercel's Internationalization feature. The way
it works is the domain names listed in this array are mapped to the `$wildcard`
routing variable, which can be referenced by the [`routes` configuration](#routes).

Each of the domain names specified in the `wildcard` configuration will need to
be assigned as [Production Domains in the Project Settings](/docs/domains).

```ts
type WildCard = {
  domain: string;
  value: string;
};

type WildcardConfig = Array<WildCard>;
```

#### `wildcard` supported properties

Objects contained within the `wildcard` configuration support the following properties:

| Key        | [Type](/docs/rest-api/reference#types) | Required | Description                                                                        |
| ---------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| **domain** | [String](/docs/rest-api/reference#types)       | Yes      | The domain name to match for this wildcard configuration.                          |
| **value**  | [String](/docs/rest-api/reference#types)       | Yes      | The value of the `$wildcard` match that will be available for `routes` to utilize. |

#### `wildcard` example

The following example shows a wildcard configuration where the matching
domain name will be served the localized version of the blog post HTML file:

```json
  "wildcard": [
    {
      "domain": "example.com",
      "value": "en-US"
    },
    {
      "domain": "example.nl",
      "value": "nl-NL"
    },
    {
      "domain": "example.fr",
      "value": "fr"
    }
  ],
  "routes": [
    { "src": "/blog", "dest": "/blog.$wildcard.html" }
  ]
```

### overrides

The `overrides` property allows for overriding the output of one or more [static files](/docs/build-output-api/v3/primitives#static-files) contained
within the `.vercel/output/static` directory.

The main use-cases are to override the `Content-Type` header that will be served for a static file,
and/or to serve a static file in the Vercel Deployment from a different URL path than how it is stored on the file system.

```ts
type Override = {
  path?: string;
  contentType?: string;
};

type OverrideConfig = Record<string, Override>;
```

#### `overrides` supported properties

Objects contained within the `overrides` configuration support the following properties:

| Key             | [Type](/docs/rest-api/reference#types) | Required | Description                                                                                    |
| --------------- | ----------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| **path**        | [String](/docs/rest-api/reference#types)       | No       | The URL path where the static file will be accessible from.                                    |
| **contentType** | [String](/docs/rest-api/reference#types)       | No       | The value of the `Content-Type` HTTP response header that will be served with the static file. |

#### `overrides` example

The following example shows an override configuration where an HTML file can be accessed
without the `.html` file extension:

```json
  "overrides": {
    "blog.html": {
      "path": "blog"
    }
  }
```

### cache

The `cache` property is an array of file paths and/or glob patterns that should be re-populated
within the build sandbox upon subsequent Deployments.

Note that this property is only relevant when Vercel is building a Project from source
code, meaning it is not relevant when building locally or when creating a Deployment
from "prebuilt" build artifacts.

```ts
type Cache = string[];
```

#### `cache` example

```json
  "cache": [
    ".cache/**",
    "node_modules/**"
  ]
```

### framework

The optional `framework` property is an object describing the framework of the built outputs.

This value is used for display purposes only.

```ts
type Framework = {
  version: string;
};
```

#### `framework` example

```json
  "framework": {
    "version": "1.2.3"
  }
```

### crons

The optional `crons` property is an object describing the [cron jobs](/docs/cron-jobs) for the production deployment of a project.

```ts
type Cron = {
  path: string;
  schedule: string;
};

type CronsConfig = Cron[];
```

#### `crons` example

```json
  "crons": [{
    "path": "/api/cron",
    "schedule": "0 0 * * *"
  }]
```

## Full `config.json` example

```json
{
  "version": 3,
  "routes": [
    {
      "src": "/redirect",
      "status": 308,
      "headers": { "Location": "https://example.com/" }
    },
    {
      "src": "/blog",
      "dest": "/blog.$wildcard.html"
    }
  ],
  "images": {
    "sizes": [640, 750, 828, 1080, 1200],
    "domains": [],
    "minimumCacheTTL": 60,
    "formats": ["image/avif", "image/webp"],
    "qualities": [25, 50, 75],
    "localPatterns": [{
      "pathname": "^/assets/.*$",
      "search": ""
    }]
    "remotePatterns": [
      {
        "protocol": "https",
        "hostname": "^via\\.placeholder\\.com$",
        "port": "",
        "pathname": "^/1280x640/.*$",
        "search": "?v=1"
      }
    ]
  },
  "wildcard": [
    {
      "domain": "example.com",
      "value": "en-US"
    },
    {
      "domain": "example.nl",
      "value": "nl-NL"
    },
    {
      "domain": "example.fr",
      "value": "fr"
    }
  ],
  "overrides": {
    "blog.html": {
      "path": "blog"
    }
  },
  "cache": [".cache/**", "node_modules/**"],
  "framework": {
    "version": "1.2.3"
  },
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "* * * * *"
    }
  ]
}
```


---

[View full sitemap](/docs/sitemap)
