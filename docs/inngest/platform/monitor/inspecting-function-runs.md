# Inspecting a Function run

You identified a failed Function run and want to identify the root cause? Or simply want to dig into a run's timings?
The Function run details will provide all the information to understand how this run ran and the tools to reproduce it locally.

## Accessing Function runs

Functions runs across all application of the currently [selected environment](/docs-markdown/platform/environments) are accessible via the "Runs" page in the left side navigation.

![The "Handle failed payments" Function runs list features a run in a failing state.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-runs.png)

*Runs can be filtered using a Status, Queued or Started at and Application filters.*

Accessing the runs of a specific Function is achieved via the "Functions" menu, as described in [the function run details section](/docs-markdown/platform/monitor/inspecting-function-runs#the-function-run-details).

## Searching Function runs

Advanced filters are available using a [CEL expression](/docs-markdown/guides/writing-expressions). The search feature is available by clicking on the "Show search" button next to the other run filters.

![The runs list features an advance search feature that filters results using a CEL query.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-runs-search.png)

### Searchable properties

Only basic search operators and `event` and `output` variables are available for now:

| Field name | Type             | Operators                        |
| ---------- | ---------------- | -------------------------------- |
| event.id   | `string`         | `==`, `!=`                       |
| event.name | `string`         | `==`, `!=`                       |
| event.ts   | `int64`          | `==`, `!=`, `>`, `>=`, `<`, `<=` |
| event.v    | `string`         | `==`, `!=`                       |
| event.data | `map[string]any` | `==`, `!=`, `>`, `>=`, `<`, `<=` |
| output     | `any`            | `==`, `!=`, `>`, `>=`, `<`, `<=` |

A few examples of valid search queries are `event.data.hello == "world"` and `output.success != true`. [Learn more about how expressions are used in Inngest.](/docs-markdown/guides/writing-expressions)

> **Tip:** You can combine multiple search queries using the && operator or || operator. Adding a new line is the equivalent of using the && operator.

### Searching for errors

Errors are serialized as JSON on the `output` object. When supported by the language SDK, errors are deserialized into a structured object. Here is an example of a error in TypeScript:

```typescript {{ title: "Example TypeScript code" }}
throw new NonRetriableError("Failed to import data");
```

```json {{ title: "Example TypeScript error" }}
{
  "name": "NonRetriableError",
  "message": "Failed to import data",
  "stack": "NonRetriableError: Failed to import data\n    at V1InngestExecution.userFnToRun (/opt/render/project/src/build/inngest/ai.js:143:15) ..."
}
```

This error can be searched using the following CEL expression:

```
output.name == "NonRetriableError" && output.message == "Failed to import data"
```

> **Tip:** Using custom error types in TypeScript can make it easier to search by the type of error:Example TypeScript codeimport \{ NonRetriableError } from "inngest";
>
> class UserNotFoundError extends NonRetriableError \{
> &#x20; constructor(message: string) \{
> &#x20;   super(message);
> &#x20;   this.name = "UserNotFoundError";
> &#x20; }
> }
> inngest.createFunction(
> &#x20; \{ id: "my-fn" },
> &#x20; \{ event: "user" },
> &#x20; async (\{ step, event }) => \{
> &#x20;   await step.run("get-user", async () => \{
> &#x20;     const user = await getUser(event.data.userId);
> &#x20;     if (!user) \{
> &#x20;       throw new UserNotFoundError(\`User not found ($\{event.data.userId})\`);
> &#x20;     }
> &#x20;     // ...
> &#x20;   });
> &#x20; }
> );event.data.userId == "12345" && output.name == "UserNotFoundError"

## The Function run details

A *Handle failed payments* function failed after retrying 5 times:

![The "Handle failed payments" Function runs list features a run in a failing state.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/handle-failed-payments-function-run-failed.png)

Clicking on the failed Function Runs expands the run detail view:

![The Function run details view displays the event payload on the left, some technical attributes (function version, timings) on the right and a timeline of steps on the bottom left.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-run-logs.png)

The Function run details panel is divided in 3 parts:

- On the top right: the **Trigger details** helpful when exchanging with Support
- On the right: the **Event payload** that triggered the Function run
- On the bottom right: the **Run details** with its timeline, a clear with of the Function's steps execution

The Function run details informs us that our Function run failed because of an `Error: Failed to downgrade user` error.

This is a first clue, let's have a closer look at the Timeline to identify the root cause:

We can now spot that the `downgrade-account-billing-plan` failed.

Let's expand this step to look at the retries and errors.

![The Timelime of steps features two steps: a first one to fetch the subscription from Stripe and second one to update it. The second is marked as failed.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-run-logs-timeline-1.png)

![Expanding the second step lists all the attempted retries along with their respective error.](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-run-logs-timeline-2.png)

Expanding a step provides the same level of details (the error message and timings) along with retries information.

It seems that our `downgrade-account-billing-plan` step raised the same error during the following 5 retries, we might have to perform a fix in the database.

> **Callout:** 💡 TipsClicking on the icon next to "Run details" open it in a new tab with a full-page layout.Clicking on the icon next to "Run details" open it in a new tab with a full-page layoutIt is useful for Function having a lot of steps or retries!

## Performing actions from the Function run details

The Function run details provides two main actions: replay the Function Run or sending the trigger event to your local Inngest Dev Server.

Sending the trigger Event to your local Inngest Dev Server provides a quick way to reproduce issues that are not linked to external factors (ex: new function version recently deployed, data issues).

After looking at the Function run details, the failure is judged temporary or fixed by a recent deployment, you can replay the Function run by using the "Rerun" button at the top right of the screen.

![The rerun button is accessible in the header of the "run details" section of the Function run detail](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-runs-details-open-new-tab.png)