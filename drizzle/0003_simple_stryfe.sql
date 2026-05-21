ALTER TABLE "items" ADD COLUMN "source_folder" varchar(128);--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "source_filename" varchar(256);--> statement-breakpoint
CREATE INDEX "items_source_folder_idx" ON "items" USING btree ("source_folder");