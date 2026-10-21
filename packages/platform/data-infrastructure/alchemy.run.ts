import * as AWS from "alchemy/AWS"
import * as Stack from "alchemy/Stack"
import { Stage } from "alchemy/Stage"
import { Effect, Layer, Schema } from "effect"
import { nativeAws } from "#aws/native-aws.ts"
import { readOwnedStateBucket, readStateKey } from "#aws/state-preflight.ts"
import { production } from "#compose/production.ts"
import { Environment, PROJECT } from "#environment.ts"
import { stateBucketNameOf } from "#names.ts"

/** What each environment composes. Adding an environment adds its composition here. */
const COMPOSE = { production } satisfies Record<Environment, unknown>

/** One operator session behind every resource provider and the state store. */
const session = nativeAws.pipe(Layer.orDie)

const providers = AWS.providers().pipe(Layer.provide(session))

/**
 * Alchemy's state store reconciles its bucket on first access, plan included, so the bucket and key
 * bootstrap created are admitted first: the store may neither create the bucket nor downgrade its
 * encryption.
 */
const state = Layer.unwrap(
	Effect.gen(function* () {
		const { accountId } = yield* AWS.AWSEnvironment.current
		const key = yield* readStateKey(accountId)
		yield* readOwnedStateBucket(accountId)
		return AWS.state({
			bucketName: stateBucketNameOf(accountId),
			encryption: { sseAlgorithm: "aws:kms", kmsMasterKeyId: key.Arn }
		})
	})
).pipe(Layer.provide(session), Layer.orDie)

export default Stack.Stack(
	PROJECT,
	{ providers, state },
	Effect.gen(function* () {
		const environment = yield* Stage.pipe(
			Effect.flatMap(Schema.decodeUnknownEffect(Environment)),
			Effect.orDie
		)
		// Modules add no Alchemy namespace, so moving one never changes a deployed resource's name.
		return yield* COMPOSE[environment]
	})
)
