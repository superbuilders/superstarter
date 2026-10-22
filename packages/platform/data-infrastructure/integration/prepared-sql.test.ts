// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { test } from "node:test"
import { NodeServices } from "@effect/platform-node"
import { TODO_STATEMENTS } from "@superstarter/database/queries/todos"
import type {
	PostgresResultSchema,
	PreparedPostgresStatement
} from "@superstarter/database/query/contracts"
import { Array as Arr, Effect, FileSystem, Option, Record, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Checker, Project } from "typescript/unstable/sync"
import {
	assertSameMembers,
	root,
	schemaIsRepository,
	withPrograms
} from "#integration/database-program.ts"
import { preparedOnce } from "#integration/prepare-without-execution.ts"
import { borrowPreparedDatabase } from "#integration/prepared-target.ts"

/**
 * Every production prepared statement, discovered from the source of every package and loaded from
 * the module that declares it, is accepted by PostgreSQL's own PREPARE under the role that runs it,
 * against the schema of the test database the migrations just built, whose native history must
 * match the repository's packaged migrations exactly. No statement executes and no dummy parameters
 * are bound. The plan PostgreSQL infers is compared with the statement's own declaration: one
 * inferred parameter type per bound parameter, and a resolved result row.
 */

/** A declared statement: its module path and the plan name its declaration spells. */
type Declared = Readonly<{ path: string; name: string }>

/** A `.prepare` call that does not sit inside a `preparePostgresStatement` factory's callback, or
 * whose receiver is not a Drizzle pg-core builder: a native plan the registry cannot see. */
type StrayPreparation = Readonly<{ path: string; line: number; reason: string }>

const isPrepareCall = (node: ts.Node): node is ts.CallExpression =>
	ts.isCallExpression(node) &&
	ts.isPropertyAccessExpression(node.expression) &&
	node.expression.name.text === "prepare"

const isFactoryCall = (node: ts.Node): node is ts.CallExpression =>
	ts.isCallExpression(node) &&
	ts.isIdentifier(node.expression) &&
	node.expression.text === "preparePostgresStatement"

/** `preparePostgresStatement({ name: "…", … })`: the plan name one declaration spells. */
const planNameOf = (node: ts.Node): Option.Option<string> => {
	if (!isFactoryCall(node)) {
		return Option.none()
	}
	const [plan] = node.arguments
	if (plan === undefined || !ts.isObjectLiteralExpression(plan)) {
		return Option.none()
	}
	return Arr.findFirst(plan.properties, (property) =>
		ts.isPropertyAssignment(property) &&
		ts.isIdentifier(property.name) &&
		property.name.text === "name" &&
		ts.isStringLiteral(property.initializer)
			? Option.some(property.initializer.text)
			: Option.none()
	)
}

/** The `prepare` the call resolves to is Drizzle pg-core's own method: a query builder's, never a
 * raw client's. The method's symbol keeps its original declaration even when the builder is a
 * mapped type without a symbol of its own. */
const receiverIsDrizzleBuilder = (call: ts.CallExpression, checker: Checker): boolean => {
	if (!ts.isPropertyAccessExpression(call.expression)) {
		return false
	}
	const method = checker.getSymbolAtLocation(call.expression.name)
	if (method === undefined) {
		return false
	}
	return Arr.some(method.declarations, (handle) =>
		Str.includes("/drizzle-orm/pg-core/")(Str.replaceAll("\\", "/")(handle.path))
	)
}

const insideFactory = (node: ts.Node): boolean => {
	if (isFactoryCall(node)) {
		return true
	}
	return ts.isSourceFile(node) ? false : insideFactory(node.parent)
}

const strayReasonOf = (call: ts.CallExpression, checker: Checker): string | undefined => {
	if (!insideFactory(call)) {
		return "outside preparePostgresStatement"
	}
	return receiverIsDrizzleBuilder(call, checker)
		? undefined
		: "receiver is not a Drizzle pg-core builder"
}

const discoverSource = (
	input: Readonly<{ path: string; source: ts.SourceFile; checker: Checker }>
) => {
	const declared: Array<Declared> = []
	const stray: Array<StrayPreparation> = []
	const visit = (node: ts.Node): void => {
		if (isPrepareCall(node)) {
			const reason = strayReasonOf(node, input.checker)
			if (reason !== undefined) {
				const { line } = input.source.getLineAndCharacterOfPosition(node.getStart(input.source))
				stray.push({ path: input.path, line: line + 1, reason })
			}
		}
		const name = planNameOf(node)
		if (Option.isSome(name)) {
			declared.push({ path: input.path, name: name.value })
		}
		node.forEachChild(visit)
	}
	visit(input.source)
	return { declared, stray }
}

/** The package a source belongs to owns it: its own program resolves it with the options it is
 * written against. Only package sources are scanned, never a dependency's. */
const ownedSources = (project: Project) => {
	const directory = Str.replace(/tsconfig\.json$/, "")(project.configFileName)
	return Arr.filter(
		project.program.getSourceFileNames(),
		(file) =>
			Str.startsWith(`${directory}src/`)(file) &&
			!Str.includes("/node_modules/")(file) &&
			Str.endsWith(".ts")(file)
	)
}

/** Every workspace package's tsconfig: packages/<category>/<package>/tsconfig.json. */
const packageConfigs = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const categories = yield* fs.readDirectory(`${root}/packages`)
	const packages = yield* Effect.forEach(categories, (category) =>
		Effect.map(fs.readDirectory(`${root}/packages/${category}`), (names) =>
			Arr.map(names, (name) => `${root}/packages/${category}/${name}/tsconfig.json`)
		)
	)
	return yield* Effect.filter(Arr.flatten(packages), (config) => fs.exists(config))
})

/** Every production statement factory from the source of every package, and every `.prepare`
 * call that is not the one such a factory's callback makes on a Drizzle builder. */
const discover = Effect.flatMap(packageConfigs, (configs) =>
	withPrograms({
		configs,
		work: (projects) => {
			const declared: Array<Declared> = []
			const stray: Array<StrayPreparation> = []
			const paths: Array<string> = []
			for (const project of projects) {
				for (const file of ownedSources(project)) {
					const source = project.program.getSourceFile(file)
					assert.ok(source !== undefined, `${file} was admitted for discovery`)
					const path = Str.slice(root.length + 1)(file)
					paths.push(path)
					const found = discoverSource({ path, source, checker: project.checker })
					declared.push(...found.declared)
					stray.push(...found.stray)
				}
			}
			return { declared, stray, paths }
		}
	})
)

/** Each statement module's roster, keyed by source path: the one place a new module is
 * registered, which the source scan checks against (a declaration missing from its module's roster,
 * or a rostered statement without a declaration, fails the suite). */
const STATEMENT_ROSTERS: Readonly<
	Record<string, ReadonlyArray<PreparedPostgresStatement<PostgresResultSchema>>>
> = {
	"packages/data/database/src/queries/todos.ts": TODO_STATEMENTS
}

/** Every rostered statement, keyed by its module path and plan name. */
const rosteredStatements: ReadonlyArray<
	readonly [string, PreparedPostgresStatement<PostgresResultSchema>]
> = Arr.flatMap(Record.toEntries(STATEMENT_ROSTERS), ([path, roster]) =>
	Arr.map(roster, (statement) => [`${path}#${statement.name}`, statement] as const)
)

/** The scan's findings against the registry: every check the suite makes before it connects. */
const assertRegistry = (
	found: Readonly<{
		declared: ReadonlyArray<Declared>
		stray: ReadonlyArray<StrayPreparation>
		paths: ReadonlyArray<string>
	}>
) => {
	const { declared, stray, paths } = found
	assert.ok(Arr.isReadonlyArrayNonEmpty(paths), "the source scan found package sources")
	assert.deepEqual(stray, [], "every native prepare belongs to a statement factory on a builder")
	assert.ok(Arr.isReadonlyArrayNonEmpty(declared), "the source scan found statement factories")
	assertSameMembers({
		actual: Arr.dedupe(Arr.map(declared, ({ path }) => path)),
		expected: Record.keys(STATEMENT_ROSTERS),
		where: "the scanned statement modules and the registered ones"
	})
	assertSameMembers({
		actual: Arr.map(rosteredStatements, ([key]) => key),
		expected: Arr.map(declared, ({ path, name }) => `${path}#${name}`),
		where: "declared statements and rostered ones"
	})
	return rosteredStatements
}

void test(
	"every production prepared statement is accepted by PostgreSQL",
	{ concurrency: true },
	(suite) =>
		// @effect-diagnostics-next-line strictEffectProvide:off
		Effect.runPromise(discover.pipe(Effect.provide(NodeServices.layer)))
			.then(assertRegistry)
			.then((statements) =>
				Promise.all([
					suite.test("the migration history is the repository's", () =>
						Effect.runPromise(borrowPreparedDatabase(schemaIsRepository))
					),
					...Arr.map(statements, ([key, statement]) =>
						suite.test(key, () =>
							Effect.runPromise(
								borrowPreparedDatabase((database) =>
									Effect.asVoid(
										preparedOnce({
											database,
											query: statement.build(database, statement.name).getQuery()
										})
									)
								)
							)
						)
					)
				])
			)
			.then(() => undefined)
)
