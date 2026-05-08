CREATE TYPE "public"."belt_level" AS ENUM('white', 'blue', 'brown', 'black');--> statement-breakpoint
CREATE TABLE "user_sub_type_belts" (
	"user_id" uuid NOT NULL,
	"sub_type_id" varchar(64) NOT NULL,
	"belt" "belt_level" DEFAULT 'white' NOT NULL,
	"progress_to_next" real DEFAULT 0 NOT NULL,
	"at_risk" boolean DEFAULT false NOT NULL,
	"updated_at_ms" bigint DEFAULT (extract(epoch from now()) * 1000)::bigint NOT NULL,
	CONSTRAINT "user_sub_type_belts_user_sub_type_pk" PRIMARY KEY("user_id","sub_type_id")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "target_score" integer DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_sub_type_belts" ADD CONSTRAINT "user_sub_type_belts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sub_type_belts" ADD CONSTRAINT "user_sub_type_belts_sub_type_id_sub_types_id_fk" FOREIGN KEY ("sub_type_id") REFERENCES "public"."sub_types"("id") ON DELETE no action ON UPDATE no action;