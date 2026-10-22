// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { test } from "node:test"
import {
	pgAttribute,
	pgClass,
	pgConstraint,
	pgNamespace
} from "@superstarter/database/catalog/pg-catalog"
import { withPostgresReadTransaction } from "@superstarter/database/postgres/transaction"
import type { NativePostgresDatabase } from "@superstarter/database/query/contracts"
import { coreTodos } from "@superstarter/database/schema/core/todos"
import { and, eq, gt, type Query } from "drizzle-orm"
import { getTableConfig, QueryBuilder } from "drizzle-orm/pg-core"
import { Array as Arr, Effect, Record, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { assertSameMembers, root, withPrograms } from "#integration/database-program.ts"
import { preparedOnce } from "#integration/prepare-without-execution.ts"
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
 * `core.todos` holds exactly the CHECK constraints and columns its table declares, every CHECK
 * validated and every column's nullability as declared.
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

/** The schema carries what `core.todos` declares, read from the table itself under one snapshot,
 * nothing written. */
const schemaCarriesTheFacts = (database: NativePostgresDatabase) =>
	withPostgresReadTransaction(database, (scope) =>
		Effect.gen(function* () {
			const declared = getTableConfig(coreTodos)
			const { schema, name } = declared
			assert.ok(schema !== undefined, "core.todos names its schema")
			const table = `${schema}.${name}`
			const checks = yield* scope.run((builder) =>
				builder
					.select({ name: pgConstraint.conname, validated: pgConstraint.convalidated })
					.from(pgConstraint)
					.innerJoin(pgClass, eq(pgClass.oid, pgConstraint.conrelid))
					.innerJoin(pgNamespace, eq(pgNamespace.oid, pgClass.relnamespace))
					.where(
						and(
							eq(pgNamespace.nspname, schema),
							eq(pgClass.relname, name),
							eq(pgConstraint.contype, "c")
						)
					)
			)
			assertSameMembers({
				actual: Arr.map(checks, (check) => check.name),
				expected: Arr.map(declared.checks, (check) => check.name),
				where: `the CHECK constraints of ${table}`
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
							eq(pgNamespace.nspname, schema),
							eq(pgClass.relname, name),
							gt(pgAttribute.attnum, 0),
							eq(pgAttribute.attisdropped, false)
						)
					)
			)
			assertSameMembers({
				actual: Arr.map(columns, ({ column }) => column),
				expected: Arr.map(declared.columns, (column) => column.name),
				where: `the columns of ${table}`
			})
			const nullability = Record.fromEntries(
				Arr.map(declared.columns, (column) => [column.name, column.notNull] as const)
			)
			for (const column of columns) {
				assert.equal(
					column.notNull,
					nullability[column.column],
					`${table}.${column.column} is NOT NULL exactly when its table declares it`
				)
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
							borrowPreparedDatabase((database) =>
								Effect.asVoid(
									preparedOnce({ database, query: built.build(new QueryBuilder()).toSQL() })
								)
							)
						)
					)
				)
			])
		})
		.then(() => undefined)
)
