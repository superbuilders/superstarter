---
globs: *.ts
alwaysApply: false
---

# Type Safety

No `any`, explicit or implicit (`strict`; oxlint `typescript/no-explicit-any` and the `no-unsafe-*` family). No `@ts-ignore`, `@ts-expect-error` or compiler flag that silences a diagnostic: fix the cause. No `as` casts except `as const` ([no-as-type-assertion.md](no-as-type-assertion.md)).

Data from outside is decoded with a Schema, never asserted ([effect-schema.md](effect-schema.md)). A library's complex types are imported and used, never re-declared.

## The compiler is at full strictness

The root `tsconfig.json`, which every package extends, turns on `strict`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` and `noImplicitReturns`. It also sets every `@effect/tsgo` diagnostic to `error`, with one exception: `unstableApiUsage` is off. These diagnostics shape everyday code:

- **`strictBooleanExpressions`:** a condition is a `boolean`. Compare explicitly (`rows.length === 0`, `value !== undefined`) instead of relying on truthiness.
- **`anyUnknownInErrorContext`:** no `any` or `unknown` in an Effect's error or requirements channel.
- **`globalDate`, `globalRandom`, `globalTimers`, `globalFetch`, `globalConsole`, `processEnv`, `nodeBuiltinImport`:** use `DateTime` and `Clock`, `Random`, `Effect.sleep`, Effect's `HttpClient`, `Effect.log*`, `Config`, and the Effect platform modules.
- **`preferEffectArray`, `preferEffectRecord`, `preferEffectString`:** use `Array.map(rows, f)` from `"effect"`, not `rows.map(f)`.
- **`missingPipeableSignature`:** write an exported function with two or more fixed parameters with `Function.dual`, so it also pipes.
- **`lazyEffect`:** export an Effect value, not a zero-argument function that returns one.
- **`asyncFunction`:** no `async`, server actions included; `effectAction` builds them.

## Narrowing

Narrow with a closed `kind` union and a `switch`, a `_tag` check, `Schema.is`, `Option`, or a `Predicate`. Absence is an optional key or an `Option`, never a sentinel value.
