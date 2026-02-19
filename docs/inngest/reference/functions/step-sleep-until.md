# Sleep until `step.sleepUntil()`

## `step.sleepUntil(id, datetime): Promise`

- `id` (string): The ID of the step. This will be what appears in your function's logs and is used to memoize step state across function versions.

* `datetime` (Date | string | Temporal.Instant | Temporal.ZonedDateTime): The datetime at which to continue execution of your function. This can be:A Date objectAny date time string in the format accepted by the Date object, i.e. YYYY-MM-DDTHH:mm:ss.sssZ or simplified forms like YYYY-MM-DD or YYYY-MM-DDHH:mm:ss Temporal.Instant Temporal.ZonedDateTime

```ts {{ title: "v3" }}
// Sleep until the new year
await step.sleepUntil("happy-new-year", "2024-01-01");

// Sleep until September ends
await step.sleepUntil("wake-me-up", "2023-09-30T11:59:59");

// Sleep until the end of the this week
const date = dayjs().endOf("week").toDate();
await step.sleepUntil("wait-for-end-of-the-week", date);

// Sleep until tea time in London
const teaTime = Temporal.ZonedDateTime.from("2025-05-01T16:00:00+01:00[Europe/London]");
await step.sleepUntil("british-tea-time", teaTime);

// Sleep until the end of the day
const now = Temporal.Now.instant();
const endOfDay = now.round({ smallestUnit: "day", roundingMode: "ceil" });
await step.sleepUntil("done-for-today", endOfDay);
```

```ts {{ title: "v2" }}
// Sleep until the new year
await step.sleepUntil("2024-01-01");

// Sleep until September ends
await step.sleepUntil("2023-09-30T11:59:59");

// Sleep until the end of the this week
const date = dayjs().endOf('week').toDate();
await step.sleepUntil(date)
```

> **Callout:** step.sleepUntil() must be called using await or some other Promise handler to ensure your function sleeps correctly.