# `inngest/function.cancelled`&#x20;

The `inngest/function.cancelled` event is sent whenever any single function is cancelled in your [Inngest environment](/docs-markdown/platform/environments). The event will be sent if the event is cancelled via [`cancelOn` event](/docs-markdown/features/inngest-functions/cancellation/cancel-on-events), [function timeouts](/docs-markdown/features/inngest-functions/cancellation/cancel-on-timeouts),  [REST API](/docs-markdown/guides/cancel-running-functions) or [bulk cancellation](/docs-markdown/platform/manage/bulk-cancellation).

This event can be used to handle cleanup or similar for a single function or handle some sort of tracking function cancellations in some external system like Datadog.

> **Callout:** You can write a function that uses the "inngest/function.cancelled" event with the optional if parameter to filter to specifically handle a single function by function\_id.

## The event payload

- `name` (\`string: "inngest/function.cancelled"\`): The inngest/ event prefix is reserved for system events in each environment.

* `data` (object): The event payload data.Data about the error payload as returned from the cancelled function.The cancellation error, always "function cancelled"The name of the error, defaulting to "Error".The cancelled function's original event payload.The cancelled function's id.The cancelled function's run ID.

- `ts` (number): The timestamp integer in milliseconds at which the cancellation occurred.

```json {{ title: "Example payload" }}
{
  "name": "inngest/function.cancelled",
  "data": {
    "error": {
      "error": "function cancelled",
      "message": "function cancelled",
      "name": "Error"
    },
    "event": {
      "data": {
        "content": "Yost LLC explicabo eos",
        "transcript": "s3://product-ideas/carber-vac-release.txt",
        "userId": "bdce1b1b-6e3a-43e6-84c2-2deb559cdde6"
      },
      "id": "01JDJK451Y9KFGE5TTM2FHDEDN",
      "name": "integrations/export.requested",
      "ts": 1732558407003,
      "user": {}
    },
    "events": [
      {
        "data": {
          "content": "Yost LLC explicabo eos",
          "transcript": "s3://product-ideas/carber-vac-release.txt",
          "userId": "bdce1b1b-6e3a-43e6-84c2-2deb559cdde6"
        },
        "id": "01JDJK451Y9KFGE5TTM2FHDEDN",
        "name": "integrations/export.requested",
        "ts": 1732558407003
      }
    ],
    "function_id": "demo-app-export",
    "run_id": "01JDJKGTGDVV4DTXHY6XYB7BKK"
  },
  "id": "01JDJKH1S5P2YER8PKXPZJ1YZJ",
  "ts": 1732570023717
}
```

## Related resources

- [Example: Cleanup after function cancellation](/docs-markdown/examples/cleanup-after-function-cancellation)