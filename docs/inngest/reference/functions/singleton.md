# Ensure exclusive execution of a function

Ensure that only a single run of a function (*or a set of specific functions, based on specific event properties*) is running at a time.

See the [Singleton Functions guide](/docs-markdown/guides/singleton) for more information about how this feature works.

```ts
export default inngest.createFunction(
  {
    id: "data-sync",
    singleton: {
      key: "event.data.user_id",
      mode: "skip",
    },
  },
  { event: "data-sync.start" },
  async ({ event }) => {
    // This function will be skipped if another run of the same function is already running for the same user
  }
);
```

## Configuration

- `singleton` (object): Options to configure exclusive execution of a function.A unique key expression to which the limit is applied. This expression is evaluated for each triggering event.Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read our guide to writing expressions for more info. Examples:Ensure exclusive execution of a function per customer ID: 'event.data.customer\_id'Ensure exclusive execution of a function per account and email address: 'event.data.account\_id + "-" + event.user.email'The mode to use for the singleton function:"skip": Skip the new run."cancel": Cancel the existing run and start the new one.