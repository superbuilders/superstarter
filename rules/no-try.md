---
globs: *.ts
alwaysApply: false
---
### No Native `try/catch/finally`

Native `try` blocks are disallowed. Use explicit error handling and resource management patterns instead.

---

## Error Handling: `errors.try()` and `errors.trySync()`

For catching errors, use `errors.try()` (async) or `errors.trySync()` (sync).

### Async Error Handling

```typescript
import * as errors from "@superbuilders/errors"

// WRONG: Native try/catch
try {
  const data = await fetchData()
} catch (e) {
  console.error(e)
}

// CORRECT: errors.try()
const result = await errors.try(fetchData())
if (result.error) {
  logger.error("fetch failed", { error: result.error })
  throw errors.wrap(result.error, "fetchData")
}
const data = result.data
```

### Sync Error Handling

```typescript
import * as errors from "@superbuilders/errors"

// WRONG: Native try/catch
try {
  const parsed = JSON.parse(input)
} catch (e) {
  console.error(e)
}

// CORRECT: errors.trySync()
const result = errors.trySync(() => JSON.parse(input))
if (result.error) {
  logger.error("parse failed", { error: result.error })
  throw errors.wrap(result.error, "JSON.parse")
}
const parsed = result.data
```

### Key Requirements

- The `if (result.error)` block **MUST** be on the line immediately following `errors.try()` or `errors.trySync()`
- Always log errors before throwing
- Capture the result; never use `void` or `return` directly with `errors.try()`

---

## Cleanup: `DisposableStack` and `AsyncDisposableStack`

For cleanup logic (what you'd put in a `finally` block), use the Explicit Resource Management API.

### Async Cleanup

```typescript
// WRONG: Native try/finally
try {
  const conn = await openConnection()
  await doWork(conn)
} finally {
  await conn.close()
}

// CORRECT: AsyncDisposableStack with `await using`
await using stack = new AsyncDisposableStack()
const conn = await openConnection()
stack.defer(async () => await conn.close())
await doWork(conn)
// conn.close() runs automatically when scope exits, even on error
```

### Sync Cleanup

```typescript
// WRONG: Native try/finally
try {
  const file = openFileSync(path)
  processFile(file)
} finally {
  file.close()
}

// CORRECT: DisposableStack with `using`
using stack = new DisposableStack()
const file = openFileSync(path)
stack.defer(() => file.close())
processFile(file)
// file.close() runs automatically when scope exits, even on error
```

### Using Resources That Implement Disposable

If the resource already implements `Symbol.dispose` or `Symbol.asyncDispose`, use `stack.use()`:

```typescript
await using stack = new AsyncDisposableStack()
const reader = stack.use(stream.getReader())  // auto-disposed
await processStream(reader)
```

### DisposableStack Methods

- `stack.defer(fn)` — Register a cleanup callback to run on scope exit
- `stack.use(resource)` — Register a disposable resource (must have `[Symbol.dispose]` or `[Symbol.asyncDispose]`)
- `stack.adopt(value, onDispose)` — Register a value with a custom dispose function
- `stack.move()` — Transfer ownership to a new stack (prevents disposal in current scope)

---

## Combined: Error Handling + Cleanup

When you need both error handling and cleanup:

```typescript
// WRONG: Native try/catch/finally
try {
  const conn = await openConnection()
  const data = await fetchData(conn)
  return data
} catch (e) {
  console.error(e)
  throw e
} finally {
  await conn.close()
}

// CORRECT: Both patterns together
await using stack = new AsyncDisposableStack()
const conn = await openConnection()
stack.defer(async () => await conn.close())

const result = await errors.try(fetchData(conn))
if (result.error) {
  logger.error("fetch failed", { error: result.error })
  throw errors.wrap(result.error, "fetchData")
}
return result.data
// conn.close() runs automatically when function returns or throws
```

---

## Browser Compatibility

`DisposableStack` and `AsyncDisposableStack` are supported in:
- Chrome 134+
- Firefox 141+
- Node.js 24+
- Bun 1.3+
- Deno 2.2.10+

Safari does not yet support these APIs. If you need Safari support, use a polyfill from `core-js`.

---

See also: [Error Handling](error-handling.md)
