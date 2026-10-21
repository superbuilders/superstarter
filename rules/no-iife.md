---
globs: *.ts
alwaysApply: false
---

# No IIFE

Immediately invoked function expressions are banned (oxlint `superstarter/no-iife`; tsgo `effectFnIife` for `Effect.fn`). Name the function and call it, or restructure the code so it needs no function.

```ts
// BAD
const result = (() => {
	// …
	return value
})()

await (async () => {
	// …
})()

// GOOD
const computeResult = () => {
	// …
	return value
}
const result = computeResult()
```

A script's work is an Effect value, run once at the end of the file:

```ts
const main = Effect.gen(function* () {
	// …
})

NodeRuntime.runMain(main)
```
