# Managing concurrency

Limit the number of concurrently running steps for your function with the [`concurrency`](/docs-markdown/reference/functions/create#configuration) configuration options. Setting an optional `key` parameter limits the concurrency for each unique value of the expression.

> **Callout:** Important: Concurrency limits step execution, not the total number of function runs. Functions that are sleeping, waiting for events, or paused between steps do not count against your concurrency limit. This means you may have many more function runs in progress than your concurrency limit. Learn more about how concurrency works →

[Read our concurrency guide for more information on concurrency, including how it works and any limits](/docs-markdown/guides/concurrency).

```ts {{ title: "Simple" }}
export default inngest.createFunction(
  {
    id: "sync-contacts",
    concurrency: {
      limit: 10,
    },
  }
  // ...
);
```

```ts {{ title: "Multiple keys" }}
inngest.createFunction(
  {
    id: "unique-function-id",
    concurrency: [
      {
         // Use an account-level concurrency limit for this function, using the
         // "openai" key as a virtual queue.  Any other function which
         // runs using the same "openai"` key counts towards this limit.
         scope: "account",
         key: `"openai"`,
         // If there are 10 steps executing with the "openai" key, this function's
         // runs will wait for capacity before executing.
         limit: 10,
      },
      {
         // Create another virtual concurrency queue for this function only.  This
         // limits all accounts to a single executing step for this function, based off
         // of the `event.data.account_id` field.
         // "fn" is the default scope, so we could omit this field.
         scope: "fn",
         key: "event.data.account_id",
         limit: 1,
      },
    ],
  }
  { event: "ai/summary.requested" },
  async ({ event, step }) => {
  }
);
```

Setting `concurrency` limits are very useful for:

- Handling API rate limits - Limit concurrency to stay within the rate limit quotas that are allowed by a given third party API.
- Limiting database operations or connections
- Preventing one of your user's accounts from consuming too many resources (see `key`)

Alternatively, if you want to limit the number of times that your function runs in a given period, [the `rateLimit` option](/docs-markdown/reference/functions/rate-limit) may be better for your use case.

## Configuration

- `concurrency` (number | object | \[object, object]): Options to configure concurrency. Specifying a number is a shorthand to set the limit property.The maximum number of concurrently running steps.
  A value of 0 or undefined is the equivalent of not setting a limit.
  The maximum value is dictated by your account's plan.The scope for the concurrency limit, which impacts whether concurrency is managed on an individual function, across an environment, or across your entire account.fn (default):  only the runs of this function affects the concurrency limitenv:  all runs within the same environment that share the same evaluated key value will affect the concurrency limit.  This requires setting a key which evaluates to a virtual queue name.account:  every run that shares the same evaluated key value will affect the concurrency limit, across every environment.  This requires setting a key which evaluates to a virtual queue name.An expression which evaluates to a string given the triggering event.  The string returned from the expression is used as the concurrency queue name.  A key is required when setting an env or account level scope.Expressions are defined using the Common Expression Language (CEL) with the original event accessible using dot-notation. Read our guide to writing expressions for more info. Examples:Limit concurrency to n (via limit) per customer id: 'event.data.customer\_id'Limit concurrency to n per user, per import id: 'event.data.user\_id + "-" + event.data.import\_id'Limit globally using a specific string: '"global-quoted-key"' (wrapped in quotes, as the expression is evaluated as a language)

> **Callout:** Step-level concurrency: The concurrency option controls the number of concurrent steps that can be running at any one time, not the number of function runs.Because function runs frequently pause (for sleeps, waiting for events, or between steps), it's common to have many more function runs in progress than your concurrency limit. However, only the configured number of steps will ever be actively executing at once.For example, with concurrency: 10, you might have 500 function runs in progress, but only 10 steps are executing code at any given moment.