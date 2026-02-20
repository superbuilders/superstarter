---
title: Configuration
product: vercel
url: /docs/microfrontends/configuration
type: conceptual
prerequisites:
  - /docs/microfrontends
related:
  - /docs/microfrontends/quickstart
  - /docs/builds/configure-a-build
  - /docs/environment-variables/managing-environment-variables
summary: Learn about configuration on Vercel.
---

# Microfrontends Configuration

The `microfrontends.json` file is used to configure your microfrontends. If this file is not deployed with your [default application](/docs/microfrontends/quickstart#key-concepts), the deployment will not be a microfrontend.

## Schema

## Example

```json filename="microfrontends.json"
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "nextjs-pages-dashboard": {
      "development": {
        "fallback": "nextjs-pages-dashboard.vercel.app"
      }
    },
    "nextjs-pages-blog": {
      "routing": [
        {
          "paths": ["/blog/:path*"]
        },
        {
          "flag": "enable-flagged-blog-page",
          "paths": ["/flagged/blog"]
        }
      ]
    }
  }
}
```

## Application Naming

If the application name differs from the `name` field in `package.json` for the application, you should either rename the name field in `package.json` to match or add the `packageName` field to the microfrontends configuration.

```json filename="microfrontends.json"
    "docs": {
      "packageName": "name-from-package-json",
      "routing": [
        {
          "group": "docs",
          "paths": ["/docs/:path*"]
        }
      ]
    }
```

## File Naming

The microfrontends configuration file can be named either `microfrontends.json` or `microfrontends.jsonc`.

You can also define a custom configuration file by setting the `VC_MICROFRONTENDS_CONFIG_FILE_NAME` environment variable — for example, `microfrontends-dev.json`. The file name must end with either `.json` or `.jsonc`, and it may include a path, such as `/path/to/microfrontends.json`. The filename / path specified is relative to the [root directory](/docs/builds/configure-a-build#root-directory) for the [default application](/docs/microfrontends/quickstart#key-concepts).

Be sure to add the [environment variable](/docs/environment-variables/managing-environment-variables) to all projects within the microfrontends group.

Using a custom file name allows the same repository to support multiple microfrontends groups, since each group can have its own configuration file.

If you're using Turborepo, define the environment variable **outside** of the Turbo invocation when running `turbo dev`, so the local proxy can detect and use the correct configuration file.

```bash
VC_MICROFRONTENDS_CONFIG_FILE_NAME="microfrontends-dev.json" turbo dev
```


---

[View full sitemap](/docs/sitemap)
