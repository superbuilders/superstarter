---
alwaysApply: true
---

# No Module State

A module holds no state that every request of the process shares. Superlint `no-module-state` refuses three things:

1. **A module-level `let` or `var`.** A reassignable binding at module level is state.
2. **A module-level constant that holds a mutable container.** The checker decides: a `Map`, `Set`, `WeakMap`, `WeakSet`, mutable array or mutable tuple is refused. A `ReadonlyMap`, `ReadonlySet`, `ReadonlyArray` or `as const` tuple is a value and stays legal.
3. **A write to the global object** (`globalThis.x = …`, `delete globalThis.x`, `Object.assign(globalThis, …)`), unless the same file declares that global in `declare global`.

## Why

A server process serves many requests at once (on Vercel, Fluid compute runs concurrent invocations in one instance), so module state leaks between them and survives a failed one. Next also evaluates a module once per chunk group, so a module-level value is not even one per process.

## One anchor

The application has exactly one process anchor: the web `ManagedRuntime`, declared in `declare global` and written in the one module that owns it. Everything that outlives one request (the PostgreSQL pool, the cold-start flag, the tracer's span map) is a service of that runtime's Layer, held in a `Ref` or owned by the service value. Every entry point runs its Effect through that runtime.

## Instead

```ts
// BAD: module state shared by every request
let requestCount = 0
const cache = new Map<string, Todo>()

// GOOD: a readonly constant is a value
const LIMITS: ReadonlyMap<string, number> = new Map([["max", 10]])

// GOOD: state in a Ref, owned by a Layer of the web runtime
export class RequestCounter extends Context.Service<RequestCounter, Ref.Ref<number>>()(
	"superstarter/metrics/RequestCounter"
) {}

export const RequestCounterLive = Layer.effect(RequestCounter, Ref.make(0))

export const countRequest = Effect.flatMap(RequestCounter, (counter) =>
	Ref.update(counter, (n) => n + 1)
)
```

State local to one function call (a `Map` built inside a function) is not module state.

See [effect-classes-only.md](effect-classes-only.md).
