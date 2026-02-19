# TanStack Start Quick Start

In this tutorial you will add Inngest to a TanStack Start app to easily run background tasks and build complex workflows.

Inngest makes it easy to build, manage, and execute durable functions. Some use cases include scheduling drip marketing campaigns, building payment flows, or chaining LLM interactions.

By the end of this ten-minute tutorial you will:

- Set up and run Inngest on your machine.
- Write your first Inngest function.
- Trigger your function from your app and through Inngest Dev Server.

Let's get started!

## Before you start: choose a project

In this tutorial you can use any existing TanStack Start project, or you can create a new one.

Instructions for creating a new TanStack Start project

Follow the [TanStack Start getting started guide](https://tanstack.com/start/latest/docs-markdown/framework/react/quick-start) to create a new project.

Once you've chosen a project, open it in a code editor.

Next, start your TanStack Start app in development mode by running:

```shell
npm run dev
```

Now you can add Inngest to your project!

## 1. Install Inngest

With the TanStack Start app now running, open a new tab in your terminal. In your project directory's root, run the following command to install Inngest SDK:

```shell {{ title: "npm" }}
npm install inngest
```

```shell {{ title: "yarn" }}
yarn add inngest
```

```shell {{ title: "pnpm" }}
pnpm add inngest
```

```shell {{ title: "bun" }}
bun add inngest
```

## 2. Run the Inngest Dev Server

Next, start the [Inngest Dev Server](/docs-markdown/local-development#inngest-dev-server?ref=tanstack-start-quick-start), which is a fast, in-memory version of Inngest where you can quickly send and view events and function runs:

```shell {{ title: "npm" }}
npx inngest-cli@latest dev
```

```shell {{ title: "yarn" }}
yarn dlx inngest-cli@latest dev
```

```shell {{ title: "pnpm" }}
pnpm dlx inngest-cli@latest dev
```

```shell {{ title: "bun" }}
npx inngest-cli@latest dev
```

You should see a similar output to the following:

```bash {{ language: 'js' }}
$ npx inngest-cli@latest dev

12:33PM INF executor > service starting
12:33PM INF runner > starting event stream backend=redis
12:33PM INF executor > subscribing to function queue
12:33PM INF runner > service starting
12:33PM INF runner > subscribing to events topic=events
12:33PM INF no shard finder;  skipping shard claiming
12:33PM INF devserver > service starting
12:33PM INF devserver > autodiscovering locally hosted SDKs
12:33PM INF api > starting server addr=0.0.0.0:8288

        Inngest dev server online at 0.0.0.0:8288, visible at the following URLs:

         - http://127.0.0.1:8288 (http://localhost:8288)

        Scanning for available serve handlers.
        To disable scanning run `inngest dev` with flags: --no-discovery -u <your-serve-url>
```

In your browser open [`http://localhost:8288`](http://localhost:8288) to see the development UI where later you will test the functions you write:

## 3. Create an Inngest client

Inngest invokes your functions securely via an [API endpoint](/docs/learn/serving-inngest-functions?ref=tanstack-start-quick-start) at `/api/inngest`. To enable that, you will create an [Inngest client](/docs-markdown/reference/client/create?ref=tanstack-start-quick-start) in your TanStack Start project, which you will use to send events and create functions.

Make a new directory (for example, `src/inngest`) where you'll define your Inngest functions and the client.

In the `src/inngest` directory create an Inngest client:

```ts {{ filename: "src/inngest/client.ts" }}
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });
```

Next, you will set up a route handler for the `/api/inngest` route. TanStack Start uses file-based routing with a special API handler pattern. Create a file at `src/routes/api/inngest.ts` with the following code:

```ts {{ filename: "src/routes/api/inngest.ts" }}
import { createServerFileRoute } from "@tanstack/react-start/server";
import { serve } from "inngest/edge";
import { inngest } from "../../inngest/client";

const handler = serve({
  client: inngest,
  functions: [
    /* your functions will be passed here later! */
  ],
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: async ({ request }) => handler(request),
      POST: async ({ request }) => handler(request),
      PUT: async ({ request }) => handler(request),
    },
  },
});
```

## 4. Write your first Inngest function

In this step, you will write your first reliable serverless function. This function will be triggered whenever a specific event occurs (in our case, it will be `test/hello.world`). Then, it will sleep for a second and return a "Hello, World!".

### Define the function

To define the function, use the [`createFunction`](/docs-markdown/reference/functions/create?ref=tanstack-start-quick-start) method on the Inngest client.

Learn more: What is `createFunction` method?

The `createFunction` method takes three objects as arguments:

- **Configuration**: A unique `id` is required and it is the default name that will be displayed on the Inngest dashboard to refer to your function. You can also specify [additional options](/docs-markdown/reference/functions/create#configuration?ref=tanstack-start-quick-start) such as `concurrency`, `rateLimit`, `retries`, or `batchEvents`, and others.
- **Trigger**: `event` is the name of the event that triggers your function. Alternatively, you can use `cron` to specify a schedule to trigger this function. Learn more about triggers [here](/docs-markdown/features/events-triggers?ref=tanstack-start-quick-start).
- **Handler**: The function that is called when the `event` is received. The `event` payload is passed as an argument. Arguments include `step` to define durable steps within your handler and [additional arguments](/docs-markdown/reference/functions/create#handler?ref=tanstack-start-quick-start) include logging helpers and other data.

Inside your `src/inngest` directory create a new file called `functions.ts` where you will define Inngest functions. Add the following code:

```ts {{ filename: "src/inngest/functions.ts" }}
import { inngest } from "./client";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);
```

### Add the function to `serve()`

Next, import your Inngest function in the routes handler (`src/routes/api/inngest.ts`) and add it to the `serve` handler so Inngest can invoke it via HTTP:

```ts {{ filename: "src/routes/api/inngest.ts" }}
import { createServerFileRoute } from "@tanstack/react-start/server";
import { serve } from "inngest/edge";
import { inngest } from "../../inngest/client";
import { helloWorld } from "../../inngest/functions";

const handler = serve({
  client: inngest,
  functions: [
    helloWorld, // <-- This is where you'll always add all your functions
  ],
});

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: async ({ request }) => handler(request),
      POST: async ({ request }) => handler(request),
      PUT: async ({ request }) => handler(request),
    },
  },
});
```

> **Callout:** 👉 Note that you can import serve() for other frameworks and the rest of the code, in fact, remains the same — only the import statement changes. TanStack Start uses inngest/edge because it runs in an edge runtime environment.

Now, it's time to run your function!

## 5. Trigger your function from the Inngest Dev Server UI

Inngest is powered by events. You will trigger your function in two ways: first, by invoking it directly from the Inngest Dev Server UI, and then by sending events from code.

With your TanStack Start app and Inngest Dev Server running, open the Inngest Dev Server UI and select the "Functions" tab [`http://localhost:8288/functions`](http://localhost:8288/functions). You should see your function. (Note: if you don't see any function, select the "Apps" tab to troubleshoot)

To trigger your function, use the "Invoke" button for the associated function:

In the pop up editor, add your event payload data like the example below. This can be any JSON and you can use this data within your function's handler. Next, press the "Invoke Function" button:

```json
{
  "data": {
    "email": "test@example.com"
  }
}
```

The payload is sent to Inngest (which is running locally) which automatically executes your function in the background! You can see the new function run logged in the "Runs" tab:

When you click on the run, you will see more information about the event, such as which function was triggered, its payload, output, and timeline:

In this case, the payload triggered the `hello-world` function, which did sleep for a second and then returned `"Hello, World!"`. No surprises here, that's what we expected!

To aid in debugging your functions, you can quickly "Rerun" or "Cancel" a function. Try clicking "Rerun" at the top of the "Run details" table:

After the function was replayed, you will see two runs in the UI:

Now you will trigger an event from inside your app.

## 6. Trigger from code

Inngest is powered by events.

Learn more: events in Inngest.

It is worth mentioning here that an event-driven approach allows you to:

- Trigger one *or* multiple functions from one event, aka [fan-out](/docs/guides/fan-out-jobs?ref=tanstack-start-quick-start).
- Store received events for a historical record of what happened in your application.
- Use stored events to [replay](/docs-markdown/platform/replay?ref=tanstack-start-quick-start) functions when there are issues in production.
- Interact with long-running functions by sending new events including [waiting for input](/docs-markdown/features/inngest-functions/steps-workflows/wait-for-event?ref=tanstack-start-quick-start) and [cancelling](/docs-markdown/features/inngest-functions/cancellation/cancel-on-events?ref=tanstack-start-quick-start).

To trigger Inngest functions to run in the background, you will need to send events from your application to Inngest. Once the event is received, it will automatically invoke all functions that are configured to be triggered by it.

To send an event from your code, you can use the `Inngest` client's `send()` method.

Learn more: `send()` method.

Note that with the `send` method used below you now can:

- Send one or more events within any API route.
- Include any data you need in your function within the `data` object.

In a real-world app, you might send events from API routes that perform an action, like registering users (for example, `app/user.signup`) or creating something (for example, `app/report.created`).

You will now send an event from within your TanStack Start app: from a "hello" API route. To do so, create a new API handler at `src/routes/api/hello.ts`:

```ts {{ filename: "src/routes/api/hello.ts" }}
import { createServerFileRoute } from "@tanstack/react-start/server";
import { inngest } from "../../inngest/client";

export const ServerRoute = createServerFileRoute("/api/hello").methods({
  GET: async () => {
    // Send your event payload to Inngest
    await inngest.send({
      name: "test/hello.world",
      data: {
        email: "testUser@example.com",
      },
    });

    return new Response(JSON.stringify({ message: "Event sent!" }), {
      headers: { "Content-Type": "application/json" },
    });
  },
});
```

Every time this API route is requested, an event is sent to Inngest. To test it, open [`http://localhost:3000/api/hello`](http://localhost:3000/api/hello) (change your port if your TanStack Start app is running elsewhere). You should see the following output: `{"message":"Event sent!"}`

If you go back to the Inngest Dev Server, you will see a new run is triggered by this event:

And - that's it! You now have learned how to create Inngest functions and you have sent events to trigger those functions. Congratulations 🥳

## Next Steps

To continue your exploration, feel free to check out:

- [Examples](/docs/examples?ref=tanstack-start-quick-start) of what other people built with Inngest.
- [Case studies](/customers?ref=tanstack-start-quick-start) showcasing a variety of use cases.
- [Our blog](/blog?ref=tanstack-start-quick-start) where we explain how Inngest works, publish guest blog posts, and share our learnings.

You can also read more:

- About [Inngest functions](/docs-markdown/functions?ref=tanstack-start-quick-start).
- About [Inngest steps](/docs-markdown/steps?ref=tanstack-start-quick-start).
- About [Durable Execution](/docs-markdown/learn/how-functions-are-executed?ref=tanstack-start-quick-start)
- How to [use Inngest with other frameworks](/docs-markdown/learn/serving-inngest-functions?ref=tanstack-start-quick-start).
- How to [deploy your app to your platform](/docs-markdown/deploy?ref=tanstack-start-quick-start).