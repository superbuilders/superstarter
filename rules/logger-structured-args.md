---
globs: *.ts
alwaysApply: false
---
### Logger Structured Arguments

Logger method calls must follow the structured logging interface:
- At most 2 arguments: message and optional context object
- First argument must be a simple double-quoted string literal (not template literal, variable, or expression)
- Second argument (if present) must be a non-empty context object

**Incorrect:**
```typescript
logger.info(`User ${userId} logged in`)  // template literal
logger.info("event", "extra", "args")     // too many args
logger.info(message)                       // variable instead of string
logger.info("event", {})                   // empty context object
```

**Correct:**
```typescript
logger.info("user logged in", { userId })
logger.error("operation failed", { error: result.error })
```

See also: [Structured Logging](structured-logging.md)
