import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const updatedAtFunction: SQL =
	sql.raw(`CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;`)

export { updatedAtFunction }
