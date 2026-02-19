# Sleeps

Two step methods, `step.sleep` and `step.sleepUntil`, are available to pause the execution of your function for a specific amount of time. Your function can sleep for seconds, minutes, or days, up to a maximum of one year.

Using sleep methods can avoid the need to run multiple cron jobs or use additional queues. For example, Sleeps enable you to create a user onboarding workflow that sequences multiple actions in time: first send a welcome email, then send a tutorial each day for a week.

## How Sleeps work

`step.sleep` and `step.sleepUntil` tell Inngest to resume execution of your function at a future time. Your code doesn't need to be running during the sleep interval, allowing sleeps to be used in any environment, even serverless platforms.

A Function paused by a sleeping Step doesn't affect your account capacity; i.e. it does not count against your plan's concurrency limit. A sleeping Function doesn't count against any [concurrency policy](/docs-markdown/guides/concurrency) you've set on the function, either.

## Pausing an execution for a given time

Use `step.sleep()` to pause the execution of your function for a specific amount of time.

```ts
export default inngest.createFunction(
  { id: "send-delayed-email" },
  { event: "app/user.signup" },
  async ({ event, step }) => {
    await step.sleep("wait-a-couple-of-days", "2d");
    // Do something else
  }
);
```

Check out the [`step.sleep()` TypeScript reference.](/docs-markdown/reference/functions/step-sleep)

Use `step.sleep()` to pause the execution of your function for a specific amount of time.

```py
@inngest_client.create_function(
    fn_id="my_function",
    trigger=inngest.TriggerEvent(event="app/my_function"),
)
async def fn(ctx: inngest.Context) -> None:
    await ctx.step.sleep("zzz", datetime.timedelta(seconds=2))
```

Check out the [`step.sleep()` Python reference.](/docs-markdown/reference/python/steps/sleep)

Use `step.Sleep()` to pause the execution of your function for a specific amount of time.

```go
func AccountCreated(ctx context.Context, input inngestgo.Input[AccountCreatedEvent]) (any, error) {
  // Sleep for a second, minute, hour, week across server restarts.
  step.Sleep(ctx, "initial-delay", time.Second)

  // ...

  return nil, nil
}
```

Check out the [`step.Sleep()` Go reference.](https://pkg.go.dev/github.com/inngest/inngestgo@v0.9.0/step#Sleep)

## Pausing an execution until a given date

Use `step.sleepUntil()` to pause the execution of your function until a specific date time.

```ts
export default inngest.createFunction(
  { id: "send-scheduled-reminder" },
  { event: "app/reminder.scheduled" },
  async ({ event, step }) => {
    const date = new Date(event.data.remind_at);
    await step.sleepUntil("wait-for-scheduled-reminder", date);
    // Do something else
  }
);
```

Check out the [`step.sleepUntil()` TypeScript reference.](/docs-markdown/reference/functions/step-sleep-until)

Use `step.sleep_until()` to pause the execution of your function until a specific date time.

```py
@inngest_client.create_function(
    fn_id="my_function",
    trigger=inngest.TriggerEvent(event="app/my_function"),
)
async def fn(ctx: inngest.Context) -> None:
    await ctx.step.sleep_until(
        "zzz",
        datetime.datetime.now() + datetime.timedelta(seconds=2),
    )
```

Check out the [`step.sleep_until()` Python reference.](/docs-markdown/reference/python/steps/sleep-until)

*Sleep until a given date is not yet available in the Go SDK.*

> **Callout:** Sleeps and trace/log historyYou may notice that Inngest Cloud's Function Runs view doesn't show function runs that use sleeps longer than your Inngest plan's trace & log history limit, even though the functions are still sleeping and will continue to run as expected. This is a known limitation in our current dashboard and we're working to improve it.In the meantime:Rest assured that your sleeping functions are still sleeping and will resume as scheduled, even if they're not visible in the Function Runs list.Given a function run's ID, you can inspect its status using Inngest Cloud's Quick Search feature (Ctrl-K or ⌘K) or the REST API.