# Middleware

Middleware allows your code to run at various points in an Inngest client's lifecycle, such as during a function's execution or when sending an event.

This can be used for a wide range of uses:

**Custom observability**: [Add custom logging, tracing or helpers to your Inngest Functions.]('/docs-markdown/features/middleware/create')

**Dependency Injection**: [Provide shared client instances (ex, OpenAI) to your Inngest Functions.]('/docs/features/middleware/dependency-injection')

**Encryption Middleware**: [End-to-end encryption for events, step output, and function output.]('/docs-markdown/features/middleware/encryption-middleware')

**Sentry Middleware**: [Quickly setup Sentry for your Inngest Functions.]('/docs/features/middleware/sentry-middleware')

## Middleware SDKs support

Middleware are available in the [TypeScript SDK](/docs/reference/middleware/typescript)  and [Python SDK](/docs-markdown/reference/python/middleware/lifecycle) .

Support in the Go SDK in planned.

## Middleware lifecycle

Middleware can be registered at the Inngest clients or functions level.

Adding middleware contributes to an overall "stack" of middleware. If you register multiple middlewares, the SDK will group and run hooks for each middleware in the following order:

1. Middleware registered on the **client**, in descending order
2. Middleware registered on the **function**, in descending order

For example:

```ts {{ title: "TypeScript" }}
const inngest = new Inngest({
  id: "my-app",
  middleware: [
    logMiddleware, // This is executed first
    errorMiddleware, // This is executed second
  ],
});

inngest.createFunction(
  {
    id: "example",
    middleware: [
      dbSetupMiddleware, // This is executed third
      datadogMiddleware, // This is executed fourth
    ],
  },
  { event: "test" },
  async () => {
    // ...
  }
);
```

```py {{ title: "Python" }}
inngest_client = inngest.Inngest(
    app_id="my_app",
    middleware=[
        LogMiddleware, # This is executed first
        ErrorMiddleware # This is executed second
    ],
)

# ...

@inngest_client.create_function(
    fn_id="import-product-images",
    trigger=inngest.TriggerEvent(event="shop/product.imported"),
    middleware=[
        DbSetupMiddleware, # This is executed third
        DatadogMiddleware # This is executed fourth
    ],
)
async def fn(ctx: inngest.Context):
    # ...

```

Learn more about the Middleware hooks and their execution order in ["Creating a Middleware"](/docs-markdown/features/middleware/create).