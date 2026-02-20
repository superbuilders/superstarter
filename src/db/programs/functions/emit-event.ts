import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const emitEventFunction: SQL = sql`CREATE OR REPLACE FUNCTION emit_event() RETURNS trigger AS $$
DECLARE
  eid uuid;
  row_data jsonb;
  entity_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
    entity_id := OLD.id;
  ELSE
    row_data := to_jsonb(NEW);
    entity_id := NEW.id;
  END IF;

  INSERT INTO core.event_outbox (event_name, entity_id, payload)
  VALUES (TG_ARGV[0], entity_id, row_data)
  RETURNING id INTO eid;

  PERFORM pg_notify('events', eid::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;`

export { emitEventFunction }
