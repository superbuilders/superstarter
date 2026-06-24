---
globs: *.ts
alwaysApply: false
---

### JSON Schema + AJV Usage

Zod is banned in first-party code. Author JSON Schema Draft 7 directly through `@superbuilders/validate`, infer TypeScript types from the schema artifact, and validate with AJV.

#### Source Of Truth

The JSON Schema Draft 7 object is the source of truth. `@superbuilders/validate` is deliberately Draft 7-only because the AI SDK structured-output boundary consumes `draft-07` schemas.

```typescript
import * as validate from "@superbuilders/validate"

const ExampleSchema = validate.compile({
	type: "object",
	additionalProperties: false,
	required: ["kind", "value"],
	properties: {
		kind: { const: "example" },
		value: { type: "string", minLength: 1 }
	}
} as const)

type Example = validate.Infer<typeof ExampleSchema>
```

Compiled validators implement both Standard Schema and Standard JSON Schema. Standard JSON Schema conversion only supports `target: "draft-07"`; other targets must throw rather than silently convert.

Do not define a parallel hand-written type unless there is a concrete boundary reason. If a type is hand-written during migration, the schema must still be the runtime authority.

Default helpers must derive their output type from the schema:

```typescript
const result = ExampleSchema.parse(input)
```

Do not pass explicit generics to `validate.compile`. If TypeScript cannot derive a useful type because the schema is runtime-dynamic or recursive, the result remains broad and callers must do explicit domain construction after validation. Do not add library escape hatches.

```typescript
const RuntimeSchema = validate.compile(buildRuntimeSchema())
const result = RuntimeSchema.parse(input)
```

Recursive schemas should use Draft 7 `$ref` / `definitions` for runtime validation and explicit TypeScript domain types for static typing. `json-schema-to-ts` does not infer recursive schemas, so recursive boundaries should expose a named parse function returning the explicit domain type.

Use `anyOf` for non-null union types instead of `type: ["string", "number"]`. AJV strict mode rejects non-null unions via `allowUnionTypes: false`. Nullable schemas such as `type: ["string", "null"]` are permitted.

String `pattern` schemas should use literal pattern strings. `@superbuilders/validate` refines literal patterns with `arkregex`, so a schema like `{ type: "string", pattern: "^post_[0-9]+$" }` infers `` `post_${number}` `` instead of plain `string`. JSON Schema patterns are not implicitly anchored; use `^` and `$` for full-string validation.

Do not use private schema extraction APIs. If one schema nests another, define the child as a raw `Draft07JsonSchema` constant and compile it separately:

```typescript
const ChildDraft07Schema = {
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: { id: { type: "string" } }
} as const satisfies validate.Draft07JsonSchema

const ChildSchema = validate.compile(ChildDraft07Schema)

const ParentSchema = validate.compile({
	type: "object",
	additionalProperties: false,
	required: ["child"],
	properties: { child: ChildDraft07Schema }
} as const)
```

#### Object Key Order

Provider-facing JSON Schema Draft 7 is prompt material. Key order is reliability-sensitive for LLM structured output.

For every object schema, use this order:

```typescript
{
	type: "object",
	additionalProperties: false,
	required: ["id"],
	properties: {
		id: { type: "string" }
	}
}
```

Rules:

- Put `additionalProperties` before `required` and `properties`.
- Put `required` before `properties`.
- Do not omit `additionalProperties`. Prefer `false`; use `true` only for intentional external/open-object boundaries that project a subset of upstream data.
- Model-facing and internal contract object schemas must use `additionalProperties: false`.
- Flatten model-facing schemas when grouping is not buying real clarity.

#### Discriminated Unions

Use `oneOf` branches with `const` discriminants. Do not use Zod-style discriminated unions or provider-specific discriminator features by default.

```typescript
const IntentSchema = validate.compile({
	oneOf: [
		{
			type: "object",
			additionalProperties: false,
			required: ["kind"],
			properties: {
				kind: { const: "observation" }
			}
		},
		{
			type: "object",
			additionalProperties: false,
			required: ["kind", "submission"],
			properties: {
				kind: { const: "interaction" },
				submission: SubmissionSchema
			}
		}
	]
} as const)
```

The discriminator key must be required in every branch. Branch object schemas must be closed with `additionalProperties: false`.

The discriminator key must be first in both `required` and `properties`. This improves LLM structured-output reliability.

Use direct inline branches for model-facing unions when feasible. Do not build provider-facing `oneOf` branches with `.map(...)`; generated branch arrays hide discriminator shape from review and lints.

#### AI SDK

AI outputs must always be locally validated with AJV. Never pass a bare AI SDK `jsonSchema<T>(schema)`.

Use `validate.compile(...)` as the schema artifact passed to `Output.object(...)`. The AI SDK consumes it through Standard Schema plus Standard JSON Schema with `target: "draft-07"`. Do not introduce AI-specific validation helpers.

#### T3 Env

T3 Env must use Standard Schema validators backed by AJV. Do not use Zod presets or Zod env schemas.

#### No Zod

These are banned everywhere in first-party code:

- `import { z } from "zod"`
- `import type { z } from "zod"`
- `z.infer`
- `.safeParse` as a Zod validation path
- `z.toJSONSchema`

Transitive dependency internals may use Zod; our code must not import or depend on it.
