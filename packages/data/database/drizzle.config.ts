import { defineConfig } from "drizzle-kit"

// Generation only: drizzle-kit diffs the schema against the migrations here and never connects.
// Applying and pushing them are operator scripts in @superstarter/data-infrastructure.
export default defineConfig({
	dialect: "postgresql",
	schema: "./drizzle.schema.ts",
	out: "./drizzle",
	schemaFilter: ["core"]
})
