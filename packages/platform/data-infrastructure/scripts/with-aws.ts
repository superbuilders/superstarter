import { NodeRuntime, NodeServices } from "@effect/platform-node"
import {
	Config,
	DateTime,
	Duration,
	Effect,
	FileSystem,
	Path,
	Redacted,
	Schema,
	Stdio
} from "effect"
import { ChildProcess } from "effect/process"
import { AWS_REGION } from "#environment.ts"

/** The DevFactory AWS portal's credential dump: one temporary session. The secrets stay redacted,
 * so no log line or failure can print them. */
const DevFactoryCredentials = Schema.Struct({
	accessKeyId: Schema.RedactedFromValue(Schema.NonEmptyString),
	secretAccessKey: Schema.RedactedFromValue(Schema.NonEmptyString),
	sessionToken: Schema.RedactedFromValue(Schema.NonEmptyString),
	expiration: Schema.DateTimeUtcFromString
})

/** `with-aws <command> [args...]`. */
const Arguments = Schema.TupleWithRest(Schema.Tuple([Schema.NonEmptyString]), [Schema.String])

/** A session that expires sooner than this would expire mid-command. */
const MINIMUM_HEADROOM = Duration.seconds(60)

class WithAwsUsage extends Schema.TaggedError<WithAwsUsage, { readonly brand: unique symbol }>()(
	"WithAwsUsage",
	{ usage: Schema.Literal("with-aws <command> [args...]") }
) {}

class DevFactoryCredentialsMissing extends Schema.TaggedError<
	DevFactoryCredentialsMissing,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsMissing", { path: Schema.String }) {}

/** Decoding issues can quote the file, which holds secrets, so only the path escapes. */
class DevFactoryCredentialsInvalid extends Schema.TaggedError<
	DevFactoryCredentialsInvalid,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsInvalid", { path: Schema.String }) {}

class DevFactoryCredentialsExpiring extends Schema.TaggedError<
	DevFactoryCredentialsExpiring,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsExpiring", { path: Schema.String, expiration: Schema.String }) {}

/**
 * Run one command with the DevFactory session in its environment: the dump at
 * `~/Downloads/credentials.json`, or wherever `DEVFACTORY_CREDS_PATH` points. The AWS SDK's provider
 * chain reads these variables first, so the command's every AWS call uses this session. The
 * command's exit code becomes this process's.
 */
const program = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const stdio = yield* Stdio.Stdio
	const [command, ...args] = yield* stdio.args.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Arguments)),
		Effect.mapError(() => WithAwsUsage.make({ usage: "with-aws <command> [args...]" }))
	)
	const file = yield* Config.NonEmptyString("DEVFACTORY_CREDS_PATH").pipe(
		Config.orElse(() =>
			Config.NonEmptyString("HOME").pipe(
				Config.map((home) => path.join(home, "Downloads", "credentials.json"))
			)
		)
	)
	if (!(yield* fs.exists(file))) {
		return yield* DevFactoryCredentialsMissing.make({ path: file })
	}
	const credentials = yield* fs.readFileString(file).pipe(
		Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(DevFactoryCredentials))),
		Effect.mapError(() => DevFactoryCredentialsInvalid.make({ path: file }))
	)
	const now = yield* DateTime.now
	const expiration = DateTime.formatIso(credentials.expiration)
	const remaining = DateTime.distance(now, credentials.expiration)
	if (Duration.isLessThan(remaining, MINIMUM_HEADROOM)) {
		return yield* DevFactoryCredentialsExpiring.make({ path: file, expiration })
	}
	yield* Effect.logInfo("devfactory credentials loaded").pipe(
		Effect.annotateLogs({
			path: file,
			expiration,
			minutesUntilExpiry: Math.floor(Duration.toMinutes(remaining)),
			command,
			args
		})
	)
	const child = yield* ChildProcess.make(command, args, {
		env: {
			AWS_ACCESS_KEY_ID: Redacted.value(credentials.accessKeyId),
			AWS_SECRET_ACCESS_KEY: Redacted.value(credentials.secretAccessKey),
			AWS_SESSION_TOKEN: Redacted.value(credentials.sessionToken),
			AWS_REGION
		},
		extendEnv: true,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit"
	})
	const exitCode = yield* child.exitCode
	yield* Effect.sync(() => {
		process.exitCode = exitCode
	})
})

// The entry point provides Node's platform services, once, for the whole command.
// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(program.pipe(Effect.scoped, Effect.provide(NodeServices.layer)))
