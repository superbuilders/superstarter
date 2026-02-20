import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const notifyTriggerFunction: SQL =
	sql.raw(`CREATE OR REPLACE FUNCTION notify_trigger() RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify(TG_TABLE_NAME, json_build_object(
    'op', TG_OP,
    'schema', TG_TABLE_SCHEMA,
    'table', TG_TABLE_NAME,
    'row', CASE
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END
  )::text);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;`)

export { notifyTriggerFunction }
