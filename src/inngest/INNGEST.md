# Inngest Functions

## Creating New Functions

Always use the [scaffolding script](scripts:inngest/create-inngest-function.ts) to create new Inngest functions. Never create function files manually.

```sh
bun scripts/inngest/create-inngest-function.ts <function-id> \
  -e <event-name> [-e <event-name>...] \
  [-c <cron-expression>...] \
  [-p <path>] \
  [--force]
```

The script handles:

1. Scaffolding the function file with correct boilerplate
2. Registering the function in [the functions index](scripts:inngest/create-inngest-function.ts#FUNCTIONS_INDEX)
3. Stubbing missing event schemas in [the Inngest client index](scripts:inngest/create-inngest-function.ts#INNGEST_INDEX)

### Examples

Single event trigger:

```sh
bun scripts/inngest/create-inngest-function.ts process-enrollment \
  -e superstarter/process-enrollment
```

Multiple events with a cron schedule:

```sh
bun scripts/inngest/create-inngest-function.ts sync-users \
  -e superstarter/sync-users \
  -e superstarter/user-updated \
  -c "0 */6 * * *"
```

Nested under a subdirectory (`src/inngest/functions/ai/questions/`):

```sh
bun scripts/inngest/create-inngest-function.ts generate-questions \
  -e superstarter/generate-questions \
  -p ai/questions
```

### Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| `<function-id>` | yes | Kebab-case identifier for the function |
| `-e <event>` | at least one `-e` or `-c` | Event name (must contain `/`, kebab-case segments) |
| `-c <cron>` | at least one `-e` or `-c` | Cron expression for scheduled triggers |
| `-p <path>` | no | Subdirectory under `src/inngest/functions/` |
| `--force` | no | Skip confirmation prompts for missing event schemas |

## Event Schemas

Event schemas are defined in the `schema` object in `src/inngest/index.ts`. Each entry maps an event name to its Zod data shape **inline** — never extract the schema into a separate variable.

```typescript
const schema = {
	"superstarter/hello": z.object({
		message: z.string().min(1)
	}),
	"superstarter/process-enrollment": z.object({
		enrollmentId: z.string().uuid(),
		userId: z.string().uuid()
	})
}
```

### Rules

1. **Inline always** — the `z.object({...})` goes directly as the property value, not referenced from a `const`
2. **Event names** — `superstarter/<kebab-case-action>` format
3. **Data shapes** — define only the fields the function needs; use strict Zod types (no `.any()`, no `.passthrough()`)
