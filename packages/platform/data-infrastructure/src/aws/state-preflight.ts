import * as kms from "@distilled.cloud/aws/kms"
import * as s3 from "@distilled.cloud/aws/s3"
import { Effect, Schema } from "effect"
import { STATE_KEY_ALIAS, stateBucketNameOf } from "#names.ts"

/** A key the state may be encrypted with: enabled, customer-managed and symmetric. */
const StateKey = Schema.Struct({
	Arn: Schema.NonEmptyString,
	KeyId: Schema.NonEmptyString,
	AWSAccountId: Schema.NonEmptyString,
	KeyState: Schema.Literal("Enabled"),
	KeyManager: Schema.Literal("CUSTOMER"),
	KeySpec: Schema.Literal("SYMMETRIC_DEFAULT"),
	KeyUsage: Schema.Literal("ENCRYPT_DECRYPT")
})

class StateKeyInvalid extends Schema.TaggedError<
	StateKeyInvalid,
	{ readonly brand: unique symbol }
>()("StateKeyInvalid", {
	alias: Schema.String
}) {}

/** Admit key metadata as the state key only when it is a usable key of the operator's account. */
export const admitStateKey = Effect.fn(function* (
	candidate: Readonly<{ account: string; metadata: unknown }>
) {
	return yield* Schema.decodeUnknownEffect(StateKey)(candidate.metadata).pipe(
		Effect.filterOrFail(
			(key) => key.AWSAccountId === candidate.account,
			() => StateKeyInvalid.make({ alias: STATE_KEY_ALIAS })
		),
		Effect.mapError(() => StateKeyInvalid.make({ alias: STATE_KEY_ALIAS }))
	)
})

/** The state key bootstrap created, found by its alias. */
export const readStateKey = Effect.fn(function* (account: string) {
	const response = yield* kms.describeKey({ KeyId: STATE_KEY_ALIAS })
	return yield* admitStateKey({ account, metadata: response.KeyMetadata })
})

/** The state bucket exists and the operator's account owns it. */
export const readOwnedStateBucket = Effect.fn(function* (account: string) {
	yield* s3.headBucket({ Bucket: stateBucketNameOf(account), ExpectedBucketOwner: account })
})
