# H3 Quick Start

In this tutorial you will add Inngest to an [H3](https://github.com/unjs/h3) app to easily run background tasks and build complex workflows.

Inngest makes it easy to build, manage, and execute durable functions. Some use cases include scheduling drip marketing campaigns, building payment flows, or chaining LLM interactions.

By the end of this ten-minute tutorial you will:

- Set up and run Inngest on your machine.
- Write your first Inngest function.
- Trigger your function from your app and through Inngest Dev Server.

Let's get started!

## Before you start: choose a project

In this tutorial you can use any existing H3 project, or you can create a new one.

Instructions for creating a new H3 project

Create a new directory and initialize a new project:

```shell
mkdir my-h3-app && cd my-h3-app
npm init -y
npm install h3
```

Create an `index.ts` file with a basic H3 server:

```ts {{ filename: "index.ts" }}
import { createApp, createRouter, eventHandler, toNodeListener } from "h3";
import { createServer } from "node:http";

const app = createApp();
const router = createRouter();
app.use(router);

createServer(toNodeListener(app)).listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

Once you've chosen a project, open it in a code editor.

### Starting your project

Start your server using your typical script. We recommend using something like [`tsx`](https://www.npmjs.com/package/tsx) or [`nodemon`](https://www.npmjs.com/package/nodemon) for automatically restarting on file save:

```shell {{ title: "tsx" }}
npx tsx watch ./index.ts
```

```shell {{ title: "nodemon" }}
nodemon ./index.ts
```

Now let's add Inngest to your project.

## 1. Install the Inngest SDK

In your project directory's root, run the following command to install Inngest SDK:

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

Next, start the [Inngest Dev Server](/docs-markdown/local-development#inngest-dev-server), which is a fast, in-memory version of Inngest where you can quickly send and view events and function runs. This tutorial assumes that your H3 server will be running on port `3000`; change this to match your port if you use another.

```shell {{ title: "npm" }}
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

```shell {{ title: "yarn" }}
yarn dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

```shell {{ title: "pnpm" }}
pnpm dlx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

```shell {{ title: "bun" }}
bunx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

You should see a similar output to the following:

```bash {{ language: 'js' }}
$ npx inngest-cli@latest dev -u http://localhost:3000/api/inngest

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

Inngest invokes your functions securely via an [API endpoint](/docs/learn/serving-inngest-functions) at `/api/inngest`. To enable that, you will create an [Inngest client](/docs-markdown/reference/client/create) in your project, which you will use to send events and create functions.

Create a file in the directory of your preference. We recommend creating an `inngest` directory for your client and all functions.

```ts {{ filename: "src/inngest/index.ts" }}
import { Inngest } from "inngest";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "my-app" });

// Create an empty array where we'll export future Inngest functions
export const functions = [];
```

## 4. Set up the Inngest HTTP endpoint

Using your existing H3 server, set up Inngest using the provided `serve` handler from `inngest/h3`. The serve handler is wrapped in H3's `eventHandler`:

```ts {{ filename: "index.ts" }}
import { createApp, createRouter, eventHandler, toNodeListener } from "h3";
import { createServer } from "node:http";
import { serve } from "inngest/h3";
import { inngest, functions } from "./src/inngest";

const app = createApp();
const router = createRouter();

// Set up the "/api/inngest" route with the serve handler
router.use(
  "/api/inngest",
  eventHandler(
    serve({
      client: inngest,
      functions,
    })
  )
);

app.use(router);

createServer(toNodeListener(app)).listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

> **Callout:** 👉 Note that you can import a serve handler for other frameworks and the rest of the code remains the same. These adapters enable you to change your web framework without changing any Inngest function code (ex. instead of inngest/h3 it could be inngest/next or inngest/express).

## 5. Write your first Inngest function

In this step, you will write your first durable function. This function will be triggered whenever a specific event occurs (in our case, it will be `test/hello.world`). Then, it will sleep for a second and return a "Hello, World!".

To define the function, use the [`createFunction`](/docs-markdown/reference/functions/create) method on the Inngest client.

Learn more: What is `createFunction` method?

The `createFunction` method takes three objects as arguments:

- **Configuration**: A unique `id` is required and it is the default name that will be displayed on the Inngest dashboard to refer to your function. You can also specify [additional options](/docs-markdown/reference/functions/create#configuration) such as `concurrency`, `rateLimit`, `retries`, or `batchEvents`, and others.
- **Trigger**: `event` is the name of the event that triggers your function. Alternatively, you can use `cron` to specify a schedule to trigger this function. Learn more about triggers [here](/docs-markdown/features/events-triggers).
- **Handler**: The function that is called when the `event` is received. The `event` payload is passed as an argument. Arguments include `step` to define durable steps within your handler and [additional arguments](/docs-markdown/reference/functions/create#handler) include logging helpers and other data.

Define a function in the same file where we defined our Inngest client:

```ts {{ filename: "src/inngest/index.ts" }}
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app" });

// Your new function:
const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },
  async ({ event, step }) => {
    await step.sleep("wait-a-moment", "1s");
    return { message: `Hello ${event.data.email}!` };
  },
);

// Add the function to the exported array:
export const functions = [
  helloWorld
];
```

> **Callout:** In the previous step, we configured the exported functions array to be passed to our Inngest HTTP endpoint. Each new function must be added to this array in order for Inngest to read its configuration and invoke it.

Now, it's time to run your function!

## 6. Trigger your function from the Inngest Dev Server UI

You will trigger your function in two ways: first, by invoking it directly from the Inngest Dev Server UI, and then by sending events from code.

With your H3 server and Inngest Dev Server running, open the Inngest Dev Server UI and select the "Functions" tab [`http://localhost:8288/functions`](http://localhost:8288/functions). You should see your function. (Note: if you don't see any function, select the "Apps" tab to troubleshoot)

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

## 7. Trigger from code

Inngest is powered by events.

Learn more: events in Inngest.

It is worth mentioning here that an event-driven approach allows you to:

- Trigger one *or* multiple functions from one event, aka [fan-out](/docs/guides/fan-out-jobs).
- Store received events for a historical record of what happened in your application.
- Use stored events to [replay](/docs-markdown/platform/replay) functions when there are issues in production.
- Interact with long-running functions by sending new events including [waiting for input](/docs-markdown/features/inngest-functions/steps-workflows/wait-for-event) and [cancelling](/docs-markdown/features/inngest-functions/cancellation/cancel-on-events).

To trigger Inngest functions to run in the background, you will need to send events from your application to Inngest. Once the event is received, it will automatically invoke all functions that are configured to be triggered by it.

To send an event from your code, you can use the `Inngest` client's `send()` method.

Learn more: `send()` method.

Note that with the `send` method used below you now can:

- Send one or more events within any API route.
- Include any data you need in your function within the `data` object.

In a real-world app, you might send events from API routes that perform an action, like registering users (for example, `app/user.signup`) or creating something (for example, `app/report.created`).

You will now send an event from within your server from a `/api/hello` `GET` endpoint. Add a new route to your H3 server:

```ts {{ filename: "index.ts" }}
import { createApp, createRouter, eventHandler, toNodeListener } from "h3";
import { createServer } from "node:http";
import { serve } from "inngest/h3";
import { inngest, functions } from "./src/inngest";

const app = createApp();
const router = createRouter();

router.use(
  "/api/inngest",
  eventHandler(
    serve({
      client: inngest,
      functions,
    })
  )
);

// Create a new route
router.get(
  "/api/hello",
  eventHandler(async () => {
    await inngest.send({
      name: "test/hello.world",
      data: {
        email: "testUser@example.com",
      },
    });
    return { message: "Event sent!" };
  })
);

app.use(router);

createServer(toNodeListener(app)).listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

Every time this API route is requested, an event is sent to Inngest. To test it, open [`http://localhost:3000/api/hello`](http://localhost:3000/api/hello) (change your port if your H3 app is running elsewhere). You should see the following output: `{"message":"Event sent!"}`

If you go back to the Inngest Dev Server, you will see a new run is triggered by this event:

And - that's it! You now have learned how to create Inngest functions and you have sent events to trigger those functions. Congratulations 🥳

## Next Steps

To continue your exploration, feel free to check out:

- [Examples](/docs/examples) of what other people built with Inngest.
- [Case studies](/customers) showcasing a variety of use cases.
- [Our blog](/blog) where we explain how Inngest works, publish guest blog posts, and share our learnings.

You can also read more:

- About [Inngest functions](/docs-markdown/functions).
- About [Inngest steps](/docs-markdown/steps).
- About [Durable Execution](/docs-markdown/learn/how-functions-are-executed)
- How to [use Inngest with other frameworks](/docs-markdown/learn/serving-inngest-functions).
- How to [deploy your app to your platform](/docs-markdown/deploy).