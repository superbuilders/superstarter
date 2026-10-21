---
globs: *.ts
alwaysApply: false
---

# No `try`

Native `try`, `catch` and `finally` are banned (oxlint `superstarter/no-try`; inside generators also tsgo `tryCatchInEffectGen`). A `catch` block widens every failure to `unknown` and hides which ones can happen. Effect keeps them in the type.

## Catching

| Native                              | Effect                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `try { await promise } catch`       | `Effect.tryPromise({ try: (signal) => …, catch: () => X.make({...}) })` |
| `try { call() } catch`              | `Effect.try({ try: () => call(), catch: () => X.make({...}) })`         |
| A synchronous helper outside Effect | `Result.try({ try: () => call(), catch: () => … })`                     |

The `catch` callback returns a tagged error ([error-handling.md](error-handling.md)), never `unknown` or `Error`.

```ts
// BAD
try {
	await client.connect()
} catch (error) {
	// which failures? the type says unknown
}

// GOOD
const connected = Effect.tryPromise({ try: () => client.connect(), catch: connectFailureOf })
```

## Cleanup

A `finally` becomes a scope. The release runs on success, failure and interruption.

- **One resource for one use:** `Effect.acquireUseRelease(acquire, use, release)`.
- **Resources held for a region:** `Effect.acquireRelease` or `Effect.addFinalizer`, closed by `Effect.scoped`.
- **An action after the work, whatever the outcome:** `Effect.ensuring` or `Effect.onExit`.

```ts
const response = yield* Effect.acquireUseRelease(
	Effect.sync(
		() =>
			new SecretsManagerClient({
				region: AWS_REGION,
				credentials: awsCredentialsProvider({ roleArn })
			})
	),
	(client) =>
		Effect.tryPromise({
			try: (signal) =>
				client.send(new GetSecretValueCommand({ SecretId: secretArn }), { abortSignal: signal }),
			catch: () => AdminSecretUnreadable.make({ reason: "fetch" })
		}),
	(client) => Effect.sync(() => client.destroy())
)
```

Effect scopes own lifetimes; `using` and `DisposableStack` are not used.
