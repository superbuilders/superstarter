# Events & Triggers

Inngest functions are triggered asynchronously by **events** coming from various sources, including:

**Your application**: [Send an event from your application’s backend with the Inngest SDK.](/docs-markdown/events)

**Cron schedule**: [Run an Inngest function periodically with a trigger using cron syntax.]('/docs/guides/scheduled-functions')

**Webhook events**: [Use Inngest as a webhook consumer for any service to trigger functions.]('/docs/platform/webhooks')

**Another Inngest function**: [Directly invoke other functions to compose more powerful functions.]('/docs/guides/invoking-functions-directly')

You can customize each of these triggers in multiple ways:

- **[Filtering event triggers](/docs/guides/writing-expressions)** - Trigger a function for a subset of matching events sent.
- **[Delaying execution](/docs-markdown/guides/delayed-functions)** - Trigger a function to run at a specific timestamp in the future.
- **[Batching events](/docs-markdown/guides/batching)** - Process multiple events in a single function for more efficient systems.
- **[Multiple triggers](/docs-markdown/guides/multiple-triggers)** - Use a single function to handle multiple event types.

## Why events?

Using Events to trigger Inngest Functions instead of direct invocations offers a lot of flexibility:

- Events can trigger multiple Inngest Functions.
- Events can be used to synchronize Inngest Function runs with [cancellation](/docs-markdown/features/inngest-functions/cancellation) and [“wait for event” step](/docs-markdown/reference/functions/step-wait-for-event).
- Events can be leveraged to trigger Functions across multiple applications.
- Similar Events can be grouped together for faster processing.

Events act as a convenient mapping between your application actions (ex, `user.signup`) and your application's code (ex, `sendWelcomeEmail()` and `importContacts()`):

### Learn more about Events

**Blog post: How event Filtering works**: [Accidentally Quadratic: Evaluating trillions of event matches in real-time]('https://www.inngest.com/blog/accidentally-quadratic-evaluating-trillions-of-event-matches-in-real-time')

**Blog post: Events in practice**: [Building an Event Driven Video Processing Workflow with Next.js, tRPC, and Inngest]('https://www.inngest.com/blog/nextjs-trpc-inngest')