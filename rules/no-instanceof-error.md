# No Instanceof Error

`instanceof Error` checks are banned. Use `errors.is()` for sentinel error checking instead. This is enforced by GritQL rule `no-instanceof-error`.

## Why

1. **Redundant check** - Biome's `useThrowOnlyError` guarantees all thrown values are Error objects, making `instanceof Error` always true
2. **Wrong tool for sentinels** - `instanceof` checks class identity, but our error pattern uses value-based sentinels created with `errors.new()`
3. **No type narrowing** - `instanceof` doesn't narrow to your specific error type; `errors.is()` does
4. **Consistent patterns** - All error checking uses the same `@superbuilders/errors` library

## The Rule

```typescript
// BAD: instanceof Error is always true (useThrowOnlyError guarantees it)
if (err instanceof Error) {
  console.log(err.message)
}

// BAD: instanceof with custom error classes
if (err instanceof UserNotFoundError) {
  // handle
}
```

```typescript
// GOOD: Access .message directly - err is guaranteed to be Error
console.log(err.message)

// GOOD: Check sentinel errors with errors.is()
if (errors.is(err, ErrUserNotFound)) {
  // handle - with type narrowing!
}
```

## Common Patterns

### Removing Redundant Guards

```typescript
// BAD: Guard is unnecessary
const result = errors.trySync(() => riskyOperation())
if (result.error) {
  if (result.error instanceof Error) {
    logger.error("operation failed", { error: result.error })
  }
  throw result.error
}

// GOOD: result.error is always Error
const result = errors.trySync(() => riskyOperation())
if (result.error) {
  logger.error("operation failed", { error: result.error })
  throw result.error
}
```

### Switching to Sentinel Checking

```typescript
// BAD: Class-based error checking
if (err instanceof NotFoundError) {
  return null
}
if (err instanceof PermissionError) {
  redirect("/login")
}

// GOOD: Sentinel-based error checking
if (errors.is(err, ErrNotFound)) {
  return null
}
if (errors.is(err, ErrPermissionDenied)) {
  redirect("/login")
}
```

## See Also

- [No Extends Error](no-extends-error.md) - Ban extending Error class
- [Error Handling](error-handling.md) - Complete error handling patterns
