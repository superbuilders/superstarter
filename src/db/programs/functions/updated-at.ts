import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"
import type { PgSchema } from "drizzle-orm/pg-core"

function updatedAtFunction(schema: PgSchema): SQL {
	return sql`CREATE OR REPLACE FUNCTION ${schema}.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`
}

export { updatedAtFunction }
