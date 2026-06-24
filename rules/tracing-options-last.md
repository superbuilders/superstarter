# Tracing Options Last

Any parameter whose type is `tracing.Options` must be the final parameter.

Correct:

```typescript
async function loadCatalog(frontendId: string, subject: SubjectScope, opts: tracing.Options) {}

await tracing.span("load.catalog", async function load(span, opts) {}, opts)
```

Incorrect:

```typescript
async function loadCatalog(opts: tracing.Options, frontendId: string, subject: SubjectScope) {}

await tracing.span("load.catalog", async function load(opts, span) {}, opts)
```

This keeps the project-wide TypeScript convention consistent: domain arguments first, terminal runtime/config object last.
