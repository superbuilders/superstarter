# Wait for signal

Wait for a particular signal to be received before continuing with step.waitForSignal().  You must resume signals by
calling `step.sendSignal` or `client.sendSignal` (as a step or on the Inngest client), passing the same signal string
and any data you want to inject into the function run.

## `step.waitForSignal(id, options): Promise<null | EventPayload>`

- `id` (string): The ID of the step. This will be what appears in your function's logs and is used to memoize step state across function versions.

* `options` (object): Options for configuring how to wait for the event.A unique identifier for the signal, used to resume this function run.The amount of time to wait to receive the signal. A time string compatible with the ms package, e.g. "30m", "3 hours", or "2.5d".If the signal is not received before this timeout, the run will resume with an undefined return value.How to handle duplicate signals.  By default, step.waitForSignal requires a unique signal and duplicate signals will fail the function.Set to 'replace' to replace any other run's signal.  Note that previous runs will NOT resume from this signal if replaced, and instead will time out.To resume many runs from a single signal, use step.waitForEvent.

```ts {{ title: "v3" }}
// Wait 15m for an approval
const approval = await step.Signal("wait-for-approval", {
  signal: "task/71651db4-9f27-466a-a6be-4759b9784b3c",
  timeout: "7d",
});
```

> **Callout:** step.waitForSignal() must be called using await or some other Promise handler to ensure your function pauses correctly.

> **Callout:** step.waitForSignal() must be resumed by inngest.sendSignal, step.sendSignal, or a call to the signal API to be resumed with
> a matching signal string.