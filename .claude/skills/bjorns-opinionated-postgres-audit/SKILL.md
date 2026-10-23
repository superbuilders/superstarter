---
name: bjorns-opinionated-postgres-audit
description: Apply when creating or modifying any Drizzle table schema on PostgreSQL, or writing, modifying or reviewing any Drizzle query. Two halves. Schema law covers strict BCNF, the ban on monomorphic discriminated-union tables (header plus typed sidecars instead), the uuidv7-only, no-timestamp law, constraint conventions and migration discipline. Query law covers nine rules (templated schema objects, builder subqueries, globally unique CTE aliases, int8 decoding, decoder-preserving joins, fused statements with effective-union reads, native aggregates with uuid casts, DISTINCT ordering, no windowed DISTINCT) plus sidecar read discipline. Invoke standalone to audit the current diff; each half's procedure cross-checks the other.
---

# Bjorn's Opinionated Postgres Audit

One skill, two halves. **Schema law** governs how relations are shaped. **Query law** governs how they are read and written. Both apply one principle, _representation first_:

- **Push each invariant into the relation and its inferred type,** so the compiler carries the proof. This is _parse, don't validate_: establish a fact once, structurally, instead of re-checking it at every consumer.
- **Make illegal states unrepresentable,** rather than representable but guarded.

The load-bearing fact behind most of schema law: **Drizzle infers a column's TypeScript type from its nullability alone.** CHECK constraints, triggers and conventions are invisible to it. A column a CHECK guarantees present still infers `T | null` at every read site, so every consumer must re-narrow it (a validation) or defeat the type with `as` / `!`. A NOT NULL column infers `T`, and an inner join carries a relation's non-nullability into the result type. That is a parse: the inferred signature is the enforced spec.

A schema change almost always ripples into queries, and a query change often exposes a schema defect. So a standalone invocation runs **both** audit procedures over the diff.

## Preconditions

This skill is project-neutral. Before applying it, establish:

1. Where the Drizzle table modules live, and which module aggregates them into the schema object.
2. Where the query modules live.
3. The project's migration workflow: who generates migrations, who applies them, and to which databases.
4. The project's own instructions (`CLAUDE.md`, `AGENTS.md`) and lint configuration. **Where they conflict with this skill, the project wins.**

Audit against the merge base: `git diff origin/main --stat`.

# Part I: Schema law

Every new or changed table passes all of these before it ships.

## I.1 Strict BCNF: analyze, don't guess

A relation is in **Boyce–Codd normal form** when every non-trivial functional dependency `X → A` has a superkey `X`. For every new or changed table, write down:

1. **Every candidate key:** the primary key, and every UNIQUE that is in fact a key.
2. **Every functional dependency (FD).** For each non-key attribute, ask whether it is determined by **each whole candidate key**, or instead by a proper subset of a key, another non-key attribute, or a parent row reached through a foreign key.
3. **Every violation:** any FD `X → A` where `X` is not a superkey. The attribute `A` is removed from this relation.

Put the analysis in the table's doc comment whenever a column was deliberately omitted.

**The two recurring violations.**

- **Parent-determined attributes** (transitive dependencies through a foreign key). A `lessons` row references `unit_id`, and `unit_id → course_id` holds in `units`, so `lessons.course_id` is redundant. The same applies when a column exists only to make a composite-FK membership check possible.
- **Derivable facts.** Never store an attribute that a stored key determines through joins. A run that stores `version_id` does not also store `course_id` if `version_id → course_id`. A closure table carries no denormalized "target" columns.

**Refactoring procedure.**

1. Drop the violating attribute.
2. Rewrite every reader to recover it by join along the dependency (`lessons ⋈ units`).
3. If the attribute enforced an invariant (for example, "the lesson's unit belongs to the run's course"), move the invariant to the relation's **single writer**. The writer asserts it before any write and fails with a named error. Unit-test the error.
4. Record the trade in the table's doc comment: which attribute was omitted, which FD makes it derivable, and which writer owns the invariant.

```ts
// VIOLATION: unit_id → course_id holds in units, so course_id is transitively dependent
export const lessons = pgTable("lessons", {
	id: uuid("id").default(sql`uuidv7()`).notNull(),
	unitId: uuid("unit_id").notNull(),
	courseId: uuid("course_id").notNull()
})

// BCNF: the course is recovered by joining units
/** One lesson of a unit. Its course is derivable (lessons ⋈ units) and is not stored. */
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

## I.2 Discriminated unions: header plus typed sidecars, never a monomorphic DU table

**The banned shape.** A _monomorphic discriminated-union (DU) table_ models a sum type as **one wide relation**. Each arm's columns are nullable, and a CHECK gates them on a discriminant. In the worse variant there is no discriminant at all, and the arm is inferred from the null pattern. Illegal states are representable and merely guarded: two arms' payloads set at once, a discriminant whose arm's payload is null, another arm's payload present. And because Drizzle ignores the CHECK, every read infers each payload column as `T | null`. The proof lives in Postgres and is thrown away before the compiler sees it.

**Detection.** Any of these makes a relation a monomorphic DU:

- a CHECK whose predicate gates one column's presence on another column's value: `(kind = 'automatic') = (score IS NOT NULL)`, or an XOR / all-null-or-all-set group;
- a cluster of nullable columns that are in practice all set together or all null together;
- a `kind` / `type` / `status` / `outcome` enum beside nullable payload columns, with no sidecars.

**The required shape.**

- **Header.**
  - It holds the NOT NULL discriminant (`kind`) and the facts common to **every** arm, all NOT NULL.
  - It carries `UNIQUE (id, kind)`. That constraint's only purpose is to be the composite-FK target for the sidecars, so one header row cannot acquire two conflicting arms.
- **One typed sidecar per payload-bearing arm.**
  - Its primary key is the header id.
  - Every payload column is NOT NULL. The only nullable columns allowed are _semantically honest optionals_, a field genuinely absent within that arm, and each one is justified in the doc comment.
  - It pins its arm with a **generated constant discriminant**, `kind: kindEnum("kind").generatedAlwaysAs(sql\`'<arm>'::<kind_enum>\`)`, plus a composite FK `(id, kind) → header (id, kind)`.
  - A generated column cannot be written, so a wrong-arm value is unrepresentable and no `CHECK (kind = '<arm>')` is needed. The FK proves the header agrees.
- **Payload-less arms get no sidecar.** A tombstone or empty arm's emptiness _is_ the absence of a sidecar row. Do not manufacture an empty relation for it.

**Naming.** A sidecar carries its header's **full stem**: the header's name in the singular, plus the arm noun. Header `gradings` has sidecars `grading_automatic_results` and `grading_manual_reviews`. A sidecar that shares only a domain prefix (`automatic_results`) is wrong, because it does not read as a specialization of its header.

**Completeness is deliberately conceded.** A composite FK enforces child → parent only, so an orphan header (its `kind` set, its sidecar row never written) is representable. Close it with **writer-transaction discipline**: the header and its sidecar are inserted in one transaction, by one writer. State this in the header's doc comment. Compile-time arm safety at every read site is worth far more than this one write-time invariant.

```ts
// BANNED: a monomorphic DU table, with the arms gated by a CHECK the type system cannot see
export const gradings = pgTable(
	"gradings",
	{
		id: uuid("id").default(sql`uuidv7()`).notNull(),
		kind: gradingKind("kind").notNull(),
		score: integer("score"), // arm: automatic
		graderId: uuid("grader_id"), // arm: manual
		comment: text("comment") // arm: manual
	},
	(t) => [check("gradings_arm_ck", sql`(${t.kind} = 'automatic') = (${t.score} IS NOT NULL)`)]
)

// REQUIRED: a header plus typed sidecars
export const GRADING_KINDS = ["automatic", "manual"] as const
export const gradingKind = pgEnum("grading_kind", GRADING_KINDS)

/** One grading of a submission: the discriminant and the facts every arm shares. Its arm's
 * payload lives in exactly one sidecar, inserted in the same transaction as this row. */
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

/** The automatic arm's payload, pinned to its arm by a generated discriminant. */
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

/** The manual arm's payload, pinned to its arm by a generated discriminant. */
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

**The generated-constant pin.**

- It supersedes the older `.default('<arm>')` plus `CHECK (kind = '<arm>')` idiom: a default is writable, a generated constant is not. Upgrade any sidecar still using the default form.
- Postgres accepts a generated column on the **referencing** side of a plain (`NO ACTION`) foreign key. It rejects only referential actions that would write the column (`ON UPDATE CASCADE`, `SET NULL`, `SET DEFAULT` onto it), and the pin carries none.
- On first adoption in a project, confirm the migration declares the column `STORED`, and apply it to a disposable database. The per-table fallback is the default-plus-CHECK form.

**Set-gated variance: the set-pin.** When a sidecar's presence is gated by a **multi-value** predicate (`outcome IN ('delivered', 'rejected')`) rather than one arm, a generated constant cannot pin it. The pin generalizes to the set:

- carry a real `kind` column on the sidecar;
- pin it with the same composite FK `(id, kind) → header (id, kind)`, so the copy cannot drift;
- add `CHECK (kind IN ('delivered', 'rejected'))`.

The sidecar now structurally cannot attach to a header outside the set. Only completeness (an in-set header implies a sidecar row) remains writer discipline, the same residue every DU carries. Key the sidecar by the header id alone, with no `kind` column, only when the header lacks a usable `UNIQUE (id, kind)` target. In either case, name the completeness guarantee in the doc comment, and never invent a fake discriminant; the set-pin uses the real one.

**The decomposition limit: do not over-decompose.** A _mandatory_ 1:1 sidecar, present for every header row, adds no FD and encodes no arm. It is pointless decomposition, and it collapses back into its parent: one relation, one key, no new FDs. The test that separates the two cases: **does the sidecar correspond to an arm, present if and only if `kind = X`?** If yes, split. If it is always-present metadata, left over from a formerly shared or polymorphic parent, collapse it. Decompose exactly until illegal states vanish, and no further.

**Migration procedure.** Create the header and sidecars, backfill them from the wide table in a custom migration, cut every reader (II.10) and writer over, then drop the wide columns. It is a hard cutover: no dual reads.

## I.3 uuidv7 ids are the clock: no timestamp columns

Every primary key is a database-minted UUIDv7: `id: uuid("id").default(sql\`uuidv7()\`).notNull()`, with a `<table>_pk`constraint.`uuidv7()` is built into PostgreSQL 18; on older versions, use an extension. A UUIDv7's leading 48 bits are a big-endian Unix-millisecond timestamp, so:

- `ORDER BY id` is creation order, served by the primary-key index;
- the creation instant is `uuid_extract_timestamp(id)` on PostgreSQL 17+, or as Unix milliseconds, `('x' || substr(replace(id::text, '-', ''), 1, 12))::bit(48)::bigint`.

**Never add `created_at`, `updated_at` or any timestamp column.**

- **Append-only ledgers get correctness from facts, not mutation timestamps.**
- **The current outcome is the latest header by uuidv7 id:** `SELECT DISTINCT ON (subject_id) … ORDER BY subject_id, id DESC`. This is the append-only analogue of an updatable status column. Recover by appending a new header, never by deleting or updating.
- **A non-creation time** (an expiry, a schedule, a source system's claimed time): store Unix milliseconds in a `bigint` named for its unit (`expires_at_unix_ms`), or model the event as its own row, whose id is its time.

## I.4 Constraint conventions

- **Every constraint is named explicitly,** from the full table name: `<table>_pk`, `fk_<table>_<target>`, `<table>_<columns>_uq`, `<table>_<rule>_ck`. Sidecars inherit their header's stem, so their constraint names do too. Every name stays under Postgres's 63-byte identifier limit.
- **Ordinal columns** get `UNIQUE (parent_id, position)` and `CHECK (position >= 0)`.
- **Enums** are `pgEnum` with an exported `as const` values array, so types derive from the array. Enum names carry no prefixes from dead models. When a header's `kind` enum mirrors an application-side union, the token strings are identical, so writes need no mapping.
- **Composite FKs are for key references that make invalid states unrepresentable:** the discriminant pin of I.2, and membership references (a citation pointing at a valid member's key). They are never for smuggling a redundant column past BCNF (I.1).
- **The doc comment states the write semantics:** first-write-wins or overwrite. An overwrite exception names its sanctioned caller.

## I.5 Migration discipline

- **Migration files are drizzle-kit output only.** Never hand-write or hand-edit anything in the migrations directory: SQL, snapshots or the journal. Backfills and data migrations go in a separate `drizzle-kit generate --custom` migration.
- **Generation follows the project's workflow.** Some projects have agents generate migrations (dry-run with `--explain` first); others reserve it for a person.
- **Applying is human-owned.** Never run `drizzle-kit migrate`, `push` or the project's migrate command against a shared database (preview, staging, production). A local disposable database is acceptable where the project allows it.
- **If a hand-written or hand-edited migration file appears:** stop, surface it, and do not commit it.

## I.6 Registration and doc comment

- A new table module registers in the project's schema aggregate, in that aggregate's existing order.
- The doc comment states:
  - what one row **is**;
  - the write discipline (append-only, wipe-and-replace, first-write-wins);
  - the BCNF analysis whenever a column was deliberately omitted;
  - every writer-owned invariant, including header-to-sidecar completeness (I.2).

## Part I audit procedure (run all of it when invoked standalone)

1. **Enumerate the tables:** `git diff origin/main --stat -- <schema directory>`. Run the I.1 FD analysis on each new or changed relation.
2. **Run the DU analysis (I.2) on each new or changed relation.** Is it a sum type? Apply the detection rules, then decompose into header plus typed sidecars, or set-pinned sidecars for set-gated arms. Then check the inverse: collapse any mandatory 1:1 sidecar that encodes no arm. Seed searches:
   - `grep -rn "check(" <schema directory>`: review each CHECK for a presence-gating, cross-column predicate over nullable columns.
   - Flag any `kind` / `type` / `status` / `outcome` enum that coexists with nullable payload columns and has no sidecar.
   - Flag any sidecar still pinning its arm with `.default('<arm>')` plus `CHECK (kind = '<arm>')`, and upgrade it to the generated-constant pin.
3. **Search for timestamp columns:** `grep -rn "timestamp\|createdAt\|created_at\|updatedAt\|updated_at" <schema directory>` must return nothing outside doc-comment prose.
4. **Check the migrations:** `git diff origin/main -- <migrations directory>`. Every changed file is drizzle-kit output produced through the project's workflow. A hand-written or hand-edited migration is an incident.
5. **Check writer obligations:** for each column dropped for BCNF, confirm the writer asserts its invariant before any write, with a named error and a unit test. For each DU header, confirm the header and its sidecar are inserted in one transaction.
6. **Run the project's typecheck and full gate.** A schema change ripples into the schema aggregate and every query touching the relation.
7. **Cross-check with Part II** whenever a query changed alongside the schema, especially sidecar reads (II.10).

# Part II: Query law

Nine laws, then the read discipline for discriminated unions, then the audit procedure. These are not style preferences. Each one closes a class of defect that typechecks and then fails, or returns wrong data, at runtime. They are Drizzle and PostgreSQL rendering facts; re-verify any that depend on version against the version the project pins.

## II.1 Template schema objects, never identifier text

Inside a `sql` template, every table, column and CTE field is an **interpolated schema or CTE object** (`${orders.customerId}`), never identifier text (`"customer_id"`). Identifier text survives a rename silently and fails only at runtime.

```ts
// VIOLATION
sql`"customer_id" = ${customerId}`
// CORRECT
sql`${orders.customerId} = ${customerId}`
```

The one sanctioned exception is an identifier that exists only in SQL: `VALUES`-list column aliases, and row variables passed to `to_jsonb`. Confine that text to **one** helper module (`valuesTable`, `valuesColumn`, `jsonbRow`, `jsonbAggRows`, …) and call its helpers. Never inline an equivalent.

## II.2 No raw `(select …)` or `(values …)` strings: interpolate builders

A `db.select(...)` builder interpolated into a `sql` template is auto-parenthesized into a proper **scalar subquery**, built from column objects end to end. A correlated subquery is `eq(column, db.select({ x: cte.field }).from(cte))`, never template text. `eq`, `lt`, `gt` and `inArray` all accept `SQLWrapper` subqueries.

```ts
// VIOLATION
sql`${orders.total} > (SELECT avg(total) FROM orders)`
// CORRECT
gt(orders.total, db.select({ average: avg(orders.total) }).from(orders))
```

## II.3 Globally unique CTE field aliases per statement

Drizzle renders an aliased CTE field by its **bare alias**. If two CTEs in one join scope both define `customer_id`, Postgres raises a runtime "column reference is ambiguous" error that typechecks fine. Namespace every CTE's fields with the CTE's name (`recent_*`, `flagged_*`, `served_*`, …), and choose the names up front.

```ts
// VIOLATION: both CTEs expose the bare alias customer_id
const recent = db
	.$with("recent")
	.as(db.select({ customerId: sql`${orders.customerId}`.as("customer_id") }).from(orders))
const flagged = db
	.$with("flagged")
	.as(db.select({ customerId: sql`${flags.customerId}`.as("customer_id") }).from(flags))

// CORRECT: aliases namespaced per CTE
const recent = db
	.$with("recent")
	.as(
		db
			.select({ recentCustomerId: sql`${orders.customerId}`.as("recent_customer_id") })
			.from(orders)
	)
const flagged = db
	.$with("flagged")
	.as(
		db
			.select({ flaggedCustomerId: sql`${flags.customerId}`.as("flagged_customer_id") })
			.from(flags)
	)
```

camelCase aliases are exempt only as JSONB-packing keys consumed strictly within their own CTE's scope.

## II.4 The int8 decode law

node-postgres parses `int8` (OID 20) as a JavaScript **string**, to avoid silent precision loss past 2^53. So every `count(*)`, every integer `sum(...)` and every `bigint` column arrives as a string. A raw `sql<number>` fragment has a **no-op decoder**: the annotation is a type lie. Decode by one of these:

```ts
// VIOLATION: typed number, decoded as the string "42"
const total = sql<number>`count(*)`

// CORRECT
count() // Drizzle's count() carries mapWith(Number)
countDistinct(orders.customerId) // so does countDistinct()
sql`sum(${orders.quantity})`.mapWith(Number) // an explicit decoder
sql<number>`count(*)::int` // an in-SQL cast, for true counts
sql<number>`(('x' || substr(replace(${orders.id}::text, '-', ''), 1, 12))::bit(48)::bigint)::float8` // uuidv7 millisecond math, exact below 2^53
```

Never write a bare `sql<number>` over an int8 producer.

## II.5 One-row CTEs join; they don't re-project

A **direct** CTE-field reference in an outer `.select({...})` preserves the field's decoder. Re-projecting it through a fresh `sql` template destroys the decoder. So one-row CTEs (aggregates, `LIMIT 1` probes, `RETURNING` CTEs) are joined into the final select `ON true`, with direct field references.

```ts
const totals = db.$with("totals").as(db.select({ totalsOrderCount: count() }).from(orders))

// VIOLATION: re-projected through a fresh template, so count()'s decoder is lost
db.with(totals)
	.select({ id: customers.id, orderCount: sql<number>`${totals.totalsOrderCount}` })
	.from(customers)
	.leftJoin(totals, sql`true`)

// CORRECT: a direct field reference keeps the decoder
db.with(totals)
	.select({ id: customers.id, orderCount: totals.totalsOrderCount })
	.from(customers)
	.leftJoin(totals, sql`true`)
```

Builder scalar subqueries (II.2) are for correlations inside other CTE bodies, not for final-select projection of a joinable one-row CTE.

## II.6 Fused statements and the effective-union discipline

**One logical operation is one statement:** a `WITH` chain rather than several round trips, especially on hot paths. Use an explicit transaction where the project requires one, or where the operation cannot be expressed as one statement.

**Snapshot semantics.** All sub-statements of a `WITH` chain, data-modifying CTEs included, execute against the **same snapshot**, taken at statement start. Sibling CTEs cannot see one another's effects on the target tables. So a predicate evaluated after a write must read the **effective union**, _existing facts ∪ the row being written_, through a CTE under a stable name. It must never read the table the statement just wrote.

```sql
WITH inserted AS (
	INSERT INTO completions (run_id, step_id) VALUES ($1, $2) RETURNING step_id AS inserted_step_id
),
effective_completions AS (
	SELECT step_id AS effective_step_id FROM completions WHERE run_id = $1  -- the pre-statement snapshot
	UNION
	SELECT inserted_step_id FROM inserted                                   -- the row this statement writes
)
SELECT count(*)::int = $3 AS run_complete FROM effective_completions
```

Build the same shape with `db.$with`. Make the effective-union CTE injectable under a stable name, so every statement built from a shared builder reads the same source.

## II.7 Native aggregates; cast a uuid first, inside the function

Drizzle ships `count()`, `countDistinct()`, `sum()`, `avg()`, `min()` and `max()`. Use them, never a raw `sql\`max(...)\``. When the argument needs a cast, the raw SQL goes **inside** the function: `max(sql\`${column}::text\`)`, never `sql\`max(${column}::text)\``.

**PostgreSQL defines no `min` or `max` aggregate over `uuid`.** `max(orders.id)` typechecks, then throws `function max(uuid) does not exist`. Cast first. uuid text sorts identically to uuid byte order, and uuidv7 byte order is time order, so the text maximum is the latest row.

```ts
// VIOLATION: runtime error
max(orders.id)
// CORRECT
max(sql`${orders.id}::text`)
```

Compare the result with other `::text`-cast ids, or cast the scalar back with `::uuid` where it must join a uuid column. `selectDistinctOn(...).orderBy(desc(orders.id))` needs no cast: `ORDER BY` over uuid is defined, and only the `min`/`max` aggregates are missing.

## II.8 `SELECT DISTINCT` orders only by its own select list: dedupe at the source

Postgres rejects a `SELECT DISTINCT` whose `ORDER BY` expressions are not **identical** to members of the select list, and a decoder cast is enough to break identity. Selecting `coalesce(x, 0)::int` while ordering by `coalesce(x, 0)` is a runtime error that typechecks fine. Never patch it by duplicating the cast into `ORDER BY`; the select list and the ordering would then have to co-evolve forever. Remove the need for `DISTINCT` at the boundary, and dedupe at the **source**:

- `union` instead of `unionAll` when the union legs are the duplication;
- `selectDistinctOn([key], …)`, with `key` leading the `ORDER BY`, when you want one row per key;
- a grouped CTE otherwise. A plain outer select may then order by anything.

## II.9 No `DISTINCT` inside window aggregates: spread via a grouped join

Postgres does not implement `DISTINCT` for window functions. `count(DISTINCT x) OVER (PARTITION BY k)` is a runtime error that typechecks fine. When a windowed query needs a per-partition distinct count, compute it in a **grouped subquery** on the partition key and join it back onto the windowed rows. Use the nested `row_number()` idiom when the key is not a single expression.

```ts
// VIOLATION: runtime error
sql<number>`count(DISTINCT ${events.userId}) OVER (PARTITION BY ${events.campaignId})`

// CORRECT: a grouped subquery on the partition key, joined back
const reach = db
	.select({ reachCampaignId: events.campaignId, reachUsers: countDistinct(events.userId) })
	.from(events)
	.groupBy(events.campaignId)
	.as("reach")
db.select({ id: events.id, users: reach.reachUsers })
	.from(events)
	.innerJoin(reach, eq(reach.reachCampaignId, events.campaignId))
```

`distinct` and `over (` on the same line is always wrong.

## II.10 Reading discriminated unions (pairs with I.2)

Read a header and its typed sidecars so that the proof survives into the result type:

- **Known arm: inner-join the sidecar.** When the statement has already selected one arm, inner-join its sidecar and reference the payload columns directly. They infer NOT NULL: no re-narrowing, no `as`, no `!`.
- **The join is the arm filter.** Inner-joining a payload-bearing sidecar restricts to that arm for free, because a header of any other arm has no row there. Prefer the join to an explicit `WHERE kind = …` when you want only that arm.
- **Union boundary: left-join every sidecar and decode once, on the discriminant.** Where a row may be any arm, left-join every sidecar and branch on the NOT NULL `kind` **a single time**, at the boundary that turns rows into a domain union. Never decode by an N-column `!== null` conjunction across the joined sidecars. That re-derives the discriminant the header already states, and it silently mis-decodes the day two arms share a nullable column name. Within an arm's branch, a missing payload column means an orphan header (I.2), which is a defect: fail loudly, never default.

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

/** The union boundary: each row decodes once, on its discriminant. An absent payload is an
 * orphan header, a defect. */
const gradingOf = (row: (typeof rows)[number]): Grading => {
	switch (row.kind) {
		case "automatic":
			if (row.score === null) throw new OrphanGradingHeader(row.id)
			return { kind: "automatic", id: row.id, score: row.score }
		case "manual":
			if (row.graderId === null || row.comment === null) throw new OrphanGradingHeader(row.id)
			return { kind: "manual", id: row.id, graderId: row.graderId, comment: row.comment }
	}
}
```

Substitute the project's failure representation for `OrphanGradingHeader`. In an Effect codebase, that is a tagged error, or a defect via `Effect.orDie`.

- **Set-pinned sidecars carry the same guarantee for their set.** A sidecar keyed by the header id alone (present iff `outcome IN (…)`, with no FK pin) carries a weaker one: inner-join it only when the surrounding predicate already restricts to that set. Otherwise left-join it, and treat absence as "not in the set".

## Part II audit procedure (run all of it when invoked standalone)

1. **Run the project's lint and typecheck.** Both must be clean.
2. **Searches.** Each hit is a fix unless marked "review":
   - `grep -rn '\`(select' <query directory>`, excluding the identifier helper module (II.1): raw scalar subqueries (II.2).
   - `grep -rn 'sql<number>' <query directory>`: review each hit for an int8 producer without a decoder (II.4).
   - `grep -rn 'selectDistinct(' <query directory>`: if a hit carries `.orderBy`, every `ORDER BY` expression must be an identical select-list member, casts included. Prefer restructuring per II.8.
   - `grep -rni 'distinct.*over (' <query directory>`: a windowed `DISTINCT` is always a runtime error (II.9).
   - `grep -rnE 'sql[<\`][^\`]_\`?(max|min|count|sum|avg)\(' <query directory>`: review raw-SQL aggregate heads. A hit violates II.7 only when the native function could express it. `count(_) FILTER (WHERE …)`, count comparisons inside predicates, and JSONB or array aggregates have no native form; they stay raw, decoded per II.4.
   - `grep -rn 'max(\|min(' <query directory>`: review each hit whose argument is a uuid column object. It needs the `::text` cast inside (II.7).
3. **For every new or changed fused statement:**
   - if a CTE was added to a shared builder, add it to every `WITH` list that must carry it (search the builder's other consumers);
   - verify the statement-count budget did not regress, where the project asserts one in tests.
4. **For every new CTE:** confirm its field aliases are globally unique in every statement that joins it (II.3).
5. **For every read of a discriminated union:**
   - known-arm reads inner-join the sidecar, with no `as` or `!` re-narrowing;
   - union-boundary reads decode once on the NOT NULL discriminant, never by an N-column `!== null` conjunction (II.10);
   - an `as` or `!` defeating a CHECK-guarded nullable is a schema smell; route it back to I.2.
6. **Check the migrations:** `git diff origin/main -- <migrations directory>` contains only workflow-generated migrations for this branch's schema changes. A query-only change never adds a migration (I.5).

## Red flags: stop and re-derive

- **A `??`, an inline ternary in SQL construction, or an `as` cast appearing to "fix" a type error around a query result.** The type error is reporting a decoder problem (II.4, II.5).
- **An `as` or `!` re-narrowing a column to non-null that a CHECK already guarantees.** Drizzle infers types from nullability only, so a CHECK-guarded column reads `T | null` regardless. The fix is schema-side (a NOT NULL typed sidecar, I.2), not a cast at the read.
- **An `insert(...).select(...)`.** The select must list every column of the target table, in definition order: the mapping is positional.
- **A scripted-driver test returning object rows.** Drizzle requests `rowMode: "array"` for mapped selects, so fixtures must be positional arrays in select order.
- **A writer inserting into a relation with a per-run unique key (`(run_id, evidence_id)`) from more than one call site in the same run.** A later phase repointing an earlier phase's row duplicates the key. Use _decide, then write_: accumulate the run's decisions in one in-memory plan (a `Map<key, value>` that later phases mutate), and insert the whole plan exactly once at the end.
