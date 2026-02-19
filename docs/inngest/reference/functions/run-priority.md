# Function run priority&#x20;

You can prioritize specific function runs above other runs **within the same function**.

See the [Priority guide](/docs-markdown/guides/priority) for more information about how this feature works.

```ts
export default inngest.createFunction(
  {
    id: "ai-generate-summary",
    priority: {
      // For enterprise accounts, a given function run will be prioritized
      // ahead of functions that were enqueued up to 120 seconds ago.
      // For all other accounts, the function will run with no priority.
      run: "event.data.account_type == 'enterprise' ? 120 : 0",
    },
  },
  { event: "ai/summary.requested" },
  async ({ event, step }) => {
    // This function will be prioritized based on the account type
  }
);
```

## Configuration

- `priority` (object): Options to configure how to prioritize functionsAn expression which must return an integer between -600 and 600 (by default), with higher return
  values resulting in a higher priority.Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read our guide to writing expressions for more info. Examples:Return the priority within an event directly: event.data.priority (where
  event.data.priority is an int within your account's range)Prioritize by a string field: event.data.plan == 'enterprise' ? 180 : 0

> **Callout:** Return values outside of your account's range (by default, -600 to 600) will automatically be clipped
> to your max bounds.An invalid expression will evaluate to 0, as in "no priority".