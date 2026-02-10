---
alwaysApply: true
---

# No Extends Error

Extending `Error` is banned. Use the `errors.new()` sentinel pattern instead. This is enforced by `super-lint.ts` rule `no-extends-error`.

## Why

1. **Simpler error handling** - Sentinel errors work with `errors.is()` for type-safe checking
2. **No class overhead** - Error constants are just values, not class hierarchies
3. **Better composition** - `errors.wrap()` adds context without subclassing
4. **Consistent patterns** - All errors use the same `@superbuilders/errors` library
5. **Go-style errors** - Terse, value-based errors following Go conventions

## The Rule

```typescript
// BAD: Custom error class
class UserNotFoundError extends Error {
  override readonly name = "UserNotFoundError"
  constructor(userId: string) {
    super(`User not found: ${userId}`)
  }
}

// BAD: Throwing custom error class
throw new UserNotFoundError(userId)

// BAD: Checking with instanceof
if (err instanceof UserNotFoundError) {
  // handle
}
```

```typescript
// GOOD: Error sentinel constant
import * as errors from "@superbuilders/errors"

export const ErrUserNotFound = errors.new("user not found")

// GOOD: Throwing with context
throw errors.wrap(ErrUserNotFound, `user id '${userId}'`)

// GOOD: Checking with errors.is()
if (errors.is(err, ErrUserNotFound)) {
  // handle - with type narrowing!
}
```

## The Sentinel Pattern

Define error constants as module-level exports using `errors.new()`:

```typescript
// errors.ts or at top of relevant module
import * as errors from "@superbuilders/errors"

export const ErrNotFound = errors.new("not found")
export const ErrPermissionDenied = errors.new("permission denied")
export const ErrInvalidInput = errors.new("invalid input")
export const ErrTimeout = errors.new("timeout")
```

## Converting Error Classes to Sentinels

### Before: Error Class

```typescript
class StaleTokenError extends Error {
  override readonly name = "StaleTokenError"
  constructor(message = "Constraint has been modified, re-authenticate") {
    super(message)
  }
}

class ScopeNotFoundError extends Error {
  override readonly name = "ScopeNotFoundError"
  constructor(scopeRef: string) {
    super(`Scope not found: ${scopeRef}`)
  }
}

// Usage
throw new StaleTokenError()
throw new ScopeNotFoundError(scopeRef)

// Checking
if (err instanceof StaleTokenError) { /* ... */ }
```

### After: Error Sentinels

```typescript
import * as errors from "@superbuilders/errors"

export const ErrStaleToken = errors.new("constraint modified, re-authenticate")
export const ErrScopeNotFound = errors.new("scope not found")

// Usage - context via errors.wrap()
throw ErrStaleToken
throw errors.wrap(ErrScopeNotFound, `scope ref '${scopeRef}'`)

// Checking - with type narrowing
if (errors.is(err, ErrStaleToken)) { /* ... */ }
if (errors.is(err, ErrScopeNotFound)) { /* ... */ }
```

## Adding Context to Errors

Use `errors.wrap()` to add contextual information while preserving error identity:

```typescript
const ErrDatabaseConnection = errors.new("database connection")

// Add context when throwing
throw errors.wrap(ErrDatabaseConnection, `host '${host}' port ${port}`)

// The error chain is preserved for errors.is() checks
if (errors.is(err, ErrDatabaseConnection)) {
  // This still matches even with wrapped context
}
```

## Multiple Error Types

Handle different error types with `errors.is()`:

```typescript
export const ErrArticleRedirect = errors.new("article is a redirect")
export const ErrArticleNotHtml = errors.new("article is not html")
export const ErrArticleCorrupted = errors.new("article data corrupted")

function processArticle(entry: Entry): Article {
  if (entry.isRedirect) {
    throw errors.wrap(ErrArticleRedirect, `path '${entry.path}'`)
  }
  if (!entry.mimetype?.startsWith("text/html")) {
    throw errors.wrap(ErrArticleNotHtml, `mimetype '${entry.mimetype}'`)
  }
  // ...
}

// Handling
const result = errors.trySync(() => processArticle(entry))
if (result.error) {
  if (errors.is(result.error, ErrArticleRedirect)) {
    // Handle redirect - skip silently
    return
  }
  if (errors.is(result.error, ErrArticleNotHtml)) {
    // Handle non-HTML - log and skip
    logger.warn("skipping non-html", { path: entry.path })
    return
  }
  // Unknown error - bubble up
  throw result.error
}
```

## Naming Conventions

Follow Go-style error naming:

```typescript
// Prefix with Err
export const ErrNotFound = errors.new("not found")
export const ErrPermissionDenied = errors.new("permission denied")

// Use lowercase, terse messages
export const ErrInvalidConfig = errors.new("invalid configuration")
export const ErrMissingField = errors.new("missing required field")

// Don't include "error" or "failed" in message
// BAD: errors.new("error: user not found")
// BAD: errors.new("failed to find user")
// GOOD: errors.new("user not found")
```

## See Also

- [Error Handling](mdc:rules/error-handling.md) - Complete error handling patterns
- [Structured Logging](mdc:rules/structured-logging.md) - Logging errors before throwing

## Summary

1. Never extend `Error` - use `errors.new()` to create sentinel constants
2. Add context with `errors.wrap()` instead of constructor parameters
3. Check error types with `errors.is()` instead of `instanceof`
4. Export error constants with `Err` prefix
5. Use terse, lowercase error messages
