---
alwaysApply: true
---

# No Option Bridge

Turning an `Option` back into an absent marker is banned (oxlint `superstarter/no-option-bridge`). That covers `Option.getOrUndefined`, `Option.getOrNull`, and `Option.getOrElse` whose thunk returns `undefined`, `null`, `-1` or `NaN`, data-first or in a pipe. The rule follows the file's own import of Effect's `Option`, under any alias.

## Why

An Option already says "maybe absent" in the type. Bridging it back to `undefined`, `null`, `-1` or `NaN` allocates an Option only to throw it away. Worse, it reintroduces the marker every reader must remember to check. The check then moves from the type, where the compiler enforces it, to a convention, where it gets forgotten.

## Fix patterns

- **Keep the Option to its consumer.** Pass `Option<A>` on and read it with `Option.match`, `Option.map`, `Option.flatMap`, `Option.exists` or `Option.isSome`.
- **Make the absent case a variant.** When absence means something in the domain, give it its own arm in a discriminated union instead of a marker.
- **On a hot path, use native code that needs neither.** For example, `text.charCodeAt(i)` inside a loop bounded by `i < text.length` is total. It needs no Option and no `NaN`.

`""` and `0` stay legal defaults where they really are the value for the absent case (an empty label, a zero count). Don't use them to smuggle a marker back in.
