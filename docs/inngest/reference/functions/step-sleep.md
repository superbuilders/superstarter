# Sleep `step.sleep()`

## `step.sleep(id, duration): Promise`

- `id` (string): The ID of the step. This will be what appears in your function's logs and is used to memoize step state across function versions.

* `duration` (number | string | Temporal.Duration): The duration of time to sleep:number of millisecondsstring compatible with the ms package, e.g. "30m", "3 hours", or "2.5d" Temporal.Duration

```ts {{ title: "v3" }}
// Sleep for 30 minutes
const thirtyMins = Temporal.Duration.from({ minutes: 30 });
await step.sleep("wait-with-temporal", thirtyMins);

await step.sleep("wait-with-string", "30m");
await step.sleep("wait-with-string-alt", "30 minutes");
await step.sleep("wait-with-ms", 30 * 60 * 1000);
```

```ts {{ title: "v2" }}
// Sleep for 30 minutes
await step.sleep("30m");
await step.sleep("30 minutes");
await step.sleep(30 * 60 * 1000);
```

> **Callout:** step.sleep() must be called using await or some other Promise handler to ensure your function sleeps correctly.