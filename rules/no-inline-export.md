---
alwaysApply: true
---

# No Inline Export

The `export` keyword must not be attached to declarations. Define everything without `export`, then use `export { }` statements at the end.

## Why

1. **Avoids wrapper indirection**: With `useExportsLast`, inline exports force awkward re-export wrappers
2. **Clear API surface**: All exports grouped at bottom = easy to scan public interface
3. **Consistent pattern**: One way to export, not two

## Correct Pattern

```typescript
// All declarations without export
function processData(input: string): Result {
	// ...
}

const DEFAULT_TIMEOUT = 5000

type Config = { apiKey: string }

class DataProcessor {
	// ...
}

// All exports at end
export { processData, DEFAULT_TIMEOUT, DataProcessor }
export type { Config }
export default processData
```

## Banned Patterns

```typescript
// ❌ BANNED - inline function export
export function processData() { }

// ❌ BANNED - inline const export
export const DEFAULT_TIMEOUT = 5000

// ❌ BANNED - inline type export
export type Config = { apiKey: string }

// ❌ BANNED - inline interface export
export interface UserConfig { }

// ❌ BANNED - inline class export
export class DataProcessor { }

// ❌ BANNED - inline default export
export default function() { }
```

## Allowed Patterns

```typescript
// ✅ Named export statements
export { foo, bar, baz }
export { foo as renamedFoo }

// ✅ Type export statements
export type { Config, UserRole }

// ✅ Default export of identifier
export default myFunction
```

## Also Banned (by noBarrelFile)

Re-exports are banned by Biome's `noBarrelFile` rule:

```typescript
// ❌ BANNED - re-exports
export { helper } from "./utils"
export type { HelperConfig } from "./utils"
export * from "./constants"
```

## Relationship with useExportsLast

This rule complements Biome's `useExportsLast`:
- **useExportsLast**: Exports must appear at end of file
- **no-inline-export**: Exports must use `export { }` syntax

Together they enforce: declarations first, `export { }` statements last.
