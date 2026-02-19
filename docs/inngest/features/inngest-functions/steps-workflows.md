# Steps & Workflows

Steps are fundamental building blocks of Inngest, turning your Inngest Functions into reliable workflows that can runs for months and recover from failures.

**Thinking in Steps**: [Discover by example how steps enable more reliable and flexible functions with step-level error handling, conditional steps and waits.]('/docs-markdown/guides/multi-step-functions')

Once you are familiar with Steps, start adding new capabilities to your Inngest Functions:

**Add sleeps**: [Enable your Inngest Functions to pause by waiting from minutes to months.]('/docs/features/inngest-functions/steps-workflows/sleeps')

**Wait for events**: [Write functions that react to incoming events.]('/docs/features/inngest-functions/steps-workflows/wait-for-event')

**Loop over steps**: [Iterate over large datasets by looping with steps.]('/docs/guides/working-with-loops')

**Parallelize steps**: [Discover how to apply the map-reduce pattern with Steps.]('/docs/guides/step-parallelism')

## How steps work

You might wonder: how do Steps work? Why doesn't an Inngest Function get timed out when running on a Serverless environment?

You can think of steps as an API for expressing checkpoints in your workflow, such as waits or work that might benefit from retries or parallelism:

```ts {{ title: "TypeScript" }}
inngest.createFunction(
  { id: "sync-systems" },
  { event: "auto/sync.request" },
  async ({ step }) => {
    // By wrapping code in step.run, the code will be retried if it throws an error and when successfuly.
    // It's result is saved to prevent unnecessary re-execution
    const data = await step.run("get-data", async () => {
      return getDataFromExternalSource();
    });

    // Can also be retried up to 4 times
    await step.run("save-data", async () => {
      return db.syncs.insertOne(data);
    });
  },
);
```

```py {{ title: "Python" }}
@inngest_client.create_function(
    fn_id="sync-systems",
    trigger=inngest.TriggerEvent(event="auto/sync.request"),
)
def sync_systems(ctx: inngest.ContextSync) -> None:
    # By wrapping code in step.run, the code will be retried if it throws an error and when successfuly.
    # It's result is saved to prevent unnecessary re-execution
    data = ctx.step.run("Get data", get_data_from_external_source)

    # Can also be retried up to 4 times
    ctx.step.run("Save data", db.syncs.insert_one, data)
```

```go {{ title: "Go" }}
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

Each step execution relies on a communication with Inngest's [Durable Execution Engine](/docs-markdown/learn/how-functions-are-executed) which is responsible to:

- Invoking Functions with the correct steps state (current step + previous steps data)
- Gather each step result and schedule the next step to perform

This architecture powers the durability of Inngest Functions with retriable steps and waits from hours to months. Also, when used in a serverless environment, steps benefit from an extended max duration, enabling workflows that both span over months and run for more than 5 minutes!

Explore the following guide for a step-by-step overview of a complete workflow run:

**How Functions are executed**: [A deep dive into Inngest's Durable Execution Engine with a step-by-step workflow run example.]('/docs/learn/how-functions-are-executed')

## SDK References

**"TypeScript SDK"**: [Steps API reference]("/docs/reference/functions/step-run")

**"Python SDK"**: [Steps API reference]("/docs/reference/python/steps/invoke")

**"Go SDK"**: [Steps API reference]("https://pkg.go.dev/github.com/inngest/inngestgo@v0.9.0/step")