import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { AWS_REGION } from "@superstarter/database/postgres/rds"
import {
	Config,
	DateTime,
	Duration,
	Effect,
	FileSystem,
	Option,
	Path,
	Redacted,
	Schema,
	Stdio
} from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/process"
import { awsProfile, devFactoryCredentialsPath, homeDirectory } from "#env.ts"
import { argumentsOf, exitWith } from "#script.ts"

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

class DevFactoryCredentialsMissing extends Schema.TaggedError<
	DevFactoryCredentialsMissing,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsMissing", { path: Schema.String }) {}

/** Decoding issues can quote the file, which holds secrets, so only the path escapes. */
class DevFactoryCredentialsInvalid extends Schema.TaggedError<
	DevFactoryCredentialsInvalid,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsInvalid", { path: Schema.String }) {}

/** A named AWS profile in the shell wins over the environment credentials this script injects, so
 * every AWS call would run as that profile instead of the DevFactory session. */
class DevFactoryCredentialsShadowed extends Schema.TaggedError<
	DevFactoryCredentialsShadowed,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsShadowed", { profile: Schema.NonEmptyString }) {}

class DevFactoryCredentialsExpiring extends Schema.TaggedError<
	DevFactoryCredentialsExpiring,
	{ readonly brand: unique symbol }
>()("DevFactoryCredentialsExpiring", { path: Schema.String, expiration: Schema.String }) {}

/**
 * Run one command with the DevFactory session in its environment: the dump at
 * `~/Downloads/credentials.json`, or wherever `DEVFACTORY_CREDS_PATH` points. The AWS SDK's provider
 * chain reads these variables first unless an `AWS_PROFILE` is set, so this refuses to run under
 * one, and the command's every AWS call uses this session. The command's exit code becomes this
 * process's.
 */
const program = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const stdio = yield* Stdio.Stdio
	const [command, ...args] = yield* stdio.args.pipe(
		Effect.flatMap(argumentsOf(Arguments, "with-aws <command> [args...]"))
	)
	const shadowing = yield* awsProfile
	if (Option.isSome(shadowing)) {
		return yield* DevFactoryCredentialsShadowed.make({ profile: shadowing.value })
	}
	const file = yield* devFactoryCredentialsPath.pipe(
		Config.orElse(() =>
			homeDirectory.pipe(Config.map((home) => path.join(home, "Downloads", "credentials.json")))
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
	const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
	yield* spawner
		.exitCode(
			ChildProcess.make(command, args, {
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
		)
		.pipe(Effect.flatMap(exitWith))
})

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(program.pipe(Effect.provide(NodeServices.layer)))
