# Realtime  &#x20;

> **Info:** Realtime is currently in developer preview. Some details including APIs are still subject to change during this period. Read more about the developer preview here.

Realtime enables you to stream updates from your Inngest functions to your users, power live UIs, and implement bi-directional workflows such as Human-in-the-Loop.

Realtime user experience is a core requirement for any web application, especially when long-running tasks are involved. This is supported natively in Inngest without any additional infrastructure or configuration. Inngest manages the WebSocket server and the connection to your users.

## Concepts

There are two core parts of Realtime: **[publishing](#publishing)** and **[subscribing](#subscribing)**. You **publish** data from your functions and **subscribe** to data in your application, either browser or server.

Publishing data is done using the `publish()` function and has three components:

- `channel` - A namespace for which data belongs to, e.g., `user:123`. This is helpful to segment data to ensure that users only receive data that they are authorized to see.
- `topic` - A category of data within a `channel`, e.g., `llm_text_stream` or `upload_progress`. This is helpful to differentiate between types of data that you might use in different parts of your application.
- `data` - The data to be published to the realtime stream.

## Quick start

In this guide, we'll cover how to use realtime, publishing from an Inngest function and subscribing from the client (browser). Start by installing the `@inngest/realtime` package:

```shell {{ title: "npm" }}
npm install @inngest/realtime
```

```shell {{ title: "yarn" }}
yarn add @inngest/realtime
```

```shell {{ title: "pnpm" }}
pnpm add @inngest/realtime
```

```shell {{ title: "Bun" }}
bun add @inngest/realtime
```

```shell {{ title: "Deno" }}
deno add jsr:@inngest/realtime
```

> **Info:** This guide requires @inngest/realtime version 0.4.0 or higher.

> **Info:** This guide requires inngest version 0.5.9 or higher.

### Publishing

To publish data from your Inngest functions, you'll need to add the `realtimeMiddleware()` to your Inngest client. This will automatically add the `publish()` function to your Inngest functions.

```ts {{ title: "client.ts" }}
import { Inngest } from "inngest";
// ℹ️ Import the middleware from the middleware sub-package:
import { realtimeMiddleware } from "@inngest/realtime/middleware";

export const inngest = new Inngest({
  id: "my-app",
  middleware: [realtimeMiddleware()],
});
```

Now, in your Inngest functions, the `publish()` function will be available as a parameter to your handler function. When publishing data, you'll need to specify the `channel` and `topic` you want to publish to and any data you want to publish.

To publish data from your Inngest functions, you'll need to import the experimental.realtime module. This is where you'll find the publish and publish\_sync functions.

See the [Fast API example](https://github.com/inngest/inngest-py/tree/main/examples/fast_api_realtime) for more information.

```tsx {{ title: "Basic (untyped)" }}
import { inngest } from "./client";

inngest.createFunction(
  { id: "create-recommendation" },
  { event: "ai/recommendation.requested" },
  async ({ event, step, publish }) => {

    const response = await step.run('generate-response', () => {
      const response = llm.generateResponse(event.data.prompt);
      await publish({
        channel: `user:${event.data.userId}`,
        topic: "ai",
        data: {
          response: response,
          success: true,
        },
      })
    });

    // ℹ️ Want type-safety with channels and topics? See the typed channels tab above.
  }
);

```

```tsx {{ title: "Typed channels (recommended)" }}
import { inngest } from "./client";
import { channel, topic } from "@inngest/realtime";

// Use the "channel" and "topic" functions to create helpers to
// add type-safety when using realtime:

// The "channel" builder function can accept a string as a channel name,
// or a function that returns a string. Here we create a channel for all logs:
const logsChannel = channel("logs").addTopic(topic("info").type<string>());

// Here we create a channel using the function pattern, which allows us to pass
// a parameter to the channel name. Here we create a channel for each user:
// The "topic" builder function can accept a schema or a type
const userChannel = channel((userId: string) => `user:${userId}`)
  // Add a specific topic, eg. "ai" for all AI data within the user's channel
  .addTopic(
    topic("ai").schema(
      z.object({
        response: z.string(),
        // Transforms are supported for realtime data
        success: z.number().transform(Boolean),
      })
    )
  );

inngest.createFunction(
  { id: "create-recommendation" },
  { event: "ai/recommendation.requested" },
  async ({ event, step, publish }) => {

    await step.run('generate-response', () => {
      const response = llm.generateResponse(event.data.prompt)
      await publish(
        userChannel(event.data.userId).ai({
          response: response,
          success: true,
        })
      );
    });

    await step.run("log-all-went-well", () => {
      await publish(logsChannel().info("All went well"));
    });
  }
);
```

```py {{ title: "Python" }}
import inngest
from inngest.experimental import realtime

from .client import inngest_client

@inngest_client.create_function(
    fn_id="python-realtime-publish",
    trigger=inngest.TriggerEvent(event="realtime.test"),
)
async def python_realtime_publish(ctx: inngest.Context) -> str:
    async def my_first_step() -> dict[str, str]:
        result = {"message": "My llm response from python!"}
        await realtime.publish(
            client=inngest_client,
            channel="user:user_123456789",
            topic="messages",
            data=result,
        )
        return result

    await ctx.step.run("my-first-step", my_first_step)

    return "Finished!"
```

### Subscribing

To subscribe to data on the client (browser), you'll need to create a subscription token and use the `subscribe()` function which also requires `channel` and `topic` to be specified.

Your application uses the Inngest SDK to create a token, which is then used by the subscribe function to connect to the Inngest WebSocket server.

### Create a subscription token

Subscription tokens are required to securely establish a connection to the Inngest WebSocket server.

Your application must create tokens on the server and pass them to the client. You can create a new endpoint to generate a token, ensuring that the user is authorized to subscribe to a given channel and topics.

Here's an example of a server endpoint that creates a token, scoped to a user's channel and specific topics.

```ts {{ title: "Next.js - Server action" }}
// ex. /app/actions/get-subscribe-token.ts
"use server";

import { inngest } from "@/inngest/client";
// See the "Typed channels (recommended)" section above for more details:
import { userChannel } from "@/inngest/functions/helloWorld";
import { getSubscriptionToken, Realtime } from "@inngest/realtime";
import { getSession } from "@/app/lib/session"; // this could be any auth provider

export type UserChannelToken = Realtime.Token<typeof userChannel, ["ai"]>;

export async function fetchRealtimeSubscriptionToken(): Promise<UserChannelToken> {
  const { userId } = await getSession();

  // This creates a token using the Inngest API that is bound to the channel and topic:
  const token = await getSubscriptionToken(inngest, {
    channel: `user:${userId}`,
    topics: ["ai"],
  });

  return token;
}
```

```ts {{ title: "Express" }}
import { inngest } from "./inngest/client";
import { getSubscriptionToken } from "@inngest/realtime";
import { getSession } from "src/session"; // this could be any auth provider

app.post("/api/get-subscribe-token", async (req, res) => {
  const { userId } = getSession(req)

  // This creates a token using the Inngest API that is bound to the channel and topic:
  const token = await getSubscriptionToken(inngest, {
    channel: `user:${userId}`,
    topics: ["ai"],
  })

  res.json({ token })
})
```

```py {{ title: "Python - Fast API" }}
@app.get("/api/get-subscription-token")
async def get_realtime_token():
# Here, you can get params from the request to;
user_id = session["user_id"]
# - Authorize what the user is allowed to subscribe to
# - Allow the client to specify what topics they want to subscribe to
return await realtime.get_subscription_token(
    client=inngest_client,
    channel=f"user:{user_id}",
    topics=["messages"],
)
```

### Subscribe to a channel

Once you have a token, you can subscribe to a channel by calling the `subscribe` function with the token. You can also subscribe using the `useInngestSubscription` React hook. Read more about the [React hook here](/docs-markdown/features/realtime/react-hooks).

```ts {{ title: "React hook - useInngestSubscription()" }}
// ex: ./app/page.tsx
"use client";

// ℹ️ Import the hook from the hooks sub-package:
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useState } from "react";
import { fetchRealtimeSubscriptionToken } from "./actions";

export default function Home() {
  // The hook automatically fetches the token from the server.
  // The server checks that the user is authorized to subscribe to
  // the channel and topic, then returns a token:
  const { data, error, freshData, state, latestData } = useInngestSubscription({
    refreshToken: fetchRealtimeSubscriptionToken,
  });

  return (
    <div>
      {data.map((message, i) => (
        <div key={i}>{message.data}</div>
      ))}
    </div>
  );
}
```

```ts {{ title: "Basic subscribe" }}
import { subscribe } from "@inngest/realtime";

// The server checks that the user is authorized to subscribe to
// the channel and topic, then returns a token:
const { token } = await fetch("/api/get-subscribe-token", {
  method: "POST",
  credentials: "include",
}).then(res => res.json());

// The token is bound to the channel and topic, so we can
// subscribe to the channel and topic:
const stream = await subscribe(token);

for await (const message of stream) {
  console.log(message)
}
```

That's all you need to do to subscribe to a channel from the client!

## Guides

Explore guides for using realtime with different frameworks and patterns:

**"Use Realtime React hooks in Next.js"**: [Leverage the useInngestSubscription() hook to subscribe to realtime streams in your Next.js application.](/docs-markdown/features/realtime/react-hooks)

**"Explore patterns and examples"**: [Use Realtime to stream updates from one or multiple Inngest functions, or to implement a Human-in-the-Loop mechanism.](/docs-markdown/examples/realtime)

## SDK Support

Realtime is supported in the following SDKs:

| SDK        | Publish | Subscribe | Version   |
| ---------- | ------- | --------- | --------- |
| TypeScript | ✅       | ✅         | >=v3.32.0 |
| Golang     | ✅       | ✅         | >=v0.9.0  |
| Python     | ✅       | -         | >=v0.5.9  |

## Limitations

- The number of currently active topics depends on your Inngest plan
- Data sent is currently at-most-once and ephemeral
- The max message size is currently 512KB

## Developer preview

Realtime is available as a developer preview. During this period:

- This feature is **widely available** for all Inngest accounts.
- Some details including APIs and SDKs are subject to change based on user feedback.
- There is no additional cost to using realtime. Realtime will be available to all Inngest billing plans at general availability, but final pricing is not yet determined.

Read the [release phases](/docs/release-phases) for more details.

## Security

Realtime is secure by default. You can only subscribe to a channel's topics using time-sensitive tokens. The subscription token mechanism must be placed within your own protected API endpoints.

You must always specify the channel and topics when publishing data. This ensures that users can only access specific subsets of data within runs.

## Delivery guarantees

Message delivery is currently at-most-once. We recommend that your users subscribe to a channel's topics as you invoke runs or send events to ensure delivery of data within a topic.