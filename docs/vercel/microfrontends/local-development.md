---
title: Local Development
product: vercel
url: /docs/microfrontends/local-development
type: conceptual
prerequisites:
  - /docs/microfrontends
related:
  - /docs/microfrontends/quickstart
  - /docs/deployment-protection
  - /docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation
summary: Learn about local development on Vercel.
---

# Microfrontends local development

To provide a seamless local development experience, `@vercel/microfrontends` provides a microfrontends aware local development proxy to run alongside your development servers. This proxy allows you to only run a single microfrontend locally while making sure that all microfrontend requests still work.

## The need for a microfrontends proxy

Microfrontends allow teams to split apart an application and only run an individual microfrontend to improve developer velocity. A downside of this approach is that requests to the other microfrontends won't work unless that microfrontend is also running locally. The microfrontends proxy solves this by intelligently falling back to route microfrontend requests to production for those applications that are not running locally.

For example, if you have two microfrontends `web` and `docs`:

```json filename="microfrontends.json"
{
  "$schema": "https://openapi.vercel.sh/microfrontends.json",
  "applications": {
    "web": {
      "development": {
        "fallback": "vercel.com"
      }
    },
    "docs": {
      "routing": [
        {
          "paths": ["/docs/:path*"]
        }
      ]
    }
  }
}
```

A developer working on `/docs` only runs the **Docs** microfrontend, while a developer working on `/blog` only runs the **Web** microfrontend. If a **Docs** developer wants to test a transition between `/docs` and `/blog` , they need to run both microfrontends locally. This is not the case with the microfrontends proxy as it routes requests to `/blog` to the instance of **Web** that is running in production.

Therefore, the microfrontends proxy allows developers to run only the microfrontend they are working on locally and be able to test paths in other microfrontends.

> **⚠️ Warning:** When developing locally with Next.js any traffic a child application receives
> will be redirected to the local proxy. Setting the environment variable
> `MFE_DISABLE_LOCAL_PROXY_REWRITE=1` will disable the redirect and allow you to
> visit the child application directly.

## Setting up microfrontends proxy

### Prerequisites

- Set up your [microfrontends on Vercel](/docs/microfrontends/quickstart)
- All applications that are part of the microfrontend have `@vercel/microfrontends` listed as a dependency
- Optional: [Turborepo](https://turborepo.com) in your repository

- ### Application setup
  In order for the local proxy to redirect traffic correctly, it needs to know which port each application's development server will be using. To keep the development server and the local proxy in sync, you can use the `microfrontends port` command provided by `@vercel/microfrontends` which will automatically assign a port.
  ```json {4} filename="package.json"
  {
    "name": "web",
    "scripts": {
      "dev": "next --port $(microfrontends port)"
    },
    "dependencies": {
      "@vercel/microfrontends": "latest"
    }
  }
  ```
  If you would like to use a specific port for each application, you may configure that in `microfrontends.json`:
  ```json {11-15} filename="microfrontends.json"
  {
    "$schema": "https://openapi.vercel.sh/microfrontends.json",
    "applications": {
      "web": {},
      "docs": {
        "routing": [
          {
            "paths": ["/docs/:path*"]
          }
        ],
        "development": {
          "task": "start",
          "local": 3001
        }
      }
    }
  }
  ```
  The `local` field may also contain a host or protocol (for example, `my.special.localhost.com:3001` or `https://my.localhost.com:3030`).

  If the name of the application in `microfrontends.json` (such as `web` or `docs`) does not match the name used in `package.json`, you can also set the `packageName` field for the application so that the local development proxy knows if the application is running locally.
  ```json {11} filename="microfrontends.json"
  {
    "$schema": "https://openapi.vercel.sh/microfrontends.json",
    "applications": {
      "web": {},
      "docs": {
        "routing": [
          {
            "paths": ["/docs/:path*"]
          }
        ],
        "packageName": "my-docs-package"
      }
    }
  }
  ```
  ```json {2} filename="package.json"
  {
    "name": "my-docs-package",
    "scripts": {
      "dev": "next --port $(microfrontends port)"
    },
    "dependencies": {
      "@vercel/microfrontends": "latest"
    }
  }
  ```

- ### Starting local proxy
  The local proxy is started automatically when running a microfrontend development task with `turbo`. By default a microfrontend application's `dev` script is selected as the development task, but this can be changed with the `task` field in `microfrontends.json`.

  Running `turbo web#dev` will start the `web` microfrontends development server along with a local proxy that routes all requests for `docs` to the configured production host.
  > **💡 Note:** This requires version `2.3.6` or `2.4.2` or newer of the `turbo` package.

- ### Setting up your monorepo
  - ### Option 1: Adding Turborepo to a monorepo
    Turborepo is the suggested way to work with microfrontends as it provides a managed way for running multiple applications and a proxy simultaneously.

    If you don't already use [Turborepo](https://turborepo.com) in your monorepo, `turbo` can infer a configuration from your `microfrontends.json`. This allows you to start using Turborepo in your monorepo without any additional configuration.

    To get started, follow the [Installing `turbo`](https://turborepo.com/docs/getting-started/installation#installing-turbo) guide.

    Once you have installed `turbo`, run your development tasks using `turbo` instead of your package manager. This will start the local proxy alongside the development server.

    You can start the development task for the **Web** microfrontend by running `turbo run dev --filter=web`. Review Turborepo's [filter documentation](https://turborepo.com/docs/reference/run#--filter-string) for details about filtering tasks.

    For more information on adding Turborepo to your repository, review [adding Turborepo to an existing repository](https://turborepo.com/docs/getting-started/add-to-existing-repository).
  - ### Option 2: Using without Turborepo
    If you do not want to use Turborepo, you can invoke the proxy directly.
    ```json {5} filename="package.json"
    {
      "name": "web",
      "scripts": {
        "dev": "next --port $(microfrontends port)",
        "proxy": "microfrontends proxy microfrontends.json --local-apps web"
      },
      "dependencies": {
        "@vercel/microfrontends": "latest"
      }
    }
    ```
    Review [Understanding the proxy command](#understanding-the-proxy-command) for more details.

- ### Accessing the microfrontends proxy
  When testing locally, you should use the port from the microfrontends proxy to test your application. For example, if `docs` runs on port `3001` and the microfrontends proxy is on port `3024`, you should visit `http://localhost:3024/docs` to test all parts of their application.

  You can change the port of the local development proxy by setting `options.localProxyPort` in `microfrontends.json`:
  ```json {6} filename="microfrontends.json"
  {
    "applications": {
      // ...
    },
    "options": {
      "localProxyPort": 4001
    }
  }
  ```

## Debug routing

To debug issues with microfrontends locally, enable microfrontends debug mode when running your application. Details about changes to your application, such as environment variables and rewrites, will be printed to the console. If using the [local development proxy](/docs/microfrontends/local-development), the logs will also print the name of the application and URL of the destination where each request was routed to.

1. Set an environment variable `MFE_DEBUG=1`
2. Or, set `debug` to `true` when calling `withMicrofrontends`

## Polyrepo setup

If you're working with a polyrepo setup where microfrontends are distributed across separate repositories, you'll need additional configuration since the `microfrontends.json` file won't be automatically detected.

### Accessing the configuration file

First, ensure that each microfrontend repository has access to the shared configuration:

- **Option 1: Use the Vercel CLI** to fetch the configuration:

  ```bash
  vercel microfrontends pull
  ```

  This command will download the `microfrontends.json` file from your default application to your local repository.

  If you haven't linked your project yet, the command will prompt you to [link your project to Vercel](https://vercel.com/docs/cli/project-linking) first.

  > **💡 Note:** This command requires the Vercel CLI 44.2.2 to be installed.

- **Option 2: Set the `VC_MICROFRONTENDS_CONFIG` environment variable** with a path pointing to your `microfrontends.json` file:

  ```bash
  export VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json
  ```

  You can also add this to your `.env` file:

  ```bash filename=".env"
  VC_MICROFRONTENDS_CONFIG=/path/to/microfrontends.json
  ```

### Running the local development proxy

In a polyrepo setup, you'll need to start each microfrontend application separately since they're in different repositories. Unlike monorepos where Turborepo can manage multiple applications, polyrepos require manual coordination:

- ### Start your local microfrontend application
  Start your microfrontend application with the proper port configuration. Follow the [Application setup](/docs/microfrontends/local-development#application-setup) instructions to configure your development script with the `microfrontends port` command.

- ### Run the microfrontends proxy
  In the same or a separate terminal, start the microfrontends proxy:
  ```bash
  microfrontends proxy --local-apps your-app-name
  ```
  Make sure to specify the correct application name that matches your `microfrontends.json` configuration.

- ### Access your application
  Visit the proxy URL shown in the terminal output (typically `http://localhost:3024`) to test the full microfrontends experience. This URL will route requests to your local app or production fallbacks as configured.

Since you're working across separate repositories, you'll need to manually start any other microfrontends you want to test locally, each in their respective repository.

## Understanding the proxy command

When setting up your monorepo without turborepo, the `proxy` command used inside the `package.json` scripts has the following specifications:

- `microfrontends` is an executable provided by the `@vercel/microfrontends` package.
  - You can also run it with a command like `npm exec microfrontends ...` (or the equivalent for your package manager), as long as it's from a context where the `@vercel/microfrontends` package is installed.
- `proxy` is a sub-command to run the local proxy.
- `microfrontends.json` is the path to your microfrontends configuration file. If you have a monorepo, you may also leave this out and the script will attempt to locate the file automatically.
- `--local-apps` is followed by a space separated list of the applications running locally. For the applications provided in this list, the local proxy will route requests to those local applications. Requests for other applications will be routed to the `fallback` URL specified in your microfrontends configuration for that app.

For example, if you are running the **Web** and **Docs** microfrontends locally, this command would set up the local proxy to route requests locally for those applications, and requests for the remaining applications to their fallbacks:

```json filename="package.json"
microfrontends proxy microfrontends.json --local-apps web docs
```

We recommend having a proxy command associated with each application in your microfrontends group. For example:

- If you run `npm run docs-dev` to start up your `docs` application for local development, set up `npm run docs-proxy` as well
  - This should pass `--local-apps docs` so it sends requests to the local `docs` application, and everything else to the fallback.

Therefore, you can run `npm run docs-dev` and `npm run docs-proxy` to get the full microfrontends setup running locally.

## Falling back to protected deployments

To fall back to a Vercel deployment protected with [Deployment Protection](/docs/deployment-protection), set an environment variable with the value of the [Protection Bypass for Automation](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

You must name the environment variable `AUTOMATION_BYPASS_<transformed app name>`. The name is transformed to be uppercase, and any non letter or number is replaced with an underscore.

For example, the env var name for an app named `my-docs-app` would be:
`AUTOMATION_BYPASS_MY_DOCS_APP`.

### Set the protection bypass environment variable

- ### Enable the Protection Bypass for Automation for your project
  1. Navigate to the Vercel **project for the protected fallback deployment**
  2. Click on the **Settings** tab
  3. Click on **Deployment Protection**
  4. If not enabled, create a new [Protection Bypass for Automation](/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation)
  5. Copy the value of the secret

- ### Set the environment variable in the default app project
  1. Navigate to the Vercel project for the **default application** (may or may not be the same project)
  2. Click on the **Settings** tab
  3. Click on **Environment Variables**
  4. Add a new variable with the name `AUTOMATION_BYPASS_<transformed app name>` (e.g. `AUTOMATION_BYPASS_MY_DOCS_APP`) and the value of the secret from the previous step
  5. Set the selected environments for the variable to `Development`
  6. Click on **Save**

- ### Import the secret using vc env pull
  1. Ensure you have [vc](https://vercel.com/cli) installed
  2. Navigate to the root of the default app folder
  3. Run `vc login` to authenticate with Vercel
  4. Run `vc link` to link the folder to the Vercel project
  5. Run `vc env pull` to pull the secret into your local environment

- ### Update your README.md
  Include [the previous step](#import-the-secret-using-vc-env-pull) in your repository setup instructions, so that other users will also have the secret available.


---

[View full sitemap](/docs/sitemap)
