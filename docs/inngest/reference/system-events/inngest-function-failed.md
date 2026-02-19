# `inngest/function.failed`&#x20;

The `inngest/function.failed` event is sent whenever any single function fails in your [Inngest environment](/docs-markdown/platform/environments).

This event can be used to track all function failures in a single place, enabling you to send metrics, alerts, or events to [external systems like Datadog or Sentry](/docs-markdown/examples/track-failures-in-datadog) for all of your Inngest functions.

Our SDKs offer shorthand ["on failure"](#related-resources) handler options that can be used to handle this event for a specific function.

## The event payload

- `name` (\`string: "inngest/function.failed"\`): The inngest/ event prefix is reserved for system events in each environment.

* `data` (object): The event payload data.Data about the error payload as returned from the failed function.The error message when an error is caught.The name of the error, defaulting to "Error" if unspecified.The stack trace of the error, if supported by the language SDK.The failed function's original event payload.The failed function's id.The failed function's run ID.

- `ts` (number): The timestamp integer in milliseconds at which the failure occurred.

```json {{ title: "Example payload" }}
  {
    "name": "inngest/function.failed",
    "data": {
      "error": {
        "__serialized": true,
        "error": "invalid status code: 500",
        "message": "taylor@ok.com is already a list member. Use PUT to insert or update list members.",
        "name": "Error",
        "stack": "Error: taylor@ok.com is already a list member. Use PUT to insert or update list members.\n    at /var/task/.next/server/pages/api/inngest.js:2430:23\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async InngestFunction.runFn (/var/task/node_modules/.pnpm/inngest@2.6.0_typescript@5.1.6/node_modules/inngest/components/InngestFunction.js:378:32)\n    at async InngestCommHandler.runStep (/var/task/node_modules/.pnpm/inngest@2.6.0_typescript@5.1.6/node_modules/inngest/components/InngestCommHandler.js:459:25)\n    at async InngestCommHandler.handleAction (/var/task/node_modules/.pnpm/inngest@2.6.0_typescript@5.1.6/node_modules/inngest/components/InngestCommHandler.js:359:33)\n    at async ServerTiming.wrap (/var/task/node_modules/.pnpm/inngest@2.6.0_typescript@5.1.6/node_modules/inngest/helpers/ServerTiming.js:69:21)\n    at async ServerTiming.wrap (/var/task/node_modules/.pnpm/inngest@2.6.0_typescript@5.1.6/node_modules/inngest/helpers/ServerTiming.js:69:21)"
      },
      "event": {
        "data": { "billingPlan": "pro" },
        "id": "01H0TPSHZTVFF6SFVTR6E25MTC",
        "name": "user.signup",
        "ts": 1684523501562,
        "user": { "external_id": "6463da8211cdbbcb191dd7da" }
      },
      "function_id": "my-gcp-cloud-functions-app-hello-inngest",
      "run_id": "01H0TPSJ576QY54R6JJ8MEX6JH"
    },
    "id": "01H0TPW7KB4KCR739TG2J3FTHT",
    "ts": 1684523589227
  }
```

## Related resources

- [TypeScript SDK: onFailure handler](/docs-markdown/reference/functions/handling-failures)
- [Python SDK: on\_failure handler](/docs-markdown/reference/python/functions/create#on_failure)
- [Example: Track all function failures in Datadog](/docs-markdown/examples/track-failures-in-datadog)