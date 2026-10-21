---
alwaysApply: true
---

# No Relative Imports

Every import inside a package goes through that package's `#` subpath imports, naming the file with its real extension. `./` and `../` are banned (oxlint `no-restricted-imports`; tsc refuses an import without its extension, because no file matches it).

Each package's `package.json` maps its prefixes. The app's:

```json
"imports": {
	"#*": "./src/*"
}
```

The root maps `"#scripts/*": "./scripts/*"` for the tooling.

```ts
// GOOD
import { readTodos } from "#server/todos/todos.ts"
import { Button } from "#ui/button.tsx"
import { violationAt } from "#scripts/dev/lint/violation.ts"

// BAD
import { TodoList } from "./todo-list"
import { TodoId } from "../../lib/todos"
```

Same-directory imports follow the rule too: write `#app/todo-list.tsx`, not `./todo-list.tsx`.

## Across packages

Another workspace package is imported by name, through its `exports`, without an extension, the way edullm does it. Each package exports its raw TypeScript; nothing is built.

```ts
import { TodoId } from "@superstarter/todo-protocol/todos"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
```

## Why

- **One spelling per module.** A path names where the module lives, not where it sits relative to the importer, so a grep for `@superstarter/database/postgres/pool` finds every importer outside the package, and `#postgres/pool.ts` every one inside.
- **Real files.** Node runs the `.ts` files directly and resolves `#` imports natively, so the extension is part of the path and no bundler or loader rewrites it.

Packages are imported by name. Effect is imported from its barrel, `import { Effect, Schema } from "effect"`, never from `effect/Effect` (tsgo `preferBarrelImport`).
