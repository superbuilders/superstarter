---
title: Build Features for Customizing Deployments
product: vercel
url: /docs/builds/build-features
type: reference
prerequisites:
  - /docs/builds
related:
  - /docs/builds/managing-builds
  - /docs/environment-variables
  - /docs/cli/deploying-from-cli
  - /docs/build-output-api/v3
  - /docs/domains/add-a-domain
summary: "Learn how to customize your deployments using Vercel's build features."
---

# Build Features for Customizing Deployments

> **💡 Note:** Turbo build machines are now enabled by default for new Pro projects - [Learn
> more](/docs/builds/managing-builds#larger-build-machines)

Vercel provides the following features to customize your deployments:

- [Private npm packages](#private-npm-packages)
- [Ignored files and folders](#ignored-files-and-folders)
- [Special paths](#special-paths)
- [Git submodules](#git-submodules)

## Private npm packages

When your project's code is using private `npm` modules that require authentication, you need to perform an additional step to install private modules.

To install private `npm` modules, define `NPM_TOKEN` as an [Environment Variable](/docs/environment-variables) in your project. Alternatively, define `NPM_RC` as an [Environment Variable](/docs/environment-variables) in the contents of the project's npmrc config file that resides at the root of the project folder and is named `~/.npmrc`. This file defines the config settings of `npm` at the level of the project.

To learn more, check out the [guide here](/kb/guide/using-private-dependencies-with-vercel) if you need help configuring private dependencies.

## Ignored files and folders

Vercel ignores certain files and folders by default and prevents them from being uploaded during the deployment process for security and performance reasons. Please note that these ignored files are only relevant when using Vercel CLI.

```bash filename="ignored-files"
.hg
.git
.gitmodules
.svn
.cache
.next
.now
.vercel
.npmignore
.dockerignore
.gitignore
.*.swp
.DS_Store
.wafpicke-*
.lock-wscript
.env.local
.env.*.local
.venv
.yarn/cache
npm-debug.log
config.gypi
node_modules
__pycache__
venv
CVS
```

*A complete list of files and folders ignored by Vercel during the Deployment
process.*

The `.vercel/output` directory is **not** ignored when [`vercel deploy --prebuilt`](/docs/cli/deploying-from-cli#deploying-from-local-build-prebuilt) is used to deploy a prebuilt Vercel Project, according to the [Build Output API](/docs/build-output-api/v3) specification.

> **💡 Note:** You do not need to add any of the above files and folders to your
> `.vercelignore` file because it is done automatically
> by Vercel.

## Special paths

Vercel allows you to access the source code and build logs for your deployment using special pathnames for **Build Logs and Source Protection**. You can access this option from your project's **Security** settings.

All deployment URLs have two special pathnames to access the source code and the build logs:

- `/_src`
- `/_logs`

By default, these routes are protected so that they can only be accessed by you and the members of your Vercel Team.

![Image](`/docs-assets/static/docs/concepts/deployments/build-step/logs-and-sources-light.png`)

*Build Logs and Source Protection is enabled by default.*

### Source View

By appending `/_src` to a Deployment URL or [Custom Domain](/docs/domains/add-a-domain) in your web browser, you will be redirected to the Deployment inspector and be able to browse the sources and [build](/docs/deployments/configure-a-build) outputs.

### Logs View

By appending `/_logs` to a Deployment URL or [Custom Domain](/docs/domains/add-a-domain) in your web browser, you can see a real-time stream of logs from your deployment build processes by clicking on the **Build Logs** accordion.

### Security considerations

The pathnames `/_src` and `/_logs` redirect to `https://vercel.com` and **require logging into your Vercel account** to access any sensitive information. By default, a third-party can **never** access your source or logs by crafting a deployment URL with one of these paths.

You can configure these paths to make them publicly accessible under the Security tab on the Project Settings page. You can learn more about making paths publicly accessible in the [Build Logs and Source Protection](/docs/projects/overview#logs-and-source-protection) section.

## Git submodules

On Vercel, you can deploy [Git submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) with a [Git provider](/docs/git) as long as the submodule is publicly accessible through the HTTP protocol. Git submodules that are private or requested over SSH will fail during the Build step. However, you can reference private repositories formatted as npm packages in your `package.json` file dependencies. Private repository modules require a special link syntax that varies according to the Git provider. For more information on this syntax, see "[How do I use private dependencies with Vercel?](/kb/guide/using-private-dependencies-with-vercel)".


---

[View full sitemap](/docs/sitemap)
