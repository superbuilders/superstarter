# Create the Inngest Client

The `Inngest` client object is used to configure your application, enabling you to create functions and send events.

```ts {{ title: "v3" }}
import { Inngest } from "inngest";

const inngest = new Inngest({
  id: "my-application",
});
```

```ts {{ title: "v2" }}
import { Inngest } from "inngest";

const inngest = new Inngest({
  name: "My application",
});
```

***

## Configuration

- `id` (string): A unique identifier for your application. We recommend a hyphenated slug.

* `baseUrl` (string): Override the default (https\://inn.gs/) base URL for sending events. See also the INNGEST\_BASE\_URL environment variable.

- `env` (string): The environment name. Required only when using Branch Environments.

* `eventKey` (string): An Inngest Event Key. Alternatively, set the INNGEST\_EVENT\_KEY environment variable.

- `fetch` (Fetch API compatible interface): Override the default
  fetch
  implementation. Defaults to the runtime's native Fetch API.If you need to specify this, make sure that you preserve the function's binding, either by using .bind or by wrapping it in an anonymous function.

* `isDev` (boolean): Set to true to force Dev mode, setting default local URLs and turning off
  signature verification, or force Cloud mode with false. Alternatively, set INNGEST\_DEV.

- `logger` (Logger): A logger object that provides the following interfaces (.info(), .warn(), .error(), .debug()). Defaults to using console if not provided. Overwrites INNGEST\_LOG\_LEVEL if set. See logging guide for more details.

* `middleware` (array): A stack of middleware to add to the client.

- `schemas` (EventSchemas): Event payload types. See Defining Event Payload Types.

> **Callout:** We recommend setting the INNGEST\_EVENT\_KEY as an environment variable over using the eventKey option. As with any secret, it's not a good practice to hard-code the event key in your codebase.

## Defining Event Payload Types

You can leverage TypeScript, Zod, Valibot, or any schema library that
implements the [Standard Schema interface](https://standardschema.dev/) to define
your event payload types.

When you pass types to the Inngest client,
events are fully typed when using them with `inngest.send()` and
`inngest.createFunction()`. This can more easily alert you to issues with your
code during compile time.

> **Callout:** Click the toggles on the top left of the code block to see the different methods available!

```ts {{ title: "Standard Schema" }}
import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

export const inngest = new Inngest({
  schemas: new EventSchemas().fromSchema({
    "app/account.created": z.object({
      userId: z.string(),
    }),
    "app/subscription.started": z.object({
      userId: z.string(),
      planId: z.string(),
    }),
  }),
});
```

```ts {{ title: "Union" }}
import { EventSchemas, Inngest } from "inngest";

type AppAccountCreated = {
  name: "app/account.created";
  data: {
    userId: string;
  };
};

type AppSubscriptionStarted = {
  name: "app/subscription.started";
  data: {
    userId: string;
    planId: string;
  };
};

type Events = AppAccountCreated | AppSubscriptionStarted;

export const inngest = new Inngest({
  schemas: new EventSchemas().fromUnion<Events>(),
});
```

```ts {{ title: "Record"}}
import { EventSchemas, Inngest } from "inngest";

type Events = {
  "app/account.created": {
    data: {
      userId: string;
    };
  };
  "app/subscription.started": {
    data: {
      userId: string;
      planId: string;
    };
  };
};

export const inngest = new Inngest({
  schemas: new EventSchemas().fromRecord<Events>(),
});
```

```ts {{ title: "Stacking" }}
import { EventSchemas, Inngest } from "inngest";
import { z } from "zod";

type Events = {
  "app/user.created": {
    data: { id: string };
  };
};

const zodEventSchemas = {
  "app/account.created": z.object({
    userId: z.string(),
  }),
};

type AppPostCreated = {
  name: "app/post.created";
  data: { id: string };
};

type AppPostDeleted = {
  name: "app/post.deleted";
  data: { id: string };
};

export const inngest = new Inngest({
  schemas: new EventSchemas()
    .fromRecord<Events>()
    .fromUnion<AppPostCreated | AppPostDeleted>()
    .fromSchema(zodEventSchemas),
});
```

### Reusing event types&#x20;

You can use the `GetEvents<>` generic to access the final event types from an Inngest client.

> **Callout:** It's recommended to use this instead of directly reusing your event types, as Inngest will add extra properties and internal events such as ts and inngest/function.failed.

```ts
import { EventSchemas, Inngest, type GetEvents } from "inngest";

export const inngest = new Inngest({
  schemas: new EventSchemas().fromRecord<{
    "app/user.created": { data: { userId: string } };
  }>(),
});

type Events = GetEvents<typeof inngest>;
type AppUserCreated = Events["app/user.created"];
```

For more information on this and other TypeScript helpers, see [TypeScript -
Helpers](/docs-markdown/typescript#helpers).

## Cloud Mode and Dev Mode

An SDK can run in two separate "modes:" **Cloud** or **Dev**.

- **Cloud Mode**
  - 🔒 Signature verification **ON**
  - Defaults to communicating with Inngest Cloud (e.g. `https://api.inngest.com`)
- **Dev Mode**
  - ❌ Signature verification **OFF**
  - Defaults to communicating with an Inngest Dev Server (e.g. `http://localhost:8288`)

You can force either Dev or Cloud Mode by setting
[`INNGEST_DEV`](/docs-markdown/sdk/environment-variables#inngest-dev) or the
[`isDev`](#configuration) option.

If neither is set, the SDK will attempt to infer which mode it should be in
based on environment variables such as `NODE_ENV`. Most of the time, this inference is all you need and explicitly setting a mode
isn't required.

## Best Practices

### Share your client across your codebase

Instantiating the `Inngest` client in a single file and sharing it across your codebase is ideal as you only need a single place to configure your client and define types which can be leveraged anywhere you send events or create functions.

```ts {{ title: "v3" }}
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "my-app" });
```

```ts {{ title: "v2" }}
import { Inngest } from "inngest";

export const inngest = new Inngest({ name: "My App" });
```

```ts {{ filename: './inngest/myFunction.ts' }}
import { inngest } from "./client";

export default inngest.createFunction(...);
```

### Handling multiple environments with middleware

If your client uses middleware, that middleware may import dependencies that are not supported across multiple environments such as "Edge" and "Serverless" (commonly with either access to WebAPIs or Node).

In this case, we'd recommend creating a separate client for each environment, ensuring Node-compatible middleware is only used in Node-compatible environments and vice versa.

This need is common in places where function execution should declare more involved middleware, while sending events from the edge often requires much less.

```ts {{ title: "v3" }}
// inngest/client.ts
import { Inngest } from "inngest";
import { nodeMiddleware } from "some-node-middleware";

export const inngest = new Inngest({
  id: "my-app",
  middleware: [nodeMiddleware],
});

// inngest/edgeClient.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "my-app-edge",
});
```

```ts {{ title: "v2" }}
// inngest/client.ts
import { Inngest } from "inngest";
import { nodeMiddleware } from "some-node-middleware";

export const inngest = new Inngest({
  name: "My App",
  middleware: [nodeMiddleware],
});

// inngest/edgeClient.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "My App (Edge)",
});
```

Also see [Referencing functions](/docs-markdown/functions/references), which can help you invoke functions across these environments without pulling in any dependencies.