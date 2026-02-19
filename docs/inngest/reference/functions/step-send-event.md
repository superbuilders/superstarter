# Send Event

Use to send event(s) reliably within your function. Use this instead of [`inngest.send()`](/docs-markdown/reference/events/send) to ensure reliable event delivery from within functions. This is especially useful when [creating functions that fan-out](/docs-markdown/guides/fan-out-jobs).

```ts {{ title: "v3" }}
export default inngest.createFunction(
  { id: "user-onboarding" },
  { event: "app/user.signup" },
  async ({ event, step }) => {
    // Do something
    await step.sendEvent("send-activation-event", {
      name: "app/user.activated",
      data: { userId: event.data.userId },
    });
    // Do something else
  }
);
```

```ts {{ title: "v2" }}
export default inngest.createFunction(
  { name: "User onboarding" },
  { event: "app/user.signup" },
  async ({ event, step }) => {
    // Do something
    await step.sendEvent({
      name: "app/user.activated",
      data: { userId: event.data.userId },
    });
    // Do something else
  }
);
```

To send events from outside of the context of a function, use [`inngest.send()`](/docs-markdown/reference/events/send).

***

## `step.sendEvent(id, eventPayload | eventPayload[]): Promise<{ ids: string[] }>`

- `id` (string): The ID of the step. This will be what appears in your function's logs and is used to memoize step state across function versions.

* `eventPayload` (object | object\[]): An event payload object or an array of event payload objects.See the documentation for inngest.send() for the event payload format.

```ts {{ title: "v3" }}
// Send a single event
await step.sendEvent("send-activation-event", {
  name: "app/user.activated",
  data: { userId: "01H08SEAXBJFJNGTTZ5TAWB0BD" },
});

// Send an array of events
await step.sendEvent("send-invoice-events", [
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e024befa68763f5b500" },
  },
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e08f29fb563c972b1f7" },
  },
]);
```

```ts {{ title: "v2" }}
// Send a single event
await step.sendEvent({
  name: "app/user.activated",
  data: { userId: "01H08SEAXBJFJNGTTZ5TAWB0BD" },
});

// Send an array of events
await step.sendEvent([
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e024befa68763f5b500" },
  },
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e08f29fb563c972b1f7" },
  },
]);
```

> **Callout:** step.sendEvent() must be called using await or some other Promise handler to ensure your function sleeps correctly.

### Return values

The function returns a promise that resolves to an object with an array of Event IDs that were sent. These events can be used to look up the event in the Inngest dashboard or via [the REST API](https://api-docs.inngest.com/docs-markdown/inngest-api/pswkqb7u3obet-get-an-event).

```ts
const { ids } = await step.sendEvent([
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e024befa68763f5b500" }
  },
  {
    name: "app/invoice.created",
    data: { invoiceId: "645e9e08f29fb563c972b1f7" }
  },
]);
/**
 * ids = [
 *   "01HQ8PTAESBZPBDS8JTRZZYY3S",
 *   "01HQ8PTFYYKDH1CP3C6PSTBZN5"
 * ]
 */
```