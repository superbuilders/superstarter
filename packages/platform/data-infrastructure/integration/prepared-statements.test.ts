// The suite runs under node:test with node:assert.
// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { test } from "node:test"
import {
	cardinality,
	pgAttribute,
	pgClass,
	pgConstraint,
	pgNamespace,
	pgPreparedStatements
} from "@superstarter/database/catalog/pg-catalog"
import { POSTGRES_PRINCIPALS } from "@superstarter/database/postgres/principals"
import { withPostgresReadTransaction } from "@superstarter/database/postgres/transaction"
import type {
	NativePostgresDatabase,
	PostgresBuilder
} from "@superstarter/database/query/contracts"
import { and, eq, gt, inArray, type Query } from "drizzle-orm"
import { QueryBuilder } from "drizzle-orm/pg-core"
import { Array as Arr, Effect, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { assertSameMembers, root, withPrograms } from "#integration/database-program.ts"
import {
	PREPARED_STATEMENT_NAME,
	prepareWithoutExecution
} from "#integration/prepare-without-execution.ts"
import { borrowPreparedDatabase } from "#integration/prepared-target.ts"

/**
 * Every relation definition, built by its exported builder over a bare `QueryBuilder` exactly as
 * its view declares it, is parsed and analyzed by PostgreSQL's own PREPARE against the schema the
 * migrations just built. No statement executes. The source scan names every exported builder in
 * the database package that takes a `QueryBuilder`; one this suite does not drive fails it. The
 * schema declares no views yet, so the scan finds none and `DEFINITIONS` is empty: the first
 * definition must be registered here.
 *
 * The same borrowed session reads the schema facts the application relies on from the catalog:
 * the todo CHECK constraints exist and are validated, and the todo columns are NOT NULL.
 */

const DATABASE_SOURCES = "packages/data/database/src/"

const takesQueryBuilder = (parameter: ts.ParameterDeclaration | undefined): boolean =>
	parameter?.type !== undefined &&
	ts.isTypeReferenceNode(parameter.type) &&
	ts.isIdentifier(parameter.type.typeName) &&
	parameter.type.typeName.text === "QueryBuilder"

const isExported = (statement: ts.VariableStatement): boolean =>
	Arr.some(
		statement.modifiers === undefined ? [] : statement.modifiers,
		(modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
	)

/** The names an exported top-level statement declares as definition builders: the
 * `export const name = (qb: QueryBuilder) =>` bindings of one statement. */
const builderNamesOf = (statement: ts.Statement): ReadonlyArray<string> => {
	if (!ts.isVariableStatement(statement) || !isExported(statement)) {
		return []
	}
	return Arr.flatMap(statement.declarationList.declarations, (declaration) => {
		const initializer = declaration.initializer
		if (
			!ts.isIdentifier(declaration.name) ||
			initializer === undefined ||
			!(ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer))
		) {
			return []
		}
		return takesQueryBuilder(initializer.parameters[0]) ? [declaration.name.text] : []
	})
}

/** Every exported definition builder of the database package, as its program sees them. */
const discover = withPrograms({
	configs: [`${root}/packages/data/database/tsconfig.json`],
	work: (projects) => {
		const [project] = projects
		assert.ok(project !== undefined, "the database program is open")
		const { program } = project
		const paths = Arr.filter(program.getSourceFileNames(), (file) =>
			Str.startsWith(`${root}/${DATABASE_SOURCES}`)(file)
		)
		const builders = Arr.flatMap(paths, (file) => {
			const source = program.getSourceFile(file)
			assert.ok(source !== undefined, `${file} belongs to the database program`)
			return Arr.map(
				Arr.flatMap(source.statements, builderNamesOf),
				(name) => `${Str.slice(root.length + 1 + DATABASE_SOURCES.length)(file)}#${name}`
			)
		})
		return { builders: Arr.sort(Arr.dedupe(builders), Str.Order), paths }
	}
})

/** A built statement renders its own `Query` without a session, as every Drizzle select does. */
type Rendered = Readonly<{ toSQL: () => Query }>

/** One driven definition: the exported builder it covers, how the test names it, and the call. */
type Definition = Readonly<{
	exported: string
	variant: string
	build: (qb: QueryBuilder) => Rendered
}>

/** Every relation definition, each exactly as its view is declared (`.as(build)`). */
const DEFINITIONS: ReadonlyArray<Definition> = []

/** The prepared plan's catalog row: how many parameter types PostgreSQL inferred, and whether it
 * resolved a result row. */
const preparedPlan = (database: PostgresBuilder) =>
	database
		.select({
			parameters: cardinality(pgPreparedStatements.parameter_types),
			results: cardinality(pgPreparedStatements.result_types)
		})
		.from(pgPreparedStatements)
		.where(eq(pgPreparedStatements.name, PREPARED_STATEMENT_NAME))

type Plan = Awaited<ReturnType<ReturnType<typeof preparedPlan>["execute"]>>[number]

/** PostgreSQL's inferred plan against the builder's own binding: one inferred parameter type per
 * parameter the statement binds, and a resolved result row. */
const assertPlanMatches = (
	plans: ReadonlyArray<Plan>,
	query: Readonly<{ sql: string; params: ReadonlyArray<unknown> }>
) => {
	const [plan] = plans
	assert.ok(plan !== undefined, "the prepared plan is catalogued")
	assert.equal(
		plan.parameters,
		query.params.length,
		"PostgreSQL inferred one type per parameter the statement binds"
	)
	assert.ok(plan.results !== null && plan.results > 0, "PostgreSQL resolved the result row")
	return plan
}

/** One definition: rendered over a bare builder, PREPARE under the application role, its plan
 * read back. */
const preparedOnce = (database: NativePostgresDatabase, built: Definition) => {
	const query = built.build(new QueryBuilder()).toSQL()
	return prepareWithoutExecution({
		database,
		statement: query.sql,
		role: POSTGRES_PRINCIPALS.app,
		inspect: (scope) =>
			scope.run(preparedPlan).pipe(Effect.map((plans) => assertPlanMatches(plans, query)))
	})
}

const CORE = "core"

/** The todo CHECKs: a todo's id is a UUIDv7, and its title is never blank. */
const TODO_CHECKS = ["todos_id_v7_ck", "todos_title_ck"] as const

/** Every todo column holds a value. */
const TODO_COLUMNS = ["id", "title", "completed"] as const

/** The schema carries its todo facts: read under one snapshot, nothing written. */
const schemaCarriesTheFacts = (database: NativePostgresDatabase) =>
	withPostgresReadTransaction(database, (scope) =>
		Effect.gen(function* () {
			const checks = yield* scope.run((builder) =>
				builder
					.select({ name: pgConstraint.conname, validated: pgConstraint.convalidated })
					.from(pgConstraint)
					.innerJoin(pgNamespace, eq(pgNamespace.oid, pgConstraint.connamespace))
					.where(and(eq(pgNamespace.nspname, CORE), eq(pgConstraint.contype, "c")))
			)
			assertSameMembers({
				actual: Arr.map(checks, ({ name }) => name),
				expected: [...TODO_CHECKS],
				where: "the CHECK constraints of core"
			})
			for (const check of checks) {
				assert.ok(check.validated, `${check.name} is validated`)
			}
			const columns = yield* scope.run((builder) =>
				builder
					.select({ column: pgAttribute.attname, notNull: pgAttribute.attnotnull })
					.from(pgAttribute)
					.innerJoin(pgClass, eq(pgClass.oid, pgAttribute.attrelid))
					.innerJoin(pgNamespace, eq(pgNamespace.oid, pgClass.relnamespace))
					.where(
						and(
							eq(pgNamespace.nspname, CORE),
							inArray(pgClass.relname, ["todos"]),
							gt(pgAttribute.attnum, 0),
							eq(pgAttribute.attisdropped, false)
						)
					)
			)
			assertSameMembers({
				actual: Arr.map(columns, ({ column }) => column),
				expected: [...TODO_COLUMNS],
				where: "the columns of core.todos"
			})
			for (const column of columns) {
				assert.ok(column.notNull, `core.todos.${column.column} is NOT NULL`)
			}
		})
	)

void test("every relation definition is accepted by PostgreSQL", { concurrency: true }, (suite) =>
	Effect.runPromise(discover)
		.then(({ builders, paths }) => {
			assert.ok(Arr.isReadonlyArrayNonEmpty(paths), "the source scan found database modules")
			assertSameMembers({
				actual: Arr.map(DEFINITIONS, (built) => built.exported),
				expected: builders,
				where: "exported definition builders and driven ones"
			})
			return Promise.all([
				suite.test("the schema carries its todo facts", () =>
					Effect.runPromise(borrowPreparedDatabase(schemaCarriesTheFacts))
				),
				...Arr.map(DEFINITIONS, (built) =>
					suite.test(`${built.exported} [${built.variant}]`, () =>
						Effect.runPromise(
							borrowPreparedDatabase((database) => Effect.asVoid(preparedOnce(database, built)))
						)
					)
				)
			])
		})
		.then(() => undefined)
)
