import { NodeHttpClient, NodeRuntime, NodeServices } from "@effect/platform-node"
import { AWSEnvironment } from "alchemy/AWS"
import { Effect, Layer, Schema, Stdio } from "effect"
import { nativeAws } from "#aws/native-aws.ts"
import { ensureStateBucket } from "#bootstrap/ensure-state-bucket.ts"
import { ensureVercelOidcProvider } from "#bootstrap/ensure-vercel-oidc-provider.ts"
import { VERCEL_TEAM_SLUG } from "#env.ts"
import { argumentsOf } from "#script.ts"

/** `bootstrap --execute`: account singletons are created only by an owner who says so. */
const Arguments = Schema.Tuple([Schema.Literal("--execute")])

/**
 * The account singletons every stage depends on, created once per account before the first plan:
 * the team's Vercel OIDC provider, and the bucket and key that hold Alchemy's state. Both converge
 * when run again.
 */
const program = Effect.gen(function* () {
	const stdio = yield* Stdio.Stdio
	yield* stdio.args.pipe(Effect.flatMap(argumentsOf(Arguments, "bootstrap --execute")))
	const team = yield* VERCEL_TEAM_SLUG
	const { accountId: account } = yield* AWSEnvironment.current
	yield* Effect.logInfo("bootstrapping account").pipe(Effect.annotateLogs({ account, team }))
	yield* ensureVercelOidcProvider({ account, team })
	yield* ensureStateBucket(account)
	yield* Effect.logInfo("bootstrap complete").pipe(Effect.annotateLogs({ account }))
})

const services = Layer.mergeAll(nativeAws, NodeHttpClient.layerNodeHttp, NodeServices.layer)

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(program.pipe(Effect.provide(services)))
