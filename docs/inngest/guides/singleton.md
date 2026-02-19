# Singleton Functions  &#x20;

Singleton Functions enable you to ensure that only a single run of your function (*or a set of specific function runs, based on specific event properties*) is happening at a time.

> **Callout:** Singleton Functions are available in the TypeScript SDK starting from version 3.39.0.

## When to use Singleton Functions

Singleton Functions are useful when you want to ensure that only a single instance of a function is running at a time, for example:

- A third-party data synchronization workflow
- A compute- or time-intensive function that should not be run multiple times at the same time (ex: AI processing)

### Singleton compared to concurrency:

While [Concurrency](/docs-markdown/guides/concurrency) set to `1` ensures that only a single step of a given function is running at a time, Singleton Functions ensure that only a single run of a given function is happening at a time.

### Singleton compared to Rate Limiting:

[Rate Limiting](/docs-markdown/guides/rate-limiting) is similar to Singleton Functions, but it is designed to limit the number of runs started within a time period, whereas Singleton Functions are designed to ensure that only a single run of a function occurs over a given time window.

Rate Limiting is useful for controlling the rate of execution of a function, while Singleton Functions are useful for ensuring that only a single run of a function occurs over a given time window.

## How it works

Singleton Functions are configured using the `singleton` property in the function definition.

The following `data-sync` function demonstrates singleton behavior scoped to individual users. Depending on the `mode`, new runs will either be skipped or will cancel the existing run:

```ts
const dataSync = inngest.createFunction({
    id: "data-sync",
    singleton: {
      key: "event.data.user_id",
      mode: "skip",
    }  
  },
  { event: "data-sync.start" },
  async ({ event }) => {
    // ...
  },
);
```

Refer to the [reference documentation](/docs-markdown/reference/functions/singleton) for more details.

### Using a `key`

When a `key` is added, the unique runs rule is applied for each unique value of the `key` expression. For example, if your `key` is set to `event.data.user_id`,
each user would have their individual singleton rule applied to functions runs, ensuring that only a single run of the function is happening at a time for each user. Read [our guide to writing expressions](/docs-markdown/guides/writing-expressions) for more information.

### Two modes: Skip vs Cancel

Singleton Functions can be configured to either skip the new run or cancel the existing run and start a new one.

The `mode` property configures the behavior of the Singleton Function:

- `"skip"` - Skips the new run if another run is already executing.
- `"cancel"` - Cancels the existing run and starts the new one.

> **Callout:** Cancel mode behavior: Triggering multiple function runs with the same key in very rapid succession may result in some runs being skipped rather than cancelled, similar to a debounce effect. This prevents excessive cancellation overhead when events are triggered in quick bursts.

#### When should I use "cancel" mode vs "skip" mode?

Use `"skip"` mode when you want to prevent duplicate work and preserve the currently running function. Use `"cancel"` mode when you want to ensure the most recent event is always processed, even if it means cancelling an in-progress run.

```ts {{ title: "Skip mode" }}
const dataSync = inngest.createFunction({
    id: "data-sync",
    singleton: {
      key: "event.data.user_id",
      mode: "skip",
    }  
  },
  { event: "data-sync.start" },
  async ({ event }) => {
    const userId = event.data.user_id;
    
    // This long-running sync process will not be interrupted
    // If another sync is triggered for this user, it will be skipped
    const data = await syncUserDataFromExternalAPI(userId);
    const processed = await processLargeDataset(data);
    await updateDatabase(processed);
  },
);
```

```ts {{ title: "Cancel mode" }}
const latestDataSync = inngest.createFunction({
    id: "latest-data-sync",
    singleton: {
      key: "event.data.user_id",
      mode: "cancel",
    }  
  },
  { event: "data-sync.start" },
  async ({ event }) => {
    const userId = event.data.user_id;
    
    // If a newer sync is triggered, this run will be cancelled
    // ensuring only the most recent data is processed
    const payload = await fetchLatestUserData(userId);
    await applyRealTimeUpdates(payload);
  },
);
```

## Compatibility with other flow control features

Singleton Functions can be combined with other flow control features, with the following considerations:

| Flow control                                         | Compatibility | Considerations                                                                                                            |
| ---------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| [Debounce](/docs-markdown/guides/debounce)           | ✅             | Can be used together without issues.                                                                                      |
| [Rate limiting](/docs-markdown/guides/rate-limiting) | ✅             | Similar functionality but rate limiting operates over a predefined time window rather than function execution duration.   |
| [Throttling](/docs-markdown/guides/throttling)       | ✅             | Similar functionality but throttling enqueues events over time rather than discarding/canceling them.                     |
| [Concurrency](/docs-markdown/guides/concurrency)     | ❌             | Singleton functions implicitly have a concurrency of 1. A concurrency setting can be set but should be used with caution. |
| [Batching](/docs-markdown/guides/batching)           | ❌             | Singleton isn't compatible with batching; function registration will fail if both are set.                                |

## FAQ

### How does Singleton Functions work with retries?

If a singleton function fails and is retrying, it should still skip new incoming runs.