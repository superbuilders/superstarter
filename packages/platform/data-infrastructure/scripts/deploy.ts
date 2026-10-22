import { NodeHttpClient, NodeRuntime, NodeServices } from "@effect/platform-node"
import { Stack } from "alchemy/Alchemist"
import { AlchemyContext } from "alchemy/AlchemyContext"
import { CredentialsStoreLive } from "alchemy/Auth/Credentials"
import { ProfileStoreLive } from "alchemy/Auth/Profile"
import { renderApply } from "alchemy/Cli/commands/render"
import { LoggingCli } from "alchemy/Cli/LoggingCli"
import * as Interaction from "alchemy/Interaction"
import type { Plan } from "alchemy/Plan"
import { Cli } from "alchemy/Report"
import { Array as Arr, Console, Effect, HashSet, Layer, Path, Record, Schema, Stdio } from "effect"
import type * as Entrypoint from "#alchemy.run.ts"
import { Environment } from "#environment.ts"

/** `deploy <environment> <logical-id>...`: the environment is the stage, and the logical IDs are
 * every resource the reviewed plan showed changing. */
const Arguments = Schema.TupleWithRest(Schema.Tuple([Environment, Schema.NonEmptyString]), [
	Schema.NonEmptyString
])

class DeployUsage extends Schema.TaggedError<DeployUsage, { readonly brand: unique symbol }>()(
	"DeployUsage",
	{ usage: Schema.Literal("deploy <environment> <logical-id>...") }
) {}

class InfrastructureScopeRefused extends Schema.TaggedError<
	InfrastructureScopeRefused,
	{ readonly brand: unique symbol }
>()("InfrastructureScopeRefused", { unexpected: Schema.Array(Schema.String) }) {}

/** Alchemy types a planned resource as `any`, so its logical ID is admitted here; a resource without one is a
 * defect, never a resource the scope check skips. */
const decodeResources = Schema.decodeUnknownEffect(
	Schema.Array(Schema.Struct({ LogicalId: Schema.String }))
)

/** Every resource, binding and stack action the plan would change or remove. */
const changedIdsOf = (plan: Plan): Effect.Effect<ReadonlyArray<string>> => {
	const resources = [
		...Arr.filter(Record.values(plan.resources), (node) => {
			if (node.action !== "noop") {
				return true
			}
			return Arr.some(node.bindings, (binding) => binding.action !== "noop")
		}),
		...Arr.filter(Record.values(plan.deletions), (node) => node !== undefined)
	]
	const actionIds = Arr.map(
		[
			...Arr.filter(Record.values(plan.actions), (node) => node.action !== "noop"),
			...Arr.filter(Record.values(plan.actionDeletions), (node) => node !== undefined)
		],
		(node) => node.def.LogicalId
	)
	return decodeResources(Arr.map(resources, (node): unknown => node.resource)).pipe(
		Effect.orDie,
		Effect.map((decoded) => [...Arr.map(decoded, (resource) => resource.LogicalId), ...actionIds])
	)
}

/**
 * Plan, admit and apply in one run. The fresh plan that is applied must change only the resources
 * the operator named: an earlier plan cannot authorize drift introduced since, and a security group
 * reconciles the ingress it observes, including temporary rules.
 */
const program = Effect.gen(function* () {
	const stdio = yield* Stdio.Stdio
	const path = yield* Path.Path
	const [stage, ...ids] = yield* stdio.args.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Arguments)),
		Effect.mapError(() => DeployUsage.make({ usage: "deploy <environment> <logical-id>..." }))
	)
	const intended = HashSet.fromIterable(ids)
	const logging = yield* Cli
	const admitPlan = Effect.fn(function* (plan: Plan) {
		const changed = yield* changedIdsOf(plan)
		const unexpected = Arr.filter(changed, (id) => !HashSet.has(intended, id))
		if (Arr.isReadonlyArrayNonEmpty(unexpected)) {
			return yield* Effect.die(InfrastructureScopeRefused.make({ unexpected }))
		}
	})
	const scopedCli = Cli.of({
		...logging,
		approvePlan: (plan, options) =>
			logging.displayPlan(plan, options).pipe(Effect.andThen(admitPlan(plan)), Effect.as(true)),
		startApplySession: (plan, options) =>
			admitPlan(plan).pipe(Effect.andThen(logging.startApplySession(plan, options)))
	})
	const deploy = Effect.gen(function* () {
		const cli = yield* Cli
		const display = { stage }
		const input: Stack.PlanInput = {
			target: { entrypoint: path.resolve(import.meta.dirname, "../alchemy.run.ts"), stage },
			operation: "deploy",
			updateStateStore: false
		}
		const snapshot = yield* Effect.succeed(input).pipe(
			Effect.flatMap(Stack.plan<typeof Entrypoint>),
			Effect.orDie
		)
		const changed = yield* changedIdsOf(snapshot.native)
		if (Arr.isReadonlyArrayNonEmpty(changed)) {
			const approved = yield* cli.approvePlan(snapshot.native, display)
			if (!approved) {
				return
			}
		}
		const outputs = yield* Stack.apply(snapshot).pipe(renderApply(snapshot.native, display))
		yield* Console.log(outputs)
	})
	yield* deploy.pipe(Effect.provideService(Cli, scopedCli))
})

/** Alchemy keeps its local version-check cache beside the stack; durable state lives in S3. */
const alchemyContext = Layer.effect(
	AlchemyContext,
	Effect.map(Path.Path, (path) => ({
		dotAlchemy: path.resolve(import.meta.dirname, "../.alchemy"),
		dev: false,
		adopt: false
	}))
)

const services = Layer.mergeAll(
	LoggingCli,
	alchemyContext,
	Interaction.layerNonInteractive(),
	ProfileStoreLive,
	CredentialsStoreLive
).pipe(Layer.provideMerge(Layer.mergeAll(NodeServices.layer, NodeHttpClient.layerNodeHttp)))

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(program.pipe(Effect.scoped, Effect.provide(services)))
