---
globs: *.ts
alwaysApply: false
---
### No IIFE (Immediately Invoked Function Expressions)

IIFEs are disallowed. Define a named function and call it, or restructure control flow without IIFEs.

**Incorrect:**
```typescript
const result = (() => {
	// complex logic
	return value
})()

await (async () => {
	// async logic
})()
```

**Correct:**
```typescript
function computeResult() {
	// complex logic
	return value
}
const result = computeResult()

async function performAsyncWork() {
	// async logic
}
await performAsyncWork()
```

For modules, prefer top-level await over async IIFEs.
