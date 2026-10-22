---
globs: *.ts
alwaysApply: false
---

# Effect Schema at Boundaries

Every value from outside the process is admitted once, by an Effect Schema, where it enters: a server action's argument, an environment variable, a database row, a provider's JSON, a script's argv. Past that point its type says what was proven, and nothing checks it again.

Zod, AJV and hand-written validators are banned. oxlint `no-restricted-imports` refuses `zod` imports.

## The Schema is the type

A Schema and its type share one name, and the type is derived from the Schema, never written beside it.

```ts
import { Schema } from "effect"

/** The title column's length, shared by the column and the admission Schema. */
export const TODO_TITLE_MAX_LENGTH = 256

/** A title as a person typed it: trimmed, never empty, at most the column's length. */
export const TodoTitle = Schema.String.check(
	Schema.isTrimmed(),
	Schema.isMinLength(1),
	Schema.isMaxLength(TODO_TITLE_MAX_LENGTH)
).pipe(Schema.brand("TodoTitle"))
export type TodoTitle = typeof TodoTitle.Type
```

Write `typeof X.Type`, not `Schema.Schema.Type<typeof X>` (tsgo `preferSchemaTypeProperty`).

## Brands

Brand a value that has passed a check its base type cannot express: an id's format, a trimmed title, an ARN. A function that takes a `TodoId` cannot receive an unchecked string, because the only ways to get one are to decode it or to read a column typed `$type<TodoId>()`.

```ts
/** A todo's id is a server-minted UUIDv7, so its first 48 bits are the row's creation time. */
export const TodoId = Schema.String.check(Schema.isUUID(7)).pipe(Schema.brand("TodoId"))
export type TodoId = typeof TodoId.Type
```

## Decode once, at the edge

- A typed input: `Schema.decodeEffect(X)`. A server action's payload is decoded by `effectAction` from its contract.
- An `unknown` input, such as `process.argv`: `Schema.decodeUnknownEffect(X)`.
- JSON text: `Schema.fromJsonString(X)`. `JSON.parse` and `JSON.stringify` are refused (tsgo `preferSchemaOverJson`).
- A guard in a client component before a value is sent: `Schema.is(X)`.

A decode is an Effect, so its `SchemaError` is a typed failure. Synchronous `decode*Sync` calls are refused (tsgo `schemaSync`).

```ts
const decodeTitle = Schema.decodeEffect(TodoTitle)

// SchemaError joins the error channel.
const work = decodeTitle(title).pipe(Effect.flatMap(insertTodo))
```

Past the edge, functions take the branded type (`insertTodo(title: TodoTitle)`) and never validate again.

Our own SQL decodes once as well. A row that does not decode is a defect, never a state with its own branch:

```ts
const decodeTodos = Schema.decodeEffect(Schema.Array(Todo))

const listTodos = (scope: PostgresQueryScope) =>
	scope
		.runPrepared(listTodosStatement, {})
		.pipe(Effect.flatMap((rows) => decodeTodos(rows).pipe(Effect.orDie)))
```

## Rows come from the table

A row's Schema is derived from its Drizzle table with `drizzle-orm/effect-schema`, passing the branded Schema for each column that has one. The column declares the same brand with `$type<TodoId>()`, so Drizzle's inferred types carry it too.

```ts
import { createSelectSchema } from "drizzle-orm/effect-schema"
import { coreTodos } from "@superstarter/database/schema/core/todos"
import { TodoId, TodoTitle } from "@superstarter/todo-protocol/todos"

/** One todo as the list renders it, derived from the table so its shape has one home. */
export const Todo = createSelectSchema(coreTodos, { id: TodoId, title: TodoTitle })
export type Todo = typeof Todo.Type
```

A constant that both sides need lives with the Schema, and the table reads it: `TODO_TITLE_MAX_LENGTH` sizes both the `varchar` and `TodoTitle`.

## Environment: `Config.schema`

Each package that reads environment declares every variable in its own `src/env.ts` as an Effect `Config` (the app, the infrastructure package; the database package reads none). Nothing else reads `process.env` (tsgo `processEnv`, oxlint `node/no-process-env`). A variable with a format gets a branded Schema. The Schema has one home, with the fact it checks, and every env module that reads the variable imports it:

```ts
// @superstarter/database/postgres/rds
export const RdsEndpoint = Schema.String.check(
	Schema.isPattern(new RegExp(`^[a-z0-9-]+\\.[a-z0-9]+\\.${AWS_REGION}\\.rds\\.amazonaws\\.com$`))
).pipe(Schema.brand("RdsEndpoint"))
export type RdsEndpoint = typeof RdsEndpoint.Type

// the app's src/env.ts
/** The RDS endpoint, no scheme and no port. */
const databaseHost = Config.schema(RdsEndpoint, "DATABASE_HOST")
```

A variable a local process can do without carries its local value as its default, so `pnpm dev`, a local build and `pnpm test` need no env file. The default lives in the env module, never in a committed `.env`:

```ts
/** `superstarter` unless `pnpm test` names its throwaway `superstarter_test`. */
const localDatabase = Config.schema(LocalPostgresDatabase, "LOCAL_POSTGRES_DATABASE").pipe(
	Config.withDefault(LOCAL_POSTGRES_DATABASES.development)
)
```

A malformed value still fails; only an absent one takes the default.

Yield a Config inside an Effect (`yield* databaseHost`). A missing or malformed variable is a `ConfigError`; when it can only mean a broken deployment, `Effect.orDie` it. The browser never reads env: the server passes what a client component needs as a prop.

## Errors are Schemas

An expected failure is a `Schema.TaggedError` class whose fields are Schemas, so its payload is typed and closed. See [error-handling.md](error-handling.md).

## Shapes

- **Closed words:** `Schema.Literals(["read-write", "read-only"])`, not a `Union` of `Literal`s (tsgo `schemaUnionOfLiterals`).
- **Variants:** a `Schema.Union` of `Struct`s discriminated by `kind`, with kebab-case values:

  ```ts
  export const OperationalDeployment = Schema.Union([
  	Schema.Struct({ kind: Schema.Literal("local") }),
  	Schema.Struct({
  		kind: Schema.Literal("hosted"),
  		target: Schema.Literals(VERCEL_TARGETS),
  		id: Token,
  		commit: GitObjectId
  	})
  ])
  ```

- **An absent key:** `Schema.optionalKey(X)`. Under `exactOptionalPropertyTypes` the key is missing, never present as `undefined`.
- **An external `null`:** decode it to an `Option` (`Schema.OptionFromNullOr(X)`), so absence is a value inside rather than a sentinel. See [no-null-undefined-union.md](no-null-undefined-union.md).
- **Domain numbers:** `Schema.Int` or `Schema.Finite` with checks, not `Schema.Number` (tsgo `schemaNumber`).
- **`_tag` fields:** `Schema.TaggedStruct`, not a `Struct` with `_tag` (tsgo `schemaStructWithTag`).
- **Secrets:** keep them `Redacted` (`Config.Redacted`, `Redacted.make`), so no log or span prints them.
