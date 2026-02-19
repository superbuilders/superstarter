# Inngest Functions

Inngest functions enable developers to run reliable background logic, from background jobs to complex workflows.
An Inngest Function is composed of 3 main parts that provide robust tools for retrying, scheduling, and coordinating complex sequences of operations:

**Triggers**: [A list of Events, Cron schedules or webhook events that trigger Function runs.]('/docs-markdown/features/events-triggers')

**Flow Control**: [Control how Function runs get distributed in time with Concurrency, Throttling and more.]('/docs/guides/flow-control')

**Steps**: [Transform your Inngest Function into a workflow with retriable checkpoints.]('/docs/features/inngest-functions/steps-workflows')

```ts
inngest.createFunction({
    id: "sync-systems",
    // Easily add Throttling with Flow Control
    throttle: { limit: 3, period: "1min"},
  },
  // A Function is triggered by events
  { event: "auto/sync.request" },
  async ({ step }) => {
    // step is retried if it throws an error
    const data = await step.run("get-data", async () => {
      return getDataFromExternalSource();
    });

    // Steps can reuse data from previous ones
    await step.run("save-data", async () => {
      return db.syncs.insertOne(data);
    });
  }
);
```

```python
@inngest_client.create_function(
    id="sync-systems",
    # trigger (event or cron)
    trigger=inngest.TriggerEvent(event="auto/sync.request"),
)
def sync_systems(ctx: inngest.ContextSync) -> None:
    # step is retried if it throws an error
    data = ctx.step.run("Get data", get_data_from_external_source)

    # Steps can reuse data from previous ones
    ctx.step.run("Save data", db.syncs.insert_one, data)
```

```go
import (
	"context"

	"github.com/inngest/inngestgo"
	"github.com/inngest/inngestgo/step"
)

func loadSyncDataInngestFn(client inngestgo.Client) (inngestgo.ServableFunction, error) {
	return inngestgo.CreateFunction(client,
		inngestgo.FunctionOpts{ID: "sync-systems"},
		// Functions are triggered by events
		inngestgo.EventTrigger("auto/sync.request", nil),
		func(ctx context.Context, input inngestgo.Input[SyncRequestEvent]) (any, error) {
			// By wrapping code in step.run, the code will be retried if it throws an error and when successfuly.
			// It's result is saved to prevent unnecessary re-execution
			data, err := step.Run(ctx, "get-data", func(ctx context.Context) (any, error) {
				return getDataFromExternalSource()
			})
			if err != nil {
				return nil, err
			}

			// steps can reuse data from previous ones
			// can also be retried up to 4 times
			_, err = step.Run(ctx, "save-data", func(ctx context.Context) (any, error) {
				return InsertIntoDB(data.(DataType))
			})
			if err != nil {
				return nil, err
			}

			return nil, nil
		},
	)
}
```

## Using Inngest Functions

Start using Inngest Functions by using the pattern that fits your use case:

**Background jobs**: [Run long-running tasks out of the critical path of a request.]('/docs-markdown/guides/background-jobs')

**Delayed Functions**: [Schedule Functions that run in the future.]('/docs/guides/delayed-functions')

**Cron Functions**: [Build Inngest Functions as CRONs.]('/docs/guides/scheduled-functions')

**Workflows**: [Start creating workflows by leveraging Inngest Function Steps.]('/docs/guides/multi-step-functions')

## Learn more about Functions and Steps

Functions and Steps are powered by Inngest's Durable Execution Engine. Learn about its inner working by reading the following guides:

**How Functions are executed**: [A deep dive into Inngest's Durable Execution Engine with a step-by-step workflow run example.]('/docs/learn/how-functions-are-executed')

**Thinking in Steps**: [Discover by example how steps enable more reliable and flexible functions with step-level error handling, conditional steps and waits.]('/docs/guides/multi-step-functions')

## SDK References

**"TypeScript SDK"**: [API reference]("/docs/reference/typescript")

**"Python SDK"**: [API reference]("/docs/reference/python")

**"Go SDK"**: [Go API reference]("https://pkg.go.dev/github.com/inngest/inngestgo@v0.9.0/step")