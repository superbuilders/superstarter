---
name: bjorns-opinionated-postgres-audit
description: Use when creating or changing a Drizzle table on PostgreSQL, or writing, changing or reviewing a Drizzle query. Gives exact rules for how tables are shaped (no redundant columns, no "one wide table for several kinds of row", no timestamp columns, named constraints) and how queries are written (no raw SQL identifiers, correct number decoding, CTE naming, aggregates, DISTINCT). Invoke it on its own to audit the current diff; it covers both tables and queries, because a change to one usually changes the other.
---

# Bjorn's Opinionated Postgres Audit

This skill has two parts. **Part 1** says how a table must be shaped. **Part 2** says how a query must be written. Both follow one idea: **put the guarantee where the compiler can see it.** If the database already guarantees a fact, the TypeScript type of every row should say so too. Then no reader has to check the fact again, cast around it, or trust a comment.

Drizzle derives a column's TypeScript type from **one thing only: whether the column is nullable.** It cannot see CHECK constraints, triggers or conventions. So a nullable column reads as `T | null` everywhere, even when a CHECK guarantees it is set. Most of the table rules below exist to turn such guarantees into NOT NULL columns and joins, which Drizzle _can_ see.

## Before you start

This skill does not know the project's layout. Find these first:

1. The directory holding the Drizzle table modules, and the module that collects them into the schema object.
2. The directory holding the query code.
3. The project's migration workflow: who generates migrations, who applies them, and which databases you may touch.
4. The project's own rules (`CLAUDE.md`, `AGENTS.md`, `rules/`, a lint config). **Where they say something different from this skill, follow the project.**

When you audit, work over the diff against the main branch (`git diff origin/main --stat`), and apply both parts to every changed table and query.

# Part 1: How a table is shaped

## 1.1 Every column depends on the whole key and nothing else

**The rule.** For each table, list its keys: the primary key, and every UNIQUE constraint that really identifies a row. Then, for each other column, ask: _is this value determined by a whole key of this row, and only by that?_ If a parent row, another column, or a part of a key already determines the value, the column is redundant. Remove it. (This is Boyce–Codd normal form, BCNF.)

**Spot it.** The two shapes this usually takes:

- **A child copies a fact its parent already has.** A `lessons` row has `unit_id`, and the unit already knows its `course_id`, yet `lessons` also stores `course_id`. That counts even if `course_id` was added only so a composite foreign key could check membership.
- **A table stores something a join can compute.** A `runs` table stores both `version_id` and `course_id`, but the version determines the course.

**Refactor.**

1. Delete the redundant column from the table.
2. Every reader that used it now joins to the row that determines it (`lessons → units → courses`).
3. If the column was there to enforce a rule (for example, "a lesson's unit belongs to the run's course"), move that rule into the **one function that writes the row**. That function checks the rule before it writes and fails with a named error when the rule is broken. Test that error.
4. In the table's doc comment, say which column was left out on purpose and which writer now holds the rule.

```ts
// BEFORE: course_id is determined by unit_id → units.course_id
export const lessons = pgTable("lessons", {
	id: uuid("id").default(sql`uuidv7()`).notNull(),
	unitId: uuid("unit_id").notNull(),
	courseId: uuid("course_id").notNull()
})

// AFTER: the course comes from the unit, by join
/** One lesson of a unit. Its course is its unit's course, read by join, never stored here. */
export const lessons = pgTable(
	"lessons",
	{
		id: uuid("id").default(sql`uuidv7()`).notNull(),
		unitId: uuid("unit_id").notNull()
	},
	(t) => [
		primaryKey({ name: "lessons_pk", columns: [t.id] }),
		foreignKey({ name: "fk_lessons_units", columns: [t.unitId], foreignColumns: [units.id] })
	]
)
```

## 1.2 Several kinds of row: one header table plus one table per kind

**The rule.** When a table holds several _kinds_ of row, and each kind has its own fields (a "sum type" or "discriminated union"), do **not** put every kind's fields into one wide table as nullable columns. Instead:

- a **header** table holds what every kind has, plus a NOT NULL `kind` column;
- one **sidecar** table per kind that carries data holds that kind's fields, all NOT NULL.

**Spot it.** Any of these means the table is several kinds of row squeezed into one:

- a `kind`, `type`, `status` or `outcome` column next to nullable columns that only some kinds use;
- a CHECK that ties one column's presence to another column's value, e.g. `(kind = 'automatic') = (score IS NOT NULL)`;
- a group of nullable columns that are always all set together or all null together;
- no kind column at all, where readers work out the kind from which columns are null.

**Why.** In the wide table, impossible rows (an automatic grading with a grader, a row with both kinds' fields set) can be written; only a CHECK stops them. And because Drizzle ignores the CHECK, every reader sees `score: number | null` and must check it again or cast it with `as` / `!`. In the split form, the sidecar's columns are NOT NULL, so an inner join gives `score: number` with nothing to check.

**Refactor.**

1. Create a `pgEnum` for the kinds, and export its values array as a constant.
2. Make the **header**: the id, the columns every kind has (NOT NULL), and `kind` (NOT NULL). Give it a `UNIQUE (id, kind)` constraint. Its only job is to be the target of the sidecars' foreign keys.
3. Make one **sidecar** per kind that has its own data:
   - Its name starts with the header's name in the singular, then names the kind. For a header `gradings`, the sidecars are `grading_automatic_results` and `grading_manual_reviews`. A name that shares only a prefix (`automatic_results`) is wrong, because it doesn't read as part of `gradings`.
   - Its primary key is the header's id.
   - It has a `kind` column **generated as that kind's constant**, so it can't hold any other value.
   - It has a composite foreign key `(header_id, kind) → header (id, kind)`, so it can only attach to a header of its own kind.
   - All of its data columns are NOT NULL. Allow a nullable column only when the value can really be missing _within that kind_, and justify each one in the doc comment.
4. A kind with no data of its own gets **no** sidecar. Its having no sidecar row is its data.
5. Write the header and its sidecar **in one transaction**, in one function. A foreign key only stops a sidecar from existing without its header, not a header from existing without its sidecar. Say this in the header's doc comment.
6. Move the data: create the new tables, copy rows across in a migration, update every reader (see 2.10) and writer, then drop the old columns.

```ts
// BEFORE: one wide table, the kinds told apart by nulls and a CHECK
export const gradings = pgTable(
	"gradings",
	{
		id: uuid("id").default(sql`uuidv7()`).notNull(),
		kind: gradingKind("kind").notNull(),
		score: integer("score"), // automatic only
		graderId: uuid("grader_id"), // manual only
		comment: text("comment") // manual only
	},
	(t) => [check("gradings_arm_ck", sql`(${t.kind} = 'automatic') = (${t.score} IS NOT NULL)`)]
)

// AFTER: a header plus one sidecar per kind
export const GRADING_KINDS = ["automatic", "manual"] as const
export const gradingKind = pgEnum("grading_kind", GRADING_KINDS)

/** One grading of a submission. Its kind's data lives in exactly one sidecar, written in the
 * same transaction as this row. */
export const gradings = pgTable(
	"gradings",
	{
		id: uuid("id").default(sql`uuidv7()`).notNull(),
		submissionId: uuid("submission_id").notNull(),
		kind: gradingKind("kind").notNull()
	},
	(t) => [
		primaryKey({ name: "gradings_pk", columns: [t.id] }),
		unique("gradings_id_kind_uq").on(t.id, t.kind)
	]
)

/** The result of an automatic grading. */
export const gradingAutomaticResults = pgTable(
	"grading_automatic_results",
	{
		gradingId: uuid("grading_id").notNull(),
		kind: gradingKind("kind").generatedAlwaysAs(sql`'automatic'::grading_kind`),
		score: integer("score").notNull()
	},
	(t) => [
		primaryKey({ name: "grading_automatic_results_pk", columns: [t.gradingId] }),
		foreignKey({
			name: "fk_grading_automatic_results_gradings",
			columns: [t.gradingId, t.kind],
			foreignColumns: [gradings.id, gradings.kind]
		}),
		check("grading_automatic_results_score_ck", sql`${t.score} >= 0`)
	]
)

/** A person's review of a manual grading. */
export const gradingManualReviews = pgTable(
	"grading_manual_reviews",
	{
		gradingId: uuid("grading_id").notNull(),
		kind: gradingKind("kind").generatedAlwaysAs(sql`'manual'::grading_kind`),
		graderId: uuid("grader_id").notNull(),
		comment: text("comment").notNull()
	},
	(t) => [
		primaryKey({ name: "grading_manual_reviews_pk", columns: [t.gradingId] }),
		foreignKey({
			name: "fk_grading_manual_reviews_gradings",
			columns: [t.gradingId, t.kind],
			foreignColumns: [gradings.id, gradings.kind]
		})
	]
)
```

**About the generated `kind` column.**

- A generated column can't be written to, so the wrong kind can't be stored. That makes `CHECK (kind = 'automatic')` unnecessary.
- If you find an older sidecar that pins its kind with `.default('<kind>')` plus a CHECK, upgrade it to the generated form. A default can be overwritten; a generated value can't.
- Postgres allows a generated column on the referencing side of a plain foreign key. It refuses `ON UPDATE CASCADE`, `SET NULL` and `SET DEFAULT` onto that column, which this pattern never needs.
- The first time you use this in a project, check that the generated SQL declares the column `STORED`, and apply it once to a throwaway database. If Postgres refuses it there, fall back to `.default('<kind>')` plus the CHECK for that table.

**One sidecar shared by several kinds.** Sometimes a sidecar applies to a _set_ of kinds: say a `transmissions` record exists for the outcomes `delivered` and `rejected`, but not for `unaddressable`. A generated constant can't express "one of these". Instead:

- give the sidecar a real `kind` column;
- keep the same composite foreign key to `(id, kind)`, so its `kind` must match its header's;
- add `CHECK (kind IN ('delivered', 'rejected'))`.

Now the sidecar can't attach to an `unaddressable` header. Key the sidecar by the header id alone, with no `kind` column, only when the header has no `UNIQUE (id, kind)` to point at. Don't invent a separate kind column for the sidecar; use the header's real one.

**Don't split too far.** A sidecar must correspond to a kind: it exists **if and only if** the header has that kind. A one-to-one table that exists for _every_ header row, whatever its kind, is not this pattern. It splits a table for nothing, so merge it back into the header. Split exactly until impossible rows can't be written, and no further.

## 1.3 The id is the clock: no timestamp columns

**The rule.** Every primary key is a UUIDv7 that the database mints. A UUIDv7 starts with the time it was made, in milliseconds. So the id already records when the row was created, and sorting by id sorts by creation time. Do not add `created_at`, `updated_at` or any other timestamp column.

```ts
id: uuid("id").default(sql`uuidv7()`).notNull()
```

`uuidv7()` is built into PostgreSQL 18. On an older version, use an extension or the project's own generator.

**Refactor a timestamp column.**

- _Creation time:_ delete the column. Order with `ORDER BY id` (`DESC` for newest first). Read the time with `uuid_extract_timestamp(id)` on PostgreSQL 17+. Otherwise compute unix milliseconds with `('x' || substr(replace(id::text, '-', ''), 1, 12))::bit(48)::bigint`.
- _"Updated at" or a changing status:_ don't update the row in place. Append a new row for each change. The current state is the newest row: `SELECT DISTINCT ON (subject_id) … ORDER BY subject_id, id DESC`. To undo something, append another row; don't delete.
- _A time that isn't creation time_ (an expiry, a schedule, a third party's timestamp): store it as unix milliseconds in a `bigint` whose name says the unit (`expires_at_unix_ms`), or model the event as its own row, whose id is its time.

## 1.4 Constraint conventions

- **Name every constraint explicitly,** from the full table name: `<table>_pk`, `fk_<table>_<target>`, `<table>_<columns>_uq`, `<table>_<rule>_ck`. Sidecars inherit their header's name, so their constraints do too. Keep each name under Postgres's 63-byte limit.
- **Integer position columns** (a step's order within its parent) get `UNIQUE (parent_id, position)` and `CHECK (position >= 0)`.
- **Enums** use `pgEnum` with an exported `as const` array of values, so TypeScript types come from the array. When an enum mirrors a union in the app code, use exactly the same strings, so writes need no mapping.
- **Composite foreign keys** exist only to make invalid rows impossible: pinning a sidecar to its header's kind (1.2), or requiring a reference to point at a valid member. Never use one as an excuse to keep a redundant column (1.1).
- **Say in the doc comment** whether a row is append-only, replaced wholesale, or first-write-wins. If anything may overwrite it, name that caller.

## 1.5 Migrations

- **Never write or edit a generated migration file by hand:** not the SQL, the snapshots or the journal. Migration files are only ever drizzle-kit's output. A data backfill goes in a separate custom migration (`drizzle-kit generate --custom`).
- **Generate migrations only the way the project says.** Some projects have agents generate them; some have a person do it. Follow the project.
- **Never apply a migration, or push a schema, to a shared database** (preview, staging, production) unless the owner tells you to. A local throwaway database is fine when the project allows it.
- **If you find a hand-written or hand-edited migration file:** stop, tell the user, and don't commit it.

## 1.6 Register the table and document it

- Add a new table module wherever the project collects its schema, keeping that list in the project's existing order.
- The table's doc comment says:
  - what one row _is_;
  - how it is written (append-only, replaced wholesale, first-write-wins);
  - any column deliberately left out under 1.1;
  - any rule a writer must keep, including "the header and its sidecar are written together" (1.2).

## Part 1 audit (run all of it)

1. **List the tables:** `git diff origin/main --stat -- <schema directory>`. For each new or changed table, do the 1.1 check: list its keys, then for every other column ask what determines it. Remove each redundant column, and move its rule to the one writer.
2. **Look for several kinds of row in one table (1.2) on every changed table:**
   - Run `grep -rn "check(" <schema directory>`. For each CHECK, ask whether it ties one nullable column's presence to another column. If so, split the table.
   - Flag every enum `kind`/`type`/`status`/`outcome` column that sits beside nullable data columns and has no sidecars.
   - Flag every sidecar that pins its kind with `.default('<kind>')` plus a CHECK, and upgrade it to the generated column.
   - Check the reverse too: merge back any one-to-one table that doesn't correspond to a kind.
3. **Look for timestamp columns:** `grep -rn "timestamp\|createdAt\|created_at\|updatedAt\|updated_at" <schema directory>` must find nothing outside doc comments.
4. **Check the migrations:** `git diff origin/main -- <migrations directory>`. Every changed file must come from the project's migration workflow (1.5).
5. **Check the writers:** for each column removed under 1.1, confirm the writer checks its rule, fails with a named error, and has a test. For each header, confirm the header and its sidecar are written in one transaction.
6. **Run the project's typecheck and its full checks.** A schema change ripples into every query that touches the table.
7. **If any query changed, run Part 2's audit too.**

# Part 2: How a query is written

Each rule here prevents a bug that typechecks and then fails, or returns wrong data, at runtime. All nine are Drizzle and PostgreSQL facts. When the Drizzle version matters, check it against the one the project uses.

## 2.1 Interpolate real columns, never type a column name

**The rule.** Inside a `sql` template, every table, column and CTE field is an interpolated Drizzle object (`${orders.customerId}`), never the column's name typed as text (`"customer_id"`). Typed text keeps compiling after a rename and breaks only at runtime.

```ts
// BEFORE
sql`"customer_id" = ${customerId}`
// AFTER
sql`${orders.customerId} = ${customerId}`
```

**The only exception** is a name that exists only in SQL: the column names of a `VALUES` list, or a row variable passed to `to_jsonb`. Put that text in **one** small helper module (`valuesTable`, `valuesColumn`, `jsonbRow`, …) and call the helpers everywhere. Never write the text inline.

## 2.2 No hand-written subqueries: interpolate a query builder

**The rule.** Never write `(SELECT …)` or `(VALUES …)` as text inside a `sql` template. Interpolate a `db.select(...)` builder instead. Drizzle wraps it in parentheses and keeps it built from real columns.

```ts
// BEFORE
sql`${orders.total} > (SELECT avg(total) FROM orders)`
// AFTER
gt(orders.total, db.select({ average: avg(orders.total) }).from(orders))
```

`eq`, `lt`, `gt`, `inArray` and the other operators accept a builder subquery directly. Write a correlated subquery as `eq(column, db.select({ x: cte.field }).from(cte))`, not as text.

## 2.3 Give every CTE field a name unique within the whole statement

**The rule.** When you alias a field in a CTE (`.as("customer_id")`), Drizzle refers to it by that bare name in the rest of the query. If two CTEs in one query both define `customer_id`, Postgres fails with "column reference is ambiguous", even though it typechecks. Prefix every CTE field with its CTE's name.

```ts
// BEFORE: both CTEs expose customer_id
const recent = db
	.$with("recent")
	.as(db.select({ customerId: sql`${orders.customerId}`.as("customer_id") }).from(orders))
const flagged = db
	.$with("flagged")
	.as(db.select({ customerId: sql`${flags.customerId}`.as("customer_id") }).from(flags))

// AFTER: each name says which CTE it belongs to
const recent = db
	.$with("recent")
	.as(db.select({ recentCustomerId: sql`${orders.customerId}`.as("recent_customer_id") }).from(orders))
const flagged = db
	.$with("flagged")
	.as(db.select({ flaggedCustomerId: sql`${flags.customerId}`.as("flagged_customer_id") }).from(flags))
```

A camelCase key used only inside one CTE, for example to pack a JSON object, doesn't need the prefix.

## 2.4 Decode 64-bit integers to numbers

**The rule.** node-postgres returns `bigint` values, including every `count(*)` and every `sum(...)` of integers, as JavaScript **strings**. Writing `sql<number>` only changes the TypeScript type; at runtime the value is still the string `"42"`. Decode it one of these ways:

```ts
// BEFORE: typed number, actually "42"
const total = sql<number>`count(*)`

// AFTER: pick one
count() // Drizzle's count() decodes to a number
countDistinct(orders.customerId) // so does countDistinct()
sql`sum(${orders.quantity})`.mapWith(Number) // decode explicitly
sql<number>`count(*)::int` // cast in SQL when the value fits in 32 bits
sql<number>`(('x' || substr(replace(${orders.id}::text, '-', ''), 1, 12))::bit(48)::bigint)::float8` // a UUIDv7's milliseconds, exact below 2^53
```

Never write a bare `sql<number>` around anything that produces a `bigint`.

## 2.5 Join a one-row CTE; don't re-wrap its fields

**The rule.** Selecting a CTE field directly (`totals.orderCount`) keeps the decoder Drizzle attached to it, such as `count()`'s number decoding. Wrapping the field in a new `sql` template (`sql<number>\`${totals.orderCount}\``) drops the decoder. So when a CTE returns exactly one row (an aggregate, a `LIMIT 1`lookup, a`RETURNING`clause), join it into the final query on`true` and select its fields directly.

```ts
const totals = db.$with("totals").as(db.select({ totalsOrderCount: count() }).from(orders))

// BEFORE: the field is re-wrapped in a new template, so the count comes back as a string
db.with(totals).select({ id: customers.id, orderCount: sql<number>`${totals.totalsOrderCount}` }).from(customers).leftJoin(totals, sql`true`)

// AFTER: join on true and select the field itself
db.with(totals).select({ id: customers.id, orderCount: totals.totalsOrderCount }).from(customers).leftJoin(totals, sql`true`)
```

Use builder subqueries (2.2) for correlations inside other CTEs. Don't use them to project a one-row CTE into the final select.

## 2.6 One operation, one statement; read your own write through a union

**The rule.** When one logical operation needs several reads and writes, prefer **one statement**: a chain of CTEs (`WITH a AS (...), b AS (...) ...`) instead of several round trips. This matters most on hot paths. Use an explicit transaction where the project's rules require one, or where the steps can't be expressed as one statement.

**The trap.** Every CTE in a statement sees the database as it was **when the statement started**. A CTE that reads a table cannot see rows another CTE in the same statement just inserted. So when a later step must take the new row into account, read _the existing rows plus the new row_, never the table you just wrote:

```sql
WITH inserted AS (
	INSERT INTO completions (run_id, step_id) VALUES ($1, $2) RETURNING step_id AS inserted_step_id
),
effective AS (
	SELECT step_id AS effective_step_id FROM completions WHERE run_id = $1  -- rows from before this statement
	UNION
	SELECT inserted_step_id FROM inserted                                   -- the row this statement writes
)
SELECT count(*)::int = $3 AS run_complete FROM effective
```

Build the same shape with `db.$with(...)`. When several statements share it, give the union CTE one stable name, so a shared builder can supply it.

## 2.7 Use Drizzle's aggregate functions; cast a uuid to text before `min`/`max`

**The rule.** Drizzle ships `count()`, `countDistinct()`, `sum()`, `avg()`, `min()` and `max()`. Use them, not `sql\`max(...)\``. When the argument needs a cast, the cast goes *inside* the function: `max(sql\`${column}::text\`)`, not `sql\`max(${column}::text)\``.

**Postgres has no `min()` or `max()` for `uuid`.** `max(orders.id)` typechecks, then fails with `function max(uuid) does not exist`. Cast to text first. A uuid's text sorts the same way as its bytes, and a UUIDv7's bytes sort by time, so the text maximum is the newest row:

```ts
// BEFORE: fails at runtime
max(orders.id)
// AFTER
max(sql`${orders.id}::text`)
```

Compare the result with other ids cast to text, or cast it back with `::uuid` when it must join a uuid column. `ORDER BY` on a uuid works without a cast; only `min`/`max` are missing.

## 2.8 `SELECT DISTINCT` can only order by what it selects: remove duplicates at the source

**The rule.** With `SELECT DISTINCT`, Postgres requires every `ORDER BY` expression to be **exactly** one of the selected expressions. Even a cast makes them different: select `coalesce(x, 0)::int` and order by `coalesce(x, 0)`, and the query fails at runtime even though it typechecks. Don't fix it by copying the cast into `ORDER BY`; that ties the two together forever. Remove the reason for `DISTINCT` instead:

- if the duplicates come from a `unionAll`, use `union`;
- if you want one row per key, use `selectDistinctOn([key], …)` with that key leading the `ORDER BY`;
- otherwise remove duplicates in a grouped CTE, then select from it with a plain query, which may order by anything.

## 2.9 No `DISTINCT` inside a window function: count in a grouped subquery and join it back

**The rule.** Postgres does not support `DISTINCT` in window functions. `count(DISTINCT x) OVER (PARTITION BY k)` fails at runtime even though it typechecks. When a windowed query needs a per-partition distinct count, compute it in a grouped subquery and join it back:

```ts
// BEFORE: fails at runtime
sql<number>`count(DISTINCT ${events.userId}) OVER (PARTITION BY ${events.campaignId})`

// AFTER: count per campaign in a grouped subquery, join it to the rows
const reach = db
	.select({ reachCampaignId: events.campaignId, reachUsers: countDistinct(events.userId) })
	.from(events)
	.groupBy(events.campaignId)
	.as("reach")
db.select({ id: events.id, users: reach.reachUsers }).from(events).innerJoin(reach, eq(reach.reachCampaignId, events.campaignId))
```

When the partition isn't a single expression, use a nested `row_number()` instead. A line containing both `distinct` and `over (` is always wrong.

## 2.10 Reading a header and its sidecars (pairs with 1.2)

Read so that the type keeps what the schema guarantees:

- **When you already know the kind, inner-join its sidecar.** Its columns are NOT NULL, so they come back typed `T`, with no `as`, no `!` and no null check. The join also filters to that kind for free, because headers of other kinds have no row there. Prefer it to `WHERE kind = ...` when you want only that kind.
- **When a row may be any kind, left-join every sidecar and decode each row once, on `kind`.** Branch on the NOT NULL `kind` column a single time. Never work out the kind from which sidecar columns are null. That repeats what `kind` already says, and it silently decodes wrong once two kinds share a column name. Inside each branch, that kind's columns must be present; if one is missing, the header has no sidecar row, so throw instead of defaulting.

```ts
type Grading =
	| Readonly<{ kind: "automatic"; id: string; score: number }>
	| Readonly<{ kind: "manual"; id: string; graderId: string; comment: string }>

const rows = await db
	.select({
		id: gradings.id,
		kind: gradings.kind,
		score: gradingAutomaticResults.score,
		graderId: gradingManualReviews.graderId,
		comment: gradingManualReviews.comment
	})
	.from(gradings)
	.leftJoin(gradingAutomaticResults, eq(gradingAutomaticResults.gradingId, gradings.id))
	.leftJoin(gradingManualReviews, eq(gradingManualReviews.gradingId, gradings.id))

/** The one place a grading row becomes a Grading. A missing sidecar row is corruption, not a case. */
const gradingOf = (row: (typeof rows)[number]): Grading => {
	switch (row.kind) {
		case "automatic":
			if (row.score === null) throw new GradingSidecarMissing(row.id)
			return { kind: "automatic", id: row.id, score: row.score }
		case "manual":
			if (row.graderId === null || row.comment === null) throw new GradingSidecarMissing(row.id)
			return { kind: "manual", id: row.id, graderId: row.graderId, comment: row.comment }
	}
}
```

Use the project's own failure type in place of `GradingSidecarMissing`. In an Effect codebase, that means a tagged error, or a defect via `Effect.orDie`.

- **A sidecar shared by a set of kinds (1.2) needs care.** Inner-join it only when the query has already restricted rows to that set. Otherwise left-join it, and treat a missing row as "this row's kind isn't in the set".

## Part 2 audit (run all of it)

1. **Run the project's lint and typecheck.** Both must be clean.
2. **Run these searches over the query directory. Each hit is a fix, unless the note says to review it:**
   - `grep -rn '\`(select' <query directory>`: hand-written subqueries (2.2). Exclude the one helper module (2.1).
   - `grep -rn 'sql<number>' <query directory>`: review each. If it wraps anything that produces a `bigint`, decode it (2.4).
   - `grep -rn 'selectDistinct(' <query directory>`: if it has an `.orderBy`, every ordering expression must be exactly a selected one; prefer restructuring (2.8).
   - `grep -rni 'distinct.*over (' <query directory>`: always a bug (2.9).
   - `grep -rnE 'sql[<\`][^\`]_\`?(max|min|count|sum|avg)\(' <query directory>`: review each. It's a 2.7 violation only when Drizzle's function could express it. `count(_) FILTER (WHERE …)`, counts compared inside a predicate, and JSON or array aggregates have no Drizzle function; leave them as raw SQL, decoded per 2.4.
   - `grep -rn 'max(\|min(' <query directory>`: review each whose argument is a uuid column; it needs the `::text` cast inside (2.7).
3. **For every new or changed multi-CTE statement:** if you added a CTE to a shared builder, add it to every other statement that uses that builder. If the project counts statements per operation in tests, keep those counts from growing.
4. **For every new CTE:** confirm its field names are unique in every statement that uses it (2.3).
5. **For every read of a header with sidecars:** a known kind inner-joins its sidecar with no `as` or `!`, and a mixed read decodes once on `kind` (2.10). An `as` or `!` that overrides a nullable column a CHECK guarantees means the table needs 1.2. Fix the schema, not the read.
6. **Check the migrations:** a change that touches only queries adds no migration (1.5).

## Stop and rethink when you see

- **A `??`, a ternary in SQL construction, or an `as` added to quiet a type error around a query result.** The error is usually telling you a value isn't decoded the way you think (2.4, 2.5).
- **An `as` or `!` turning a CHECK-guaranteed column non-null.** The fix belongs in the schema (1.2), not at the read.
- **An `insert(...).select(...)`.** The select must list every column of the target table, in the table's column order, because the values map by position.
- **A test double for the database that returns rows as objects.** Drizzle asks node-postgres for rows as arrays (`rowMode: "array"`) for mapped selects, so fake rows must be arrays in select order.
- **Several places in one run inserting into a table keyed by `(run_id, something)`.** A later step that changes an earlier step's decision then inserts a duplicate key. Decide first, then write: collect the run's decisions in one in-memory map that later steps update, and insert the whole map once at the end.
