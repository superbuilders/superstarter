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
