# Cancel on

Stop the execution of a running function when a specific event is received using `cancelOn`.

```ts
inngest.createFunction(
  {
    id: "sync-contacts",
    cancelOn: [
      {
        event: "app/user.deleted",
        // ensure the async (future) event's userId matches the trigger userId
        if: "async.data.userId == event.data.userId",
      },
    ],
  }
  // ...
);
```

Using `cancelOn` is very useful for handling scenarios where a long-running function should be terminated early due to changes elsewhere in your system.

The API for this is similar to the [`step.waitForEvent()`](/docs-markdown/guides/multi-step-functions#wait-for-event) tool, allowing you to specify the incoming event and different methods for matching pieces of data within.

***

## How to use `cancelOn`

The most common use case for cancellation is to cancel a function's execution if a specific field in the incoming event matches the same field in the triggering event. For example, you might want to cancel a sync event for a user if that user is deleted. For this, you need to specify a `match` [expression](/docs-markdown/guides/writing-expressions). Let's look at an example function and two events.

This function specifies it will `cancelOn` the `"app/user.deleted"` event only when it and the original `"app/user.created"` event have the same `data.userId` value:

```ts
inngest.createFunction(
  {
    id: "sync-contacts",
    cancelOn: [
      {
        event: "app/user.deleted",
        // ensure the async (future) event's userId matches the trigger userId
        if: "async.data.userId == event.data.userId",
      },
    ],
  },
  { event: "app/user.created" },
  // ...
);
```

For the given function, this is an example of an event that would trigger the function:

```json
{
  "name": "app/user.created",
  "data": {
    "userId": "123",
    "name": "John Doe"
  }
}
```

And this is an example of an event that would cancel the function as it and the original event have the same `data.userId` value of `"123"`:

```json
{
  "name": "app/user.deleted",
  "data": {
    "userId": "123"
  }
}
```

Match expressions can be simple equalities or be more complex. Read [our guide to writing expressions](/docs-markdown/guides/writing-expressions) for more info.

> **Callout:** Functions are cancelled between steps, meaning that if there is a step.run currently executing, it will finish before the function is cancelled.Inngest does this to ensure that steps are treated like atomic operations and each step either completes or does not run at all.

## Configuration

- `cancelOn` (array of objects): Define events that can be used to cancel a running or sleeping functionThe event name which will be used to cancelThe property to match the event trigger and the cancelling event, using dot-notation, for example, data.userId. Read our guide to writing expressions for more info.An expression on which to conditionally match the original event trigger (event) and the wait event (async). Cannot be combined with match.Expressions are defined using the Common Expression Language (CEL) with the events accessible using dot-notation. Read our guide to writing expressions for more info. Examples:event.data.userId == async.data.userId && async.data.billing\_plan == 'pro'The amount of time to wait to receive the cancelling event. A time string compatible with the ms package, e.g. "30m", "3 hours", or "2.5d"

## Examples

### With a timeout window

Cancel a function's execution if a matching event is received within a given amount of time from the function being triggered.

```ts {{ title: "v3" }}
inngest.createFunction(
  {
    id: "sync-contacts",
    cancelOn: [{ event: "app/user.deleted", match: "data.userId", timeout: "1h" }],
  }
  // ...
);
```

```ts {{ title: "v2" }}
inngest.createFunction(
  {
    name: "Sync contacts",
    cancelOn: [{ event: "app/user.deleted", match: "data.userId", timeout: "1h" }],
  }
  // ...
);
```

This is useful when you want to limit the time window for cancellation, ensuring that the function will continue to execute if no matching event is received within the specified time frame.