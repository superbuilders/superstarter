---
globs: *.ts
alwaysApply: false
---

# No `as` Type Assertions

The `as` keyword is banned for type assertions (oxlint `superstarter/no-as-type-assertion`, for `x as T` and `<T>x` alike). It tells the compiler to stop checking, and the bug it hides surfaces later, somewhere else.

**Allowed:**

- `as const`
- An assertion to a browser or DOM type (`as HTMLElement`, `as MouseEvent`)
- `import { x as y }` renames, which are not assertions

**Instead of `as`:**

- **Outside data:** decode it with an Effect Schema ([effect-schema.md](effect-schema.md)).
- **A value you need to narrow:** use a type guard, a `kind` or `_tag` check, `Schema.is`, or a `Predicate`.
- **A literal that must match a type:** annotate the binding (`const READ_WRITE: PgTransactionConfig = { … }`) or write `satisfies`.
- **A value of a generic type:** declare the type parameter.

tsgo `unsafeEffectTypeAssertion` also refuses an assertion that narrows an Effect's error or requirements channel.

See [type-safety.md](type-safety.md).
