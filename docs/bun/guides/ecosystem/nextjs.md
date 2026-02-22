# Build an app with Next.js and Bun

[Next.js](https://nextjs.org/) is a React framework for building full-stack web applications. It supports server-side rendering, static site generation, API routes, and more. Bun provides fast package installation and can run Next.js development and production servers.

***

#### Create a new Next.js app
    Use the interactive CLI to create a new Next.js app. This will scaffold a new Next.js project and automatically install dependencies.

    ```sh
    bun create next-app@latest my-bun-app
    ```

#### Start the dev server
    Change to the project directory and run the dev server with Bun.

    ```sh
    cd my-bun-app
    bun --bun run dev
    ```

    This starts the Next.js dev server with Bun's runtime.

    Open [`http://localhost:3000`](http://localhost:3000) with your browser to see the result. Any changes you make to `app/page.tsx` will be hot-reloaded in the browser.

#### Update scripts in package.json
    Modify the scripts field in your `package.json` by prefixing the Next.js CLI commands with `bun --bun`. This ensures that Bun executes the Next.js CLI for common tasks like `dev`, `build`, and `start`.

    ```json
    {
      "scripts": {
        "dev": "bun --bun next dev", // [!code ++]
        "build": "bun --bun next build", // [!code ++]
        "start": "bun --bun next start", // [!code ++]
      }
    }
    ```

***

## Hosting

Next.js applications on Bun can be deployed to various platforms.

<Columns cols={3}>
    Deploy on Vercel

    Deploy on Railway

    Deploy on DigitalOcean

    Deploy on AWS Lambda

    Deploy on Google Cloud Run

    Deploy on Render

***

## Templates

<Columns cols={2}>
    A simple App Router starter with Bun, Next.js, and Tailwind CSS.

    A full-stack todo application built with Bun, Next.js, and PostgreSQL.

***

[→ See Next.js's official documentation](https://nextjs.org/docs) for more information on building and deploying Next.js applications.
