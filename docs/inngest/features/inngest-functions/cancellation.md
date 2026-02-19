# Cancellation

Cancellation is a useful mechanism for preventing unnecessary actions based on previous actions (ex, skipping a report generation upon an account deletion) or stopping an unwanted function run composed of multiple steps (ex, deployment mistake, duplicates).

Inngest enables you to cancel running Functions via the API, Dashboard, or based on events:

**Cancel on events**: [Cancel scheduled or sleeping Functions based on incoming events.]('/docs-markdown/features/inngest-functions/cancellation/cancel-on-events')

**Bulk cancel via the Platform Dashboard**: [The quickest way to cancel the Function runs within a given time range.]('/docs/platform/manage/bulk-cancellation')

**Cancel or bulk cancel via the REST API**: [Useful to cancel a large number of Function runs within a specific range.]('/docs/guides/cancel-running-functions#bulk-cancel-via-the-rest-api')

**Replay canceled Function runs**: [Canceled Functions runs can be replayed from the Platform Dashboard]('/docs/platform/replay')

## Anatomy of a cancellation

Inngest cancellation mechanisms prevent a scheduled Function run from running or stop an ongoing Function run between some following steps (sleep or action steps).

Please note that:

- Cancelling a function that has a currently executing step will not stop the step's execution. Any actively executing steps will run to completion.
- Canceling a set of Function runs does not prevent new Function runs from being enqueued (ex, in case of loop issues). Consider using [Functions Pausing](/docs-markdown/guides/pause-functions) instead.

Consider the below Inngest Function:

```ts {{ title: "inngest/scheduleReminder.ts" }}
const scheduleReminder = inngest.createFunction(
  {
    id: "schedule-reminder",
    cancelOn: [{ event: "tasks/deleted", if: "event.data.id == async.data.id" }],
  }
  { event: "tasks/reminder.created" },
  async ({ event, step }) => {
    // Step 1
    await step.sleepUntil('sleep-until-remind-at-time', event.data.remindAt);
    // Step 2
    await step.run('send-reminder-push', async ({}) => {
      await pushNotificationService.push(event.data.userId, event.data.reminderBody)
    })
  }
  // ...
);
```

```py {{ title: "inngest/schedule_reminder.py" }}
@inngest_client.create_function(
    fn_id="schedule-reminder",
    trigger=inngest.TriggerEvent(event="tasks/reminder.created"),
    cancel=[inngest.Cancel(
                event="tasks/deleted",
                if_exp="event.data.id == async.data.id"
            )],
)
async def fn(ctx: inngest.Context) -> None:
    # Step 1
    await ctx.step.sleep_until(
        "sleep-until-remind-at-time",
         ctx.event.data["remind_at"],
    )

    # Step 2
    await ctx.step.run("send-reminder-push", send_reminder_push)

async def send_reminder_push() -> None:
    pass
```

```go {{ title: "main.go" }}
import (
	"context"

	"github.com/inngest/inngestgo"
)

func loadScheduleReminderInngestFn(client inngestgo.Client) (inngestgo.ServableFunction, error) {
	return inngestgo.CreateFunction(
		client,
		inngestgo.FunctionOpts{
			ID:   "schedule-reminder",
			Name: "Schedule reminder",
			Cancel: []inngestgo.ConfigCancel{
				{
					Event: "tasks/deleted",
					If:    inngestgo.StrPtr("event.data.id == async.data.id"),
				},
			},
		},
		// Run on every tasks/reminder.created event.
		inngestgo.EventTrigger("tasks/reminder.created", nil),
		ScheduleReminder,
	)
}

func ScheduleReminder(ctx context.Context, input inngestgo.Input[ScheduleReminderEvent]) (any, error) {
	// ...
	// ...
	return true, nil
}
```

Let's now look at two different cancellations triggered from the Dashboard Bulk Cancellation UI:

**We cancel the Function run before or after Step 1**

1. The Function Run gets picked up by Inngest
2. The Step 1 is processed, triggering a sleep until the following week
3. Three days after, a cancellation is received
4. The Function run is canceled (Step 2 is skipped)

**We cancel the Function run when Step 2 is running**

1. The Function Run gets picked up by Inngest
2. The Step 1 is processed, triggering a sleep until a next week
3. A week after, a cancellation is received but the Step 2 is already started
4. The Step 2 runs until completion
5. The Function run is marked as "canceled"

All canceled Function runs can be replay by using the Platform's [Functions Replay UI](/docs-markdown/platform/replay).

## Handling cancelled functions

Function runs that are cancelled may require additional work like database cleanup or purging of deletion of temporary resources. This can be done leveraging the [`inngest/function.cancelled`](/docs-markdown/reference/system-events/inngest-function-cancelled) system event.

See [this complete example](/docs-markdown/examples/cleanup-after-function-cancellation) for how to use this event within your system to cleanup after a function run is cancelled.