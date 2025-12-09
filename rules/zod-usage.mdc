---
globs: *.ts
alwaysApply: false
---
### Zod Usage

#### ⚠️ CRITICAL: Always Use safeParse

ALWAYS use `safeParse` instead of `parse` for Zod schemas. The `parse` method throws an error on validation failure. This can lead to unhandled exceptions if not caught with a `try/catch` block, which itself is discouraged by our rule to use `errors.try` for error handling. `safeParse` returns a result object (`{ success: true, data: ... }` or `{ success: false, error: ... }`), allowing for explicit and controlled error handling that aligns with our standard error propagation patterns.

**Rationale**

Using `safeParse` promotes robust error handling, prevents unhandled exceptions, and integrates cleanly with our `errors.try` and `errors.wrap` utilities. It makes error flows explicit rather than relying on exceptions for control flow.

**Example**

```typescript
import { z } from "zod"
import * as errors from "@superbuilders/errors"

const MySchema = z.object({
	name: z.string(),
	age: z.number()
})

// ❌ WRONG: Uses .parse() which throws.
// This forces a try/catch or risks an unhandled exception.
// Our guidelines state: "Never use regular try/catch blocks; always use errors.try instead".
// While errors.try could catch an error thrown by .parse(),
// it's cleaner to use .safeParse() and handle the result directly.
/*
let data;
const result = await errors.try(async () => { // Or errors.trySync for sync operations
  data = MySchema.parse(input) // This might throw
});
if (result.error) {
  // result.error would be a ZodError here if parsing failed
  throw errors.wrap(result.error, "Input validation failed via parse")
}
// process data
*/

// ✅ CORRECT: Uses .safeParse() and checks the result explicitly.
const validationResult = MySchema.safeParse(input) // input can be any unknown data

if (!validationResult.success) {
	// Handle validation error.
	// Propagate the error using errors.wrap, providing context.
	// validationResult.error is the ZodError object.
	throw errors.wrap(validationResult.error, "Input validation failed for MySchema")
}

// If execution reaches here, validationResult.success is true.
const data = validationResult.data // Safe to use data now
// ... process data