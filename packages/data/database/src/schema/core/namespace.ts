import { pgSchema } from "drizzle-orm/pg-core"

/** The application's own tables live in `core`. Sessions run with search_path=pg_catalog, so every
 * statement names its schema and nothing resolves through `public`. */
export const core = pgSchema("core")
