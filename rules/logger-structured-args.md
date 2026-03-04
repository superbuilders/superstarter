---
globs: *.ts
alwaysApply: false
---
### Logger Structured Arguments

Logger method calls must follow the Pino object-first structured logging convention:
- At most 2 arguments: optional context object and message string
- Message argument must be a simple double-quoted string literal (not template literal, variable, or expression)
- Context object (if present) must be the first argument and non-empty

**Incorrect:**
```typescript
logger.info(`User ${userId} logged in`)           // template literal
logger.info("event", "extra", "args")              // too many args
logger.info(message)                                // variable instead of string
logger.info({}, "event")                            // empty context object
logger.info("user logged in", { userId })           // wrong order (string first)
logger.info({ userId }, someVariable)               // second arg not a string literal
```

**Correct:**
```typescript
logger.info("user logged in")
logger.info({ userId }, "user logged in")
logger.error({ error: result.error }, "operation failed")
```

See also: [Structured Logging](structured-logging.md)
