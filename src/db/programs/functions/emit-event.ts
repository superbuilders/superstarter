import { sql } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

const emitEventFunction: SQL = sql`CREATE OR REPLACE FUNCTION emit_event() RETURNS trigger AS $$
DECLARE
  eid uuid;
  entity_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    entity_id := OLD.id;
  ELSE
    entity_id := NEW.id;
  END IF;

  INSERT INTO core.event_outbox (event_name, entity_id)
  VALUES (TG_ARGV[0], entity_id)
  RETURNING id INTO eid;

  PERFORM pg_notify('events', eid::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;`

export { emitEventFunction }
