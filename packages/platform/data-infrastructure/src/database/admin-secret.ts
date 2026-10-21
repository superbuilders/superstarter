import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager"
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider"
import { Effect, Redacted, Schema } from "effect"
import { awsRoleArn, databaseAdminSecretArn } from "#env.ts"
import { AWS_REGION } from "#environment.ts"

/** The RDS-managed master secret's JSON shape. */
const AdminSecretJson = Schema.fromJsonString(
	Schema.Struct({ username: Schema.NonEmptyString, password: Schema.NonEmptyString })
)

/** The master secret could not be read. The provider's message is dropped: it can name the
 * caller's identity or echo credential material. */
class AdminSecretUnreadable extends Schema.TaggedError<
	AdminSecretUnreadable,
	{ readonly brand: unique symbol }
>()("AdminSecretUnreadable", {
	reason: Schema.Literals(["fetch", "empty", "shape"])
}) {}

export type AdminSecret = Readonly<{ username: string; password: Redacted.Redacted }>

const decodeAdminSecret = Schema.decodeEffect(AdminSecretJson)

/** Reads the master credentials through the deployment's OIDC role, the same identity the runtime
 * uses, so operator scripts need no long-lived AWS keys. */
export const readAdminSecret: Effect.Effect<AdminSecret, AdminSecretUnreadable> = Effect.gen(
	function* () {
		const secretArn = yield* databaseAdminSecretArn.pipe(Effect.orDie)
		const roleArn = yield* awsRoleArn.pipe(Effect.orDie)
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
						client.send(new GetSecretValueCommand({ SecretId: secretArn }), {
							abortSignal: signal
						}),
					catch: () => AdminSecretUnreadable.make({ reason: "fetch" })
				}),
			(client) =>
				Effect.sync(() => {
					client.destroy()
				})
		)
		const raw = yield* Effect.fromNullishOr(response.SecretString).pipe(
			Effect.mapError(() => AdminSecretUnreadable.make({ reason: "empty" }))
		)
		const secret = yield* decodeAdminSecret(raw).pipe(
			Effect.mapError(() => AdminSecretUnreadable.make({ reason: "shape" }))
		)
		return { username: secret.username, password: Redacted.make(secret.password) }
	}
)
