---
title: Package Managers
product: vercel
url: /docs/package-managers
type: reference
prerequisites:
  []
related:
  - /docs/deployments/builds
  - /docs/deployments/configure-a-build
  - /docs/deployments/logs
  - /docs/project-configuration
summary: Discover the package managers supported by Vercel for dependency management. Learn how Vercel detects and uses npm, Yarn, pnpm, and Bun for optimal...
---

# Package Managers

Vercel will automatically detect the package manager used in your project and install the dependencies when you [create a deployment](/docs/deployments/builds#build-process). It does this by looking at the lock file in your project and inferring the correct package manager to use.

If you are using [Corepack](/docs/deployments/configure-a-build#corepack), Vercel will use the package manager specified in the `package.json` file's `packageManager` field instead.

## Supported package managers

The following table lists the package managers supported by Vercel, with their install commands and versions:

| Package Manager                                                                                                                   | Lock File                                                                                                                     | Install Command                                                         | Supported Versions |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| Yarn                                                                                                                              | [`yarn.lock`](https://classic.yarnpkg.com/lang/en/docs/yarn-lock/)                                                            | [`yarn install`](https://classic.yarnpkg.com/lang/en/docs/cli/install/) | 1, 2, 3            |
| npm                                                                                                                               | [`package-lock.json`](https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json)                                       | [`npm install`](https://docs.npmjs.com/cli/v8/commands/npm-install)     | 8, 9, 10           |
| pnpm                                                                                                                              | [`pnpm-lock.yaml`](https://pnpm.io/git)                                                                                       | [`pnpm install`](https://pnpm.io/cli/install)                           | 6, 7, 8, 9, 10     |
| Bun 1                                                                                                                             | [`bun.lockb`](https://bun.sh/docs/install/lockfile) or [`bun.lock`](https://bun.sh/docs/install/lockfile#text-based-lockfile) | [`bun install`](https://bun.sh/docs/cli/install)                        | 1                  |
| Vlt  | `vlt-lock.json`                                                                                                               | [`vlt install`](https://docs.vlt.sh/)                                   | 0.x                |

While Vercel automatically selects the package manager based on the lock file present in your project, the specific version of that package manager is determined by the version information in the lock file or associated configuration files.

The npm and pnpm package managers create a `lockfileVersion` property when they generate a lock file. This property specifies the lock file's format version, ensuring proper processing and compatibility. For example, a `pnpm-lock.yaml` file with `lockfileVersion: 9.0` will be interpreted by pnpm 9, while a `pnpm-lock.yaml` file with `lockfileVersion: 5.4` will be interpreted by pnpm 7.

| Package Manager | Condition                    | Install Command                    | Version Used   |
| --------------- | ---------------------------- | ---------------------------------- | -------------- |
| pnpm            | `pnpm-lock.yaml`: present    | `pnpm install`                     | Varies         |
|                 | `lockfileVersion`: 9.0       | -                                  | pnpm 9 or 10\* |
|                 | `lockfileVersion`: 7.0       | -                                  | pnpm 9         |
|                 | `lockfileVersion`: 6.0/6.1   | -                                  | pnpm 8         |
|                 | `lockfileVersion`: 5.3/5.4   | -                                  | pnpm 7         |
|                 | Otherwise                    | -                                  | pnpm 6         |
| npm             | `package-lock.json`: present | `npm install`                      | Varies         |
|                 | `lockfileVersion`: 2         | -                                  | npm 8          |
|                 | Node 20                      | -                                  | npm 10         |
|                 | Node 22                      | -                                  | npm 10         |
| Bun             | `bun.lockb`: present         | `bun install`                      | Bun <1.2      |
|                 | `bun.lock`: present          | `bun install --save-text-lockfile` | Bun 1          |
|                 | `bun.lock`: present          | `bun install`                      | Bun >=1.2      |
| Yarn            | `yarn.lock`: present         | `yarn install`                     | Yarn 1         |
| Vlt             | `vlt-lock.json`: present     | `vlt install`                      | Vlt 0.x        |

> **💡 Note:** `pnpm-lock.yaml` version 9.0 can be generated by pnpm 9 or 10. Newer projects
> will prefer 10, while older prefer 9. Check [build
> logs](/docs/deployments/logs) to see which version is used for your project.

When no lock file exists, Vercel uses npm by default. Npm's default version aligns with the Node.js version as described in the table above. Defaults can be overridden using [`installCommand`](/docs/project-configuration#installcommand) or [Corepack](/docs/deployments/configure-a-build#corepack) for specific package manager versions.

## Manually specifying a package manager

You can manually specify a package manager to use on a per-project, or per-deployment basis.

### Project override

To specify a package manager for all deployments in your project, use the **Override** setting in your project's [**Build & Development Settings**](/docs/deployments/configure-a-build#build-and-development-settings):

1. Navigate to your [dashboard](/dashboard) and select your project
2. Select the **Settings** tab
3. From the left navigation, select **General**
4. Enable the **Override** toggle in the [**Build & Development Settings**](/docs/deployments/configure-a-build#build-and-development-settings) section and add your install command. Once you save, it will be applied on your next deployment

> **💡 Note:** When using an override install command like
> `pnpm install`, Vercel will use the oldest version of
> the specified package manager available in the build container. For example,
> if you specify `pnpm install` as your override install
> command, Vercel will use pnpm 6.

### Deployment override

To specify a package manager for a deployment, use the [`installCommand`](/docs/project-configuration#installcommand) property in your projects `vercel.json`.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "installCommand": "pnpm install"
}
```


---

[View full sitemap](/docs/sitemap)
