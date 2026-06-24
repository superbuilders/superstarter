---
globs: *.ts
alwaysApply: false
---
### Require Logger Before Throw

Every `throw` statement must be immediately preceded by a logger call (`logger.error`, `logger.warn`, `logger.info`, or `logger.debug`).

**Pattern:**
```typescript
import { logger } from "@/logger"
import * as errors from "@superbuilders/errors"

// Always log before throwing
logger.error({ error: result.error }, "operation failed")
throw errors.wrap(result.error, "operation")
```

This ensures all errors are properly logged before propagation, creating an audit trail for debugging.

See also: [Error Handling](error-handling.md), [Structured Logging](structured-logging.md)
