// @effect-diagnostics nodeBuiltinImport:off
import assert from "node:assert/strict"
import { nativeDrizzleHistory } from "@superstarter/database/catalog/pg-catalog"
import { packagedMigrations } from "@superstarter/database/migrations/migration-artifacts"
import { withPostgresStatement } from "@superstarter/database/postgres/transaction"
import type { NativePostgresDatabase } from "@superstarter/database/query/contracts"
import { Array as Arr, Effect, String as Str } from "effect"
import { API, type Project } from "typescript/unstable/sync"

/** The repository root, from which every scanned source path is spelled. */
export const root = Str.replace(
	/\/packages\/platform\/data-infrastructure\/integration$/,
	""
)(import.meta.dirname)

/** The native compiler process, alive exactly as long as the scope. */
const nativeApi = Effect.acquireRelease(
	Effect.sync(() => new API({ cwd: root })),
	(api) =>
		Effect.sync(() => {
			api.close()
		})
)

/** Packages' own programs, opened in one native session, so each scanned declaration resolves to
 * its declared Drizzle type through the compiler options it is written against. A config the
 * compiler rejects fails the suite. */
export const withPrograms = <Result>(
	input: Readonly<{
		configs: ReadonlyArray<string>
		work: (projects: ReadonlyArray<Project>) => Result
	}>
) =>
	Effect.scoped(
		Effect.gen(function* () {
			const api = yield* nativeApi
			const snapshot = yield* Effect.acquireDisposable(
				Effect.sync(() => api.updateSnapshot({ openProjects: [...input.configs] }))
			)
			const projects = Arr.map(input.configs, (config) => {
				const project = snapshot.getProject(config)
				assert.ok(project !== undefined, `the compiler opened ${config}`)
				assert.deepEqual(project.program.getConfigFileParsingDiagnostics(), [], `${config} parses`)
				return project
			})
			return input.work(projects)
		})
	)

export const assertSameMembers = (
	input: Readonly<{
		actual: ReadonlyArray<string>
		expected: ReadonlyArray<string>
		where: string
	}>
) => {
	const { actual, expected, where } = input
	const missing = Arr.filter(expected, (member) => !Arr.contains(actual, member))
	const extra = Arr.filter(actual, (member) => !Arr.contains(expected, member))
	assert.ok(
		!Arr.isReadonlyArrayNonEmpty(missing) && !Arr.isReadonlyArrayNonEmpty(extra),
		`${where}: missing ${Arr.join(missing, ", ")}; unexpected ${Arr.join(extra, ", ")}`
	)
}

/** The database's native migration history holds exactly the repository's packaged migrations, by
 * the hash the native migrator records: a pending or unpackaged migration fails the schema the
 * statements are prepared against. */
export const schemaIsRepository = (database: NativePostgresDatabase) =>
	Effect.gen(function* () {
		const packaged = yield* packagedMigrations
		const applied = yield* withPostgresStatement(database, (scope) =>
			scope.run((builder) =>
				builder.select({ hash: nativeDrizzleHistory.hash }).from(nativeDrizzleHistory)
			)
		)
		assertSameMembers({
			actual: Arr.map(applied, ({ hash }) => hash),
			expected: Arr.map(packaged, ({ hash }) => hash),
			where: "applied and packaged migrations"
		})
	})
