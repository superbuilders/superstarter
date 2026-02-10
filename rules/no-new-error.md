---
globs: *.ts
alwaysApply: false
---
### No `new Error()`

Using `new Error()` directly is disallowed. Use `errors.new()` instead for consistent error handling integration.

**Incorrect:**
```typescript
throw new Error("something went wrong")
```

**Correct:**
```typescript
import * as errors from "@superbuilders/errors"

throw errors.new("something went wrong")
```

See also: [Error Handling](error-handling.md)
