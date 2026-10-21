import { readMigrationFiles } from "drizzle-orm/migrator"
import { Array as Arr, Effect, Schema } from "effect"

/** The reviewed migrations could not be read from the package. */
export class MigrationArtifactsUnreadable extends Schema.TaggedError<
	MigrationArtifactsUnreadable,
	{ readonly brand: unique symbol }
>()("MigrationArtifactsUnreadable", {}) {}

/** Where the native migrator finds this package's migrations and keeps its history. The history
 * lives in its own `drizzle` schema, never in `core`. */
export const migrationConfiguration = {
	migrationsFolder: `${import.meta.dirname}/../../drizzle`,
	migrationsSchema: "drizzle",
	migrationsTable: "__drizzle_migrations"
} as const

/** Every packaged migration, by the name and hash the native migrator records. */
export const packagedMigrations = Effect.try({
	try: () => readMigrationFiles(migrationConfiguration),
	catch: () => MigrationArtifactsUnreadable.make({})
}).pipe(Effect.map((files) => Arr.map(files, ({ name, hash }) => ({ name, hash }))))
