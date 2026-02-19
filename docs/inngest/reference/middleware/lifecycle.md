# Middleware lifecycle&#x20;

## Hook reference

The `init()` function can return functions for two separate lifecycles to hook into.

> **Callout:** 💡 All lifecycle and hook functions can be synchronous or async functions - the SDK will always wait until a middleware's function has resolved before continuing to the next one.

### `onFunctionRun` lifecycle

Triggered when a function is going to be executed.

- `ctx` (object): The input data for the function. Only event and runId are available at this point.

* `steps` (array): An array of previously-completed step objects.The serialized data for this step if it was successful.The serialized error for this step if it failed.

- `fn` (InngestFunction): The function that is about to be executed.

* `reqArgs` (array): Arguments passed to the framework's request handler, which are used by the SDK's serve handler.

- `transformInput` (function): Called once the input for the function has been set up. This is where you can modify the input before the function starts.Has the same input as the containing onFunctionRun() lifecycle function, but with a complete ctx object, including step tooling.An object that will be merged with the existing function input to create a new input.An array of modified step data to use in place of the current step data.

* `beforeMemoization` (function): Called before the function starts to memoize state (running over previously-seen code).

- `afterMemoization` (function): Called after the function has finished memoizing state (running over previously-seen code).

* `beforeExecution` (function): Called before any step or code executes.

- `afterExecution` (function): Called after any step or code has finished executing.

* `transformOutput` (function): Called after the function has finished executing and before the response is sent back to Inngest. This is where you can modify the output.An object containing the data to be sent back to Inngest in the data key, and an original error (if any) that threw\.If this execution ran a step, will be a step that ran.An object containing a data key to overwrite the data that will be sent back to Inngest for this step or function.

- `finished` (function): Called when execution is complete and a final response is returned (success or an error), which will end the run.This function is not guaranteed to be called on every execution. It may be called multiple times if there are many parallel executions or during retries.An object that contains either the successful data ending the run or the error that has been thrown. Both outputs have already been affected by transformOutput.

* `beforeResponse` (function): Called after the output has been set and before the response has been sent back to Inngest. Use this to perform any final actions before the request closes.

```ts
const myMiddleware = new InngestMiddleware({
  name: "My Middleware",
  init({ client, fn }) {
    return {
      onFunctionRun({ ctx, fn, steps }) {
        return {
          transformInput({ ctx, fn, steps }) {
            // ...
            return {
              // All returns are optional
              ctx: { /* extend fn input */ },
              steps: steps.map(({ data }) => { /* transform step data */ })
            }
          },
          beforeMemoization() {
            // ...
          },
          afterMemoization() {
            // ...
          },
          beforeExecution() {
            // ...
          },
          afterExecution() {
            // ...
          },
          transformOutput({ result, step }) {
            // ...
            return {
              // All returns are optional
              result: {
                // Transform data before it goes back to Inngest
                data: transformData(result.data)
              }
            }
          },
          finished({ result }) {
            // ...
          },
          beforeResponse() {
            // ...
          },
        };
      },
    };
  },
});
```

***

### `onSendEvent` lifecycle

Triggered when an event is going to be sent via `inngest.send()`, `step.sendEvent()`, or `step.invoke()`.

- `transformInput` (function): Called before the events are sent to Inngest. This is where you can modify the events before they're sent.

* `transformOutput` (function): Called after events are sent to Inngest. This is where you can perform any final actions and modify the output from inngest.send().

```ts
const myMiddleware = new InngestMiddleware({
  name: "My Middleware",
  init: ({ client, fn }) => {
    return {
      onSendEvent() {
        return {
          transformInput({ payloads }) {
            // ...
          },
          transformOutput() {
            // ...
          },
        };
      },
    };
  },
});
```