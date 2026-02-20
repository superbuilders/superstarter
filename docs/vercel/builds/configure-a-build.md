---
title: Configuring a Build
product: vercel
url: /docs/builds/configure-a-build
type: reference
prerequisites:
  - /docs/builds
related:
  - /docs/builds/managing-builds
  - /docs/deployments
  - /docs/functions/runtimes/node-js/node-js-versions
  - /docs/deployments/concurrent-builds
  - /docs/deployments/managing-builds
summary: Vercel automatically configures the build settings for many front-end frameworks, but you can also customize the build according to your requirements.
---

# Configuring a Build

> **💡 Note:** Turbo build machines are now enabled by default for new Pro projects - [Learn
> more](/docs/builds/managing-builds#larger-build-machines)

When you make a [deployment](/docs/deployments), Vercel **builds** your project. During this time, Vercel performs a "shallow clone" on your Git repository using the command `git clone --depth=10 (...)` and fetches ten levels of git commit history. This means that only the latest ten commits are pulled and not the entire repository history.

Vercel automatically configures the build settings for many front-end frameworks, but you can also customize the build according to your requirements.

To configure your Vercel build with customized settings, choose a project from the [dashboard](/dashboard) and go to its **Settings** tab.

The **Build and Deployment** section of the Settings tab offers the following options to customize your build settings:

- [Framework Settings](#framework-settings)
- [Root Directory](#root-directory)
- [Node.js Version](/docs/functions/runtimes/node-js/node-js-versions#setting-the-node.js-version-in-project-settings)
- [Prioritizing Production Builds](/docs/deployments/concurrent-builds#prioritize-production-builds)
- [On-Demand Concurrent Builds](/docs/deployments/managing-builds#on-demand-concurrent-builds)

## Framework Settings

If you'd like to override the settings or specify a different framework, you can do so from
the **Build & Development Settings** section.

![Image](`/docs-assets/static/docs/concepts/deployments/build-step/framework-settings-light.png`)

*Framework settings.*

### Framework Preset

You have a wide range of frameworks to choose from, including Next.js, Svelte, and Nuxt. In several use cases, Vercel automatically detects your project's framework and sets the best settings for you.

Inside the Framework Preset settings, use the drop-down menu to select the framework of your choice. This selection will be used for **all deployments** within your Project. The available frameworks are listed below:

- **Angular**: Angular is a TypeScript-based cross-platform framework from Google.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/angular) | [View Demo](https://angular-template.vercel.app)
- **Astro**: Astro is a new kind of static site builder for the modern web. Powerful developer experience meets lightweight output.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/astro) | [View Demo](https://astro-template.vercel.app)
- **Brunch**: Brunch is a fast and simple webapp build tool with seamless incremental compilation for rapid development.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/brunch) | [View Demo](https://brunch-template.vercel.app)
- **React**: Create React App allows you to get going with React in no time.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/create-react-app) | [View Demo](https://create-react-template.vercel.app)
- **Docusaurus (v1)**: Docusaurus makes it easy to maintain Open Source documentation websites.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/docusaurus) | [View Demo](https://docusaurus-template.vercel.app)
- **Docusaurus (v2+)**: Docusaurus makes it easy to maintain Open Source documentation websites.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/docusaurus-2) | [View Demo](https://docusaurus-2-template.vercel.app)
- **Dojo**: Dojo is a modern progressive, TypeScript first framework.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/dojo) | [View Demo](https://dojo-template.vercel.app)
- **Eleventy**: 11ty is a simpler static site generator written in JavaScript, created to be an alternative to Jekyll.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/eleventy) | [View Demo](https://eleventy-template.vercel.app)
- **Elysia**: Ergonomic framework for humans
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/elysia)
- **Ember.js**: Ember.js helps webapp developers be more productive out of the box.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/ember) | [View Demo](https://ember-template.vercel.app)
- **Express**: Fast, unopinionated, minimalist web framework for Node.js
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/express) | [View Demo](https://express-vercel-example-demo.vercel.app/)
- **FastAPI**: FastAPI framework, high performance, easy to learn, fast to code, ready for production
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/fastapi) | [View Demo](https://vercel-fastapi-gamma-smoky.vercel.app/)
- **FastHTML**: The fastest way to create an HTML app
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/fasthtml) | [View Demo](https://fasthtml-template.vercel.app)
- **Fastify**: Fast and low overhead web framework, for Node.js
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/fastify)
- **Flask**: The Python micro web framework
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/flask)
- **Gatsby.js**: Gatsby helps developers build blazing fast websites and apps with React.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/gatsby) | [View Demo](https://gatsby.vercel.app)
- **Gridsome**: Gridsome is a Vue.js-powered framework for building websites & apps that are fast by default.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/gridsome) | [View Demo](https://gridsome-template.vercel.app)
- **H3**: Universal, Tiny, and Fast Servers
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/h3)
- **Hexo**: Hexo is a fast, simple & powerful blog framework powered by Node.js.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/hexo) | [View Demo](https://hexo-template.vercel.app)
- **Hono**: Web framework built on Web Standards
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/hono) | [View Demo](https://hono.vercel.dev)
- **Hugo**: Hugo is the world’s fastest framework for building websites, written in Go.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/hugo) | [View Demo](https://hugo-template.vercel.app)
- **Hydrogen (v1)**: React framework for headless commerce
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/hydrogen) | [View Demo](https://hydrogen-template.vercel.app)
- **Ionic Angular**: Ionic Angular allows you to build mobile PWAs with Angular and the Ionic Framework.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/ionic-angular) | [View Demo](https://ionic-angular-template.vercel.app)
- **Ionic React**: Ionic React allows you to build mobile PWAs with React and the Ionic Framework.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/ionic-react) | [View Demo](https://ionic-react-template.vercel.app)
- **Jekyll**: Jekyll makes it super easy to transform your plain text into static websites and blogs.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/jekyll) | [View Demo](https://jekyll-template.vercel.app)
- **Koa**: Expressive middleware for Node.js using ES2017 async functions
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/koa)
- **Middleman**: Middleman is a static site generator that uses all the shortcuts and tools in modern web development.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/middleman) | [View Demo](https://middleman-template.vercel.app)
- **NestJS**: Framework for building efficient, scalable Node.js server-side applications
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nestjs)
- **Next.js**: Next.js makes you productive with React instantly — whether you want to build static or dynamic sites.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nextjs) | [View Demo](https://nextjs-template.vercel.app)
- **Nitro**: Nitro is a next generation server toolkit.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nitro) | [View Demo](https://nitro-template.vercel.app)
- **Nuxt**: Nuxt is the open source framework that makes full-stack development with Vue.js intuitive.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/nuxtjs) | [View Demo](https://nuxtjs-template.vercel.app)
- **Parcel**: Parcel is a zero configuration build tool for the web that scales to projects of any size and complexity.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/parcel) | [View Demo](https://parcel-template.vercel.app)
- **Polymer**: Polymer is an open-source webapps library from Google, for building using Web Components.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/polymer) | [View Demo](https://polymer-template.vercel.app)
- **Preact**: Preact is a fast 3kB alternative to React with the same modern API.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/preact) | [View Demo](https://preact-template.vercel.app)
- **React Router**: Declarative routing for React
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/react-router) | [View Demo](https://react-router-v7-template.vercel.app)
- **RedwoodJS**: RedwoodJS is a full-stack framework for the Jamstack.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/redwoodjs) | [View Demo](https://redwood-template.vercel.app)
- **Remix**: Build Better Websites
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/remix) | [View Demo](https://remix-run-template.vercel.app)
- **Saber**: Saber is a framework for building static sites in Vue.js that supports data from any source.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/saber)
- **Sanity**: The structured content platform.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/sanity) | [View Demo](https://sanity-studio-template.vercel.app)
- **Sanity (v3)**: The structured content platform.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/sanity-v3) | [View Demo](https://sanity-studio-template.vercel.app)
- **Scully**: Scully is a static site generator for Angular.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/scully) | [View Demo](https://scully-template.vercel.app)
- **SolidStart (v0)**: Simple and performant reactivity for building user interfaces.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/solidstart) | [View Demo](https://solid-start-template.vercel.app)
- **SolidStart (v1)**: Simple and performant reactivity for building user interfaces.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/solidstart-1) | [View Demo](https://solid-start-template.vercel.app)
- **Stencil**: Stencil is a powerful toolchain for building Progressive Web Apps and Design Systems.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/stencil) | [View Demo](https://stencil.vercel.app)
- **Storybook**: Frontend workshop for UI development
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/storybook)
- **SvelteKit**: SvelteKit is a framework for building web applications of all sizes.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/sveltekit-1) | [View Demo](https://sveltekit-1-template.vercel.app)
- **TanStack Start**: Full-stack Framework powered by TanStack Router for React and Solid.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/tanstack-start)
- **UmiJS**: UmiJS is an extensible enterprise-level React application framework.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/umijs) | [View Demo](https://umijs-template.vercel.app)
- **Vite**: Vite is a new breed of frontend build tool that significantly improves the frontend development experience.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/vite) | [View Demo](https://vite-vue-template.vercel.app)
- **VitePress**: VitePress is VuePress' little brother, built on top of Vite.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/vitepress) | [View Demo](https://vitepress-starter-template.vercel.app)
- **Vue.js**: Vue.js is a versatile JavaScript framework that is as approachable as it is performant.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/vue) | [View Demo](https://vue-template.vercel.app)
- **VuePress**: Vue-powered Static Site Generator
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/vuepress) | [View Demo](https://vuepress-starter-template.vercel.app)
- **xmcp**: The MCP framework for building AI-powered tools
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/xmcp) | [View Demo](https://xmcp-template.vercel.app/)
- **Zola**: Everything you need to make a static site engine in one binary.
  - [Deploy](https://vercel.com/new/clone?repository-url=https://github.com/vercel/vercel/tree/main/examples/zola) | [View Demo](https://zola-template.vercel.app)


However, if no framework is detected, "Other" will be selected. In this case, the Override toggle for the Build Command will be enabled by default so that you can enter the build command manually. The remaining deployment process is that for default frameworks.

If you would like to override Framework Preset for a **specific deployment**, add [`framework`](/docs/project-configuration#framework) to your `vercel.json` configuration.

### Build Command

Vercel automatically configures the Build Command based on the framework. Depending on the framework, the Build Command can refer to the project’s `package.json` file.

For example, if [Next.js](https://nextjs.org) is your framework:

- Vercel checks for the `build` command in `scripts` and uses this to build the project
- If not, the `next build` will be triggered as the default Build Command

If you'd like to override the Build Command for **all deployments** in your Project, you can turn on the Override toggle and specify the custom command.

If you would like to override the Build Command for a **specific deployment**, add [`buildCommand`](/docs/project-configuration#buildcommand) to your `vercel.json` configuration.

> **💡 Note:** If you update the  setting, it will be applied on your next
> deployment.

### Output Directory

After building a project, most frameworks output the resulting build in a directory. Only the contents of this **Output Directory** will be served statically by Vercel.

If Vercel detects a framework, the output directory will automatically be configured.

> **💡 Note:** If you update the  setting, it will be applied on your next
> deployment.

For projects that [do not require building](#skip-build-step), you might want to serve the files in the root directory. In this case, do the following:

- Choose "Other" as the Framework Preset. This sets the output directory as `public` if it exists or `.` (root directory of the project) otherwise
- If your project doesn’t have a `public` directory, it will serve the files from the root directory
- Alternatively, you can turn on the **Override** toggle and leave the field empty (in which case, the build step will be skipped)

If you would like to override the Output Directory for a **specific deployment**, add [`outputDirectory`](/docs/project-configuration#outputdirectory) to your `vercel.json` configuration.

### Install Command

Vercel auto-detects the install command during the build step. It installs dependencies from `package.json`, including `devDependencies` ([which can be excluded](/docs/deployments/troubleshoot-a-build#excluding-development-dependencies)). The install path is set by the [root directory](#root-directory).

The install command can be managed in two ways: through a project override, or per-deployment. See [manually specifying a package manager](/docs/package-managers#manually-specifying-a-package-manager) for more details.

To learn what package managers are supported on Vercel, see the [package manager support](/docs/package-managers) documentation.

#### Corepack

> **⚠️ Warning:** Corepack is considered
> [experimental](https://nodejs.org/docs/latest-v16.x/api/documentation.html#stability-index)
> and therefore, breaking changes or removal may occur in any future release of
> Node.js.

[Corepack](https://nodejs.org/docs/latest-v16.x/api/corepack.html) is an experimental tool that allows a Node.js project to pin a specific version of a package manager.

You can enable Corepack by adding an [environment variable](/docs/environment-variables) with name `ENABLE_EXPERIMENTAL_COREPACK` and value `1` to your Project.

Then, set the [`packageManager`](https://nodejs.org/docs/latest-v16.x/api/packages.html#packagemanager) property in the `package.json` file in the root of your repository. For example:

```json filename="package.json"
{
  "packageManager": "pnpm@7.5.1"
}
```

*A package.json file with pnpm
version 7.5.1*

#### Custom Install Command for your API

The Install Command defined in the Project Settings will be used for front-end frameworks that support Vercel functions for APIs.

If you're using [Vercel functions](/docs/functions) defined in the natively supported `api` directory, a different Install Command will be used depending on the language of the Vercel Function. You cannot customize this Install Command.

### Development Command

This setting is relevant only if you’re using `vercel dev` locally to develop your project. Use `vercel dev` only if you need to use Vercel platform features like [Vercel functions](/docs/functions). Otherwise, it's recommended to use the development command your framework provides (such as `next dev` for Next.js).

The Development Command settings allow you to customize the behavior of `vercel dev`. If Vercel detects a framework, the development command will automatically be configured.

If you’d like to use a custom command for `vercel dev`, you can turn on the **Override** toggle. Please note the following:

- If you specify a custom command, your command must pass your framework's `$PORT` variable (which contains the port number). For example, in [Next.js](https://nextjs.org/) you should use: `next dev --port $PORT`
- If the development command is not specified, `vercel dev` will fail. If you've selected "Other" as the framework preset, the default development command will be empty
- You must create a deployment and have your local project linked to the project on Vercel (using `vercel`). Otherwise, `vercel dev` will not work correctly

If you would like to override the Development Command, add [`devCommand`](/docs/project-configuration#devcommand) to your `vercel.json` configuration.

### Skip Build Step

Some static projects do not require building. For example, a website with only HTML/CSS/JS source files can be served as-is.

In such cases, you should:

- Specify "Other" as the framework preset
- Enable the **Override** option for the Build Command
- Leave the Build Command empty

This prevents running the build, and your content is served directly.

## Root Directory

In some projects, the top-level directory of the repository may not be the root directory of the app you’d like to build. For example, your repository might have a front-end directory containing a stand-alone [Next.js](https://nextjs.org/) app.

For such cases, you can specify the project Root Directory. If you do so, please note the following:

- Your app will not be able to access files outside of that directory. You also cannot use `..` to move up a level
- This setting also applies to [Vercel CLI](/docs/cli). Instead of running `vercel <directory-name>` to deploy, specify `<directory-name>` here so you can just run `vercel`

To configure the Root Directory:

1. Navigate to the **Build and Deployment** page of your **Project Settings**
2. Scroll down to **Root Directory**
3. Enter the path to the root directory of your app
4. Click **Save** to apply the changes

> **💡 Note:** If you update the root directory setting, it will be applied on your next
> deployment.

#### Skipping unaffected projects

In a monorepo, you can [skip deployments](/docs/monorepos#skipping-unaffected-projects) for projects that were not affected by a commit. To configure:

1. Navigate to the **Build and Deployment** page of your **Project Settings**
2. Scroll down to **Root Directory**
3. Enable the **Skip deployment** switch


---

[View full sitemap](/docs/sitemap)
