---
globs: *.ts
alwaysApply: false
---
### Structured Logging

All logging MUST use Pino via the central logger instance. Pino uses object-first structured logging with automatic error serialization and JSON output in production.

#### Import Pattern

```typescript
import { logger } from "@/logger"
```

#### Calling Convention (Object-First)

Pino uses object-first argument order:

```typescript
// Message only
logger.info("starting server")

// Context object + message
logger.info({ port: 3000 }, "server listening")
logger.error({ error: result.error }, "operation failed")
logger.debug({ userId, action: "login" }, "user authenticated")
```

#### ⚠️ CRITICAL: Inngest Functions Exception

**For Inngest functions, use the `logger` parameter instead of importing the central logger.** Inngest provides its own logger middleware that handles serverless-specific logging issues like incomplete log flushing and duplicated log deliveries.

```typescript
// ✅ CORRECT: In Inngest functions, use the logger parameter
inngest.createFunction(
	{ id: "my-function" },
	{ event: "app/some.event" },
	async ({ event, logger }) => {
		logger.info({ eventId: event.id }, "starting function")
	}
)

// ❌ WRONG: Don't import the central logger in Inngest functions
import { logger } from "@/logger"
inngest.createFunction(
	{ id: "my-function" },
	{ event: "app/some.event" },
	async ({ event }) => {
		logger.info({ eventId: event.id }, "starting function")
	}
)
```

**Why this exception exists:**
- Serverless functions can terminate before logs are flushed
- Inngest's memoization can cause log statements outside steps to run multiple times
- Inngest v4 natively supports Pino — it auto-detects `.child()` and `.flush()`

**Outside of Inngest functions** (utility functions, database operations, etc.), use `import { logger } from "@/logger"`.

#### ⚠️ CRITICAL: Logging AND Error Handling Together

Always use BOTH logging and error handling patterns together:

```typescript
// ✅ CORRECT: Log errors for observability AND throw for proper propagation
const result = await errors.try(someOperation())
if (result.error) {
	logger.error({ error: result.error }, "operation failed")
	throw errors.wrap(result.error, "operation failed")
}

// ❌ WRONG: Silent error handling without logging loses observability
const result = await errors.try(someOperation())
if (result.error) {
	throw errors.wrap(result.error, "operation failed")
}
```

#### Pino Error Serialization

Pino uses `pino.stdSerializers.err` to serialize error objects. Pass errors in the context object under the `error` key:

```typescript
// ✅ CORRECT: Pino serializes the error automatically
logger.error({ error: result.error }, "operation failed")

// ❌ WRONG: Manual toString() calls
logger.error({ error: someError.toString() }, "operation failed")

// ❌ WRONG: Manual cause extraction — Pino handles the error chain
logger.error({
	error: result.error,
	cause: result.error.cause
}, "operation failed")
```

#### Our Logging Philosophy: Log Everything

When in doubt, add a log statement. This is especially true for the `debug` level.

**Always Log (Info Level):**
- Function entry/exit for major operations and workflows
- Significant state changes (e.g., job status updated to `COMPLETED`)
- High-level summaries of completed work (e.g., "processed 50 articles")

**Always Log (Debug Level):**
- Detailed inputs and outputs for every function or method
- The exact content of API requests and raw API responses
- The full prompts sent to AI models
- Intermediate data transformations and validation results
- Configuration values being used in a function
- Every branch in control-flow logic (e.g., if/else statements)

#### Terse Messages with Structured Context

Follow terse, structured logging patterns:

**1. Terse Messages**
- Use short, action-oriented verbs: `"starting"`, `"processing"`, `"inserted"`, `"completed"`, `"validating"`
- Keep messages concise and scannable

**2. Key-Value Context**
- Move all contextual data to the context object (first argument)
- Use structured data instead of string interpolation

```typescript
// ✅ CORRECT: Terse message with structured context
logger.info({ file: outfile, batchSize: 1000 }, "starting zim import")
logger.debug({ validationIssues: result.issues }, "validating lyrics")
logger.error({ schema: name, error: err }, "failed to drop schema")

// ❌ WRONG: Verbose messages with embedded data
logger.info(`Starting ZIM import for ${outfile} with batch size ${1000}`)
logger.error(`Error dropping schema ${name}: ${err}`)
```

#### Consistent Attribute Names

Use standardized camelCase attribute names:

- **`count`** - for quantities, batch sizes, totals
- **`file`** - for file paths and filenames
- **`articleId`** - for article references
- **`error`** - for error objects (serialized by Pino)
- **`userId`** - for user references
- **`status`** - for HTTP status codes or operation states

#### Log Levels

- **`logger.info()`** - Major operations, user-facing progress, completion status
- **`logger.debug()`** - **THE DEFAULT FOR DEVELOPMENT.** Detailed internal operations, data structures, API payloads, prompts, validation steps
- **`logger.error()`** - Failures with error context (use before throwing errors for observability)
- **`logger.warn()`** - Recoverable issues, unexpected but non-fatal conditions

#### Prohibited Patterns

**NEVER use:**
- `console.log`, `console.error`, `console.debug`, `console.warn`
- String interpolation in log messages
- Verbose, explanatory messages
- Silent error handling without logging (always log errors for observability)
- **Manual `.toString()` calls on objects** (Pino serializes automatically)
- **String-first argument order** (`logger.info("msg", { ctx })` — use object-first)
