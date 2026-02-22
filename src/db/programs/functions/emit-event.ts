import { sql } from "drizzle-orm"
import type { Column, SQL, Table } from "drizzle-orm"
import type { PgSchema } from "drizzle-orm/pg-core"

type EventOutboxTable = Table & {
	id: Column
	appId: Column
	label: Column
	entityId: Column
	tableName: Column
}

function emitEventFunction(schema: PgSchema, outbox: EventOutboxTable): SQL {
	return sql`CREATE OR REPLACE FUNCTION ${schema}.emit_event() RETURNS trigger AS $$
DECLARE
  eid uuid;
  entity_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    entity_id := OLD.id;
  ELSE
    entity_id := NEW.id;
  END IF;

  INSERT INTO ${outbox} (${outbox.appId}, ${outbox.label}, ${outbox.entityId}, ${outbox.tableName})
  VALUES (TG_ARGV[0], TG_ARGV[1], entity_id, TG_TABLE_NAME)
  RETURNING ${outbox.id} INTO eid;

  PERFORM pg_notify('events', eid::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;`
}

export { emitEventFunction }
export type { EventOutboxTable }
