---
title: Supported Node.js versions
product: vercel
url: /docs/functions/runtimes/node-js/node-js-versions
type: reference
prerequisites:
  - /docs/functions/runtimes/node-js
  - /docs/functions/runtimes
related:
  []
summary: Learn about the supported Node.js versions on Vercel.
---

# Supported Node.js versions

## Default and available versions

By default, a new project uses the latest Node.js LTS version available on Vercel.

Current available versions are:

- **24.x** (default)
- **22.x**
- **20.x**

Only major versions are available. Vercel automatically rolls out minor and patch updates when needed, such as to fix a security issue.

## Setting the Node.js version in project settings

To override the [default](#default-and-available-versions) version and set a different Node.js version for new deployments:

1. From your dashboard, select your project.
2. Select the **Settings** tab.
3. On the **Build and Deployment** page, navigate to the **Node.js Version** section.
4. Select the version you want to use from the dropdown. This Node.js version will be used for new deployments.

![Image](`/front/docs/functions/node-version-light.png`)

## Version overrides in `package.json`

You can define the major Node.js version in the `engines#node` section of the `package.json` to override the one you have selected in the [Project Settings](#setting-the-node.js-version-in-project-settings):

```json filename="package.json"
{
  "engines": {
    "node": "24.x"
  }
}
```

For instance, when you set the Node.js version to **20.x** in the **Project Settings** and you specify a valid [semver range](https://semver.org/) for **Node.js 24** (e.g. `24.x`) in `package.json`, your project will be deployed with the **latest 24.x** version of Node.js.

The following table lists some example version ranges and the available Node.js version they map to:

| Version in `package.json`               | Version deployed        |
| --------------------------------------- | ----------------------- |
| `24.x` `^24.0.0` `>=20.0.0` | latest **24.x** version |
| `22.x` `^22.0.0`                  | latest **22.x** version |
| `20.x` `^20.0.0`                  | latest **20.x** version |

## Checking your deployment's Node.js version

To verify the Node.js version your Deployment is using, either run `node -v` in the Build Command or log `process.version`.


---

[View full sitemap](/docs/sitemap)
