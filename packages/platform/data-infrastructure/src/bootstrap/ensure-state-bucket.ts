import * as kms from "@distilled.cloud/aws/kms"
import * as s3 from "@distilled.cloud/aws/s3"
import { Array as Arr, Effect, Schema } from "effect"
import { admitStateKey, readOwnedStateBucket, readStateKey } from "#aws/state-preflight.ts"
import { awsTagsOf, requiredTags, STATE_KEY_ALIAS, stateBucketNameOf } from "#names.ts"

const tags: ReadonlyArray<Readonly<{ Key: string; Value: string }>> = awsTagsOf(
	requiredTags("shared")
)

/** Only positive absence permits creation. Access and transport failures stay failures. */
const ensureBucketExists = Effect.fn(function* (account: string) {
	const bucket = stateBucketNameOf(account)
	yield* readOwnedStateBucket(account).pipe(
		Effect.catchTag(["NotFound", "NoSuchBucket"], () =>
			s3
				.createBucket({ Bucket: bucket, BucketNamespace: "account-regional" })
				.pipe(Effect.catchTag("BucketAlreadyOwnedByYou", () => Effect.void))
		)
	)
	yield* readOwnedStateBucket(account)
})

const ensureStateKey = Effect.fn(function* (account: string) {
	return yield* readStateKey(account).pipe(
		Effect.catchTag("NotFoundException", () =>
			Effect.gen(function* () {
				const created = yield* kms.createKey({
					Description: `Encryption for s3://${stateBucketNameOf(account)}`,
					KeySpec: "SYMMETRIC_DEFAULT",
					KeyUsage: "ENCRYPT_DECRYPT",
					Tags: Arr.map(tags, ({ Key, Value }) => ({ TagKey: Key, TagValue: Value }))
				})
				const key = yield* admitStateKey({ account, metadata: created.KeyMetadata })
				yield* kms.createAlias({ AliasName: STATE_KEY_ALIAS, TargetKeyId: key.KeyId })
				return key
			})
		)
	)
})

/**
 * The bucket and key that hold every stage's Alchemy state, configured the way the state store
 * expects so its own reconciliation finds nothing to change: versioned, private, owner-enforced,
 * encrypted with the customer key, TLS only. Running it again converges the same settings.
 */
export const ensureStateBucket = Effect.fn(function* (account: string) {
	const bucket = { Bucket: stateBucketNameOf(account), ExpectedBucketOwner: account }
	yield* ensureBucketExists(account)
	const key = yield* ensureStateKey(account)
	yield* kms.enableKeyRotation({ KeyId: key.KeyId })
	yield* s3.putBucketVersioning({ ...bucket, VersioningConfiguration: { Status: "Enabled" } })
	yield* s3.putPublicAccessBlock({
		...bucket,
		PublicAccessBlockConfiguration: {
			BlockPublicAcls: true,
			IgnorePublicAcls: true,
			BlockPublicPolicy: true,
			RestrictPublicBuckets: true
		}
	})
	yield* s3.putBucketOwnershipControls({
		...bucket,
		OwnershipControls: { Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] }
	})
	yield* s3.putBucketEncryption({
		...bucket,
		ServerSideEncryptionConfiguration: {
			Rules: [
				{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms", KMSMasterKeyID: key.Arn } }
			]
		}
	})
	const policy = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
		Version: "2012-10-17",
		Statement: [
			{
				Sid: "DenyInsecureTransport",
				Effect: "Deny",
				Principal: { AWS: "*" },
				Action: ["s3:*"],
				Resource: [`arn:aws:s3:::${bucket.Bucket}`, `arn:aws:s3:::${bucket.Bucket}/*`],
				Condition: { Bool: { "aws:SecureTransport": "false" } }
			}
		]
	})
	yield* s3.putBucketPolicy({ ...bucket, Policy: policy })
	yield* s3.putBucketTagging({ ...bucket, Tagging: { TagSet: [...tags] } })
})
