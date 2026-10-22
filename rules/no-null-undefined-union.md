---
alwaysApply: true
---

# No Null-Undefined Union

A type never includes both `null` and `undefined`. Pick one. Superlint `no-null-undefined-union` checks function parameters, function return types, and property signatures of interfaces, type literals and classes. It does not check local variables.

## Why

`string | null | undefined` has three states, and every reader must handle all three:

```ts
// BAD: what does null mean that undefined does not?
type Profile = { email: string | null | undefined }

// every caller now writes
if (profile.email !== null && profile.email !== undefined) { … }
```

## Inside: undefined or Option

Inside the codebase, absence is an optional key, `T | undefined`, or an `Option<T>`:

```ts
// GOOD
type Profile = Readonly<{ email?: string }>

type RowProps = Readonly<{
	row: Row
	onRemove?: (todo: Todo) => void
}>

const parseInstant = (text: string): Option.Option<DateTime.Utc> => { … }
```

`null` appears only where an outside system speaks it.

## At the boundary: the Schema converts

An outside system that sends `null` is converted by the Schema that admits its data ([effect-schema.md](effect-schema.md)):

```ts
// The API sends { email: "a@b.c" } or { email: null }
const Profile = Schema.Struct({ email: Schema.OptionFromNullOr(Schema.String) })
// Type: { readonly email: Option<string> }

// The API sends the key or omits it
const Profile = Schema.Struct({ email: Schema.optionalKey(Schema.String) })
// Type: { readonly email?: string }

// The API does both: collapse them into one Option
const Profile = Schema.Struct({ email: Schema.OptionFromOptionalNullOr(Schema.String) })
```

Writing to an API that requires `null` runs the other direction through the same Schema: `Schema.encodeEffect(Profile)` turns `Option.none()` into `null`.

Columns are `NOT NULL` unless absence is a real state of the row. Often a missing fact is better modelled as a separate row.

## Fix the whole chain

A type at a boundary flows through every reader. When you change one, trace the value from where it enters to every place it is used, and change them all in the same edit. A fix at one point leaves type errors, or worse a silent `?? fallback`, everywhere else.

1. Read the file with the violation.
2. Find where the type comes from: the Schema, the table, the API.
3. Grep for every use of the field.
4. Change the source to one absence representation, then update each reader.

See [no-nullish-coalescing.md](no-nullish-coalescing.md).
