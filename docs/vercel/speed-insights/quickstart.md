---
title: Getting started with Speed Insights
product: vercel
url: /docs/speed-insights/quickstart
type: tutorial
prerequisites:
  - /docs/speed-insights
related:
  - /docs/frameworks/astro
  - /docs/speed-insights/package
  - /docs/cdn
  - /docs/git
  - /docs/speed-insights/using-speed-insights
summary: "Vercel Speed Insights provides you detailed insights into your website's performance. This quickstart guide will help you get started with using..."
---

# Getting started with Speed Insights

This guide will help you get started with using Vercel Speed Insights on your project, showing you how to enable it, add the package to your project, deploy your app to Vercel, and view your data in the dashboard.

> **🔒 Permissions Required**: Speed Insights

To view instructions on using the Vercel Speed Insights in your project for your framework, use the **Choose a framework** dropdown on the right (at the bottom in mobile view).

## Prerequisites

- A Vercel account. If you don't have one, you can [sign up for free](https://vercel.com/signup).
- A Vercel project. If you don't have one, you can [create a new project](https://vercel.com/new).
- The Vercel CLI installed. If you don't have it, you can install it using the following command:
  <CodeBlock>
    <Code tab="pnpm">
      ```bash
      pnpm i vercel
      ```
    </Code>
    <Code tab="yarn">
      ```bash
      yarn i vercel
      ```
    </Code>
    <Code tab="npm">
      ```bash
      npm i vercel
      ```
    </Code>
    <Code tab="bun">
      ```bash
      bun i vercel
      ```
    </Code>
  </CodeBlock>

- ### Enable Speed Insights in Vercel
  On the [Vercel dashboard](/dashboard), select your Project followed by the **Speed Insights** tab. You can also select the button below to be taken there. Then, select **Enable** from the dialog.
  > **💡 Note:** Enabling Speed Insights will add new routes (scoped
  > at `/_vercel/speed-insights/*`) after your next deployment.

- ### Add `@vercel/speed-insights` to your project
  > For \['nextjs', 'nextjs-app', 'sveltekit', 'remix',  'create-react-app', 'nuxt', 'vue', 'other', 'astro']:
  Using the package manager of your choice, add the `@vercel/speed-insights` package to your project:
  > For \['html']:

- > For \[
  > &#x20;   'nextjs',
  > &#x20;   'nextjs-app',
  > &#x20;   'remix',
  > &#x20;   'create-react-app',
  > &#x20;   'nuxt',
  > &#x20;   'vue',
  > &#x20;   'astro',
  > &#x20; ]:
  ### Add the `SpeedInsights` component to your app
  > For \['sveltekit', 'other']:
  ### Call the `injectSpeedInsights` function in your app
  > For \['html']:
  ### Add the `script` tag to your site
  > For \['nextjs']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering more seamless integration with Next.js.

  The instructions differ based on which version of Next.js you're deploying.
  > For \['nextjs-app']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering more seamless integration with Next.js.

  Add the following component to the root layout:
  > For \['create-react-app']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering more seamless integration with React.

  Add the following component to the main app file.
  ```ts {1, 7} filename="App.tsx" framework=create-react-app
  import { SpeedInsights } from '@vercel/speed-insights/react';

  export default function App() {
    return (
      <div>
        {/* ... */}
        <SpeedInsights />
      </div>
    );
  }
  ```
  ```js {1, 7} filename="App.jsx" framework=create-react-app
  import { SpeedInsights } from '@vercel/speed-insights/react';

  export default function App() {
    return (
      <div>
        {/* ... */}
        <SpeedInsights />
      </div>
    );
  }
  ```
  > For \['remix']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering a seamless integration with Remix.

  Add the following component to your root file:
  ```ts {1, 8} filename="app/root.tsx" framework=remix
  import { SpeedInsights } from '@vercel/speed-insights/remix';

  export default function App() {
    return (
      <html lang="en">
        <body>
          {/* ... */}
          <SpeedInsights />
        </body>
      </html>
    );
  }
  ```
  ```js {1, 8} filename="app/root.jsx" framework=remix
  import { SpeedInsights } from '@vercel/speed-insights/remix';

  export default function App() {
    return (
      <html lang="en">
        <body>
          {/* ... */}
          <SpeedInsights />
        </body>
      </html>
    );
  }
  ```
  > For \['sveltekit']:
  Add the following component to your root file:
  ```ts filename="src/routes/+layout.ts" framework=sveltekit
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

  injectSpeedInsights();
  ```
  ```js filename="src/routes/+layout.js" framework=sveltekit
  import { injectSpeedInsights } from '@vercel/speed-insights/sveltekit';

  injectSpeedInsights();
  ```
  > For \['html']:
  Add the following scripts before the closing tag of the `<body>`:
  ```ts filename="index.html" framework=html
  <script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
  ```
  ```js filename="index.html" framework=html
  <script>
    window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };
  </script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
  ```
  > For \['vue']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering more seamless integration with Vue.

  Add the following component to the main app template.
  ```ts {2, 6} filename="src/App.vue" framework=vue
  <script setup lang="ts">
  import { SpeedInsights } from '@vercel/speed-insights/vue';
  </script>

  <template>
    <SpeedInsights />
  </template>
  ```
  ```js {2, 6} filename="src/App.vue" framework=vue
  <script setup>
  import { SpeedInsights } from '@vercel/speed-insights/vue';
  </script>

  <template>
    <SpeedInsights />
  </template>
  ```
  > For \['nuxt']:
  The `SpeedInsights` component is a wrapper around the tracking script, offering more seamless integration with Nuxt.

  Add the following component to the default layout.
  ```ts {2, 6} filename="layouts/default.vue" framework=nuxt
  <script setup lang="ts">
  import { SpeedInsights } from '@vercel/speed-insights/vue';
  </script>

  <template>
    <SpeedInsights />
  </template>
  ```
  ```js {2, 6} filename="layouts/default.vue" framework=nuxt
  <script setup>
  import { SpeedInsights } from '@vercel/speed-insights/vue';
  </script>

  <template>
    <SpeedInsights />
  </template>
  ```
  > For \['other']:
  Import the `injectSpeedInsights` function from the package, which will add the tracking script to your app. **This should only be called once in your app, and must run in the client**.

  Add the following code to your main app file:
  ```ts filename="main.ts" framework=other
  import { injectSpeedInsights } from '@vercel/speed-insights';

  injectSpeedInsights();
  ```
  ```js filename="main.js" framework=other
  import { injectSpeedInsights } from '@vercel/speed-insights';

  injectSpeedInsights();
  ```
  > For \['astro']:
  Speed Insights is available for both [static](/docs/frameworks/astro#static-rendering) and [SSR](/docs/frameworks/astro#server-side-rendering) Astro apps.

  To enable this feature, declare the `<SpeedInsights />` component from `@vercel/speed-insights/astro` near the bottom of one of your layout components, such as `BaseHead.astro`:
  ```tsx filename="BaseHead.astro" framework=astro
  ---
  import SpeedInsights from '@vercel/speed-insights/astro';
  const { title, description } = Astro.props;
  ---
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <SpeedInsights />
  ```
  ```jsx filename="BaseHead.astro" framework=astro
  ---
  import SpeedInsights from '@vercel/speed-insights/astro';
  const { title, description } = Astro.props;
  ---
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <SpeedInsights />
  ```
  Optionally, you can remove sensitive information from the URL by adding a `speedInsightsBeforeSend` function to the global `window` object. The `<SpeedInsights />` component will call this method before sending any data to Vercel:
  ```tsx filename="BaseHead.astro" framework=astro
  ---
  import SpeedInsights from '@vercel/speed-insights/astro';
  const { title, description } = Astro.props;
  ---
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <script is:inline>
    function speedInsightsBeforeSend(data){
      console.log("Speed Insights before send", data)
      return data;
    }
  </script>
  <SpeedInsights />
  ```
  ```jsx filename="BaseHead.astro" framework=astro
  ---
  import SpeedInsights from '@vercel/speed-insights/astro';
  const { title, description } = Astro.props;
  ---
  <title>{title}</title>
  <meta name="title" content={title} />
  <meta name="description" content={description} />

  <script is:inline>
    function speedInsightsBeforeSend(data){
      console.log("Speed Insights before send", data)
      return data;
    }
  </script>
  <SpeedInsights />
  ```
  [Learn more about `beforeSend`](/docs/speed-insights/package#beforesend).

- ### Deploy your app to Vercel
  You can deploy your app to Vercel's global [CDN](/docs/cdn) by running the following command from your terminal:
  ```bash filename="terminal"
  vercel deploy
  ```
  Alternatively, you can [connect your project's git repository](/docs/git#deploying-a-git-repository), which will enable Vercel to deploy your latest pushes and merges to main.

  Once your app is deployed, it's ready to begin tracking performance metrics.
  > **💡 Note:** If everything is set up correctly, you should be able to find the
  > `/_vercel/speed-insights/script.js` script inside the body tag of your page.

- ### View your data in the dashboard
  Once your app is deployed, and users have visited your site, you can view the data in the dashboard.

  To do so, go to your [dashboard](/dashboard), select your project, and click the **Speed Insights** tab.

  After a few days of visitors, you'll be able to start exploring your metrics. For more information on how to use Speed Insights, see [Using Speed Insights](/docs/speed-insights/using-speed-insights).

Learn more about how Vercel supports [privacy and data compliance standards](/docs/speed-insights/privacy-policy) with Vercel Speed Insights.

## Next steps

Now that you have Vercel Speed Insights set up, you can explore the following topics to learn more:

- [Learn how to use the `@vercel/speed-insights` package](/docs/speed-insights/package)
- [Learn about metrics](/docs/speed-insights/metrics)
- [Read about privacy and compliance](/docs/speed-insights/privacy-policy)
- [Explore pricing](/docs/speed-insights/limits-and-pricing)
- [Troubleshooting](/docs/speed-insights/troubleshooting)


---

[View full sitemap](/docs/sitemap)
