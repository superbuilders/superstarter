CREATE SCHEMA "core";
--> statement-breakpoint
CREATE TABLE "core"."todos" (
	"id" uuid DEFAULT uuidv7(),
	"title" varchar(256) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "todos_pk" PRIMARY KEY("id"),
	CONSTRAINT "todos_id_v7_ck" CHECK (uuid_extract_version("id") = 7),
	CONSTRAINT "todos_title_ck" CHECK (char_length(btrim("title")) > 0)
);
--> statement-breakpoint
CREATE INDEX "todos_completed_idx" ON "core"."todos" ("completed");