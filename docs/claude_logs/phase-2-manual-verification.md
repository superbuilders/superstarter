# Phase 2 — Manual Verification Checklist

Phase 2 (Real-item path) is autonomously complete: lint/typecheck green, the 55-item bootstrap dataset has been seeded against local Postgres, every row has an embedding, and pgvector cosine distances on same-sub-type pairs return sensible values. This file covers the manual checks that the autonomous run could not perform — admin-gate behavior under a live session, the form UX, and the API route under a real curl invocation.

Work top-to-bottom. Stop and report at the first failure.

---

## 0. Prerequisites

- [ ] Phase 1 verification passed (Google OAuth complete, `users` row exists, `sub_types` and `strategies` seeded).
- [ ] Local Postgres up: `docker compose ps` shows the `pgvector/pgvector:pg18` container healthy on port 54320.
- [ ] `.env` has `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` set with **real** keys (not the `sk-placeholder` from Phase 1) — the seed script and the form's Suggest button both call live APIs.

---

## 1. Bootstrap dataset present

If you haven't run the seed yet:

```bash
bun run db:seed:items
```

The script is idempotent — re-running it after an initial seed will skip every existing row and exit clean.

**The seed deliberately leaves `embedding=NULL` on every inserted row.** It runs as a raw Bun process outside Next.js, where the Workflow SDK's `"use workflow"` transform is unavailable, so the embedding-backfill workflow can't fire from this entry point. To populate embeddings, run the dedicated backfill script after seeding:

```bash
bun run scripts/backfill-missing-embeddings.ts
```

This script accesses the DB directly and calls `embedText` synchronously — no dev server required, no workflow runtime involved.

Verify in psql (`PGPASSWORD=postgres psql -h localhost -p 54320 -U postgres -d postgres`):

- [ ] `SELECT sub_type_id, difficulty, COUNT(*) FROM items GROUP BY sub_type_id, difficulty ORDER BY sub_type_id, difficulty;` returns 33 rows: every (`sub_type_id`, `difficulty`) cell across the 11 sub-types and 3 difficulties (easy/medium/hard) — 2/2/1 distribution per sub-type, 55 items total.
- [ ] After `bun run scripts/backfill-missing-embeddings.ts`: `SELECT COUNT(*) FROM items WHERE embedding IS NULL AND source = 'real';` → `0`.
- [ ] `SELECT id, jsonb_pretty(body), options_json FROM items LIMIT 3;` returns rows with `body` shaped as `{"kind": "text", "text": "..."}` and `options_json` as `[{"id": "A", "text": "..."}, ...]`.
- [ ] pgvector similarity sanity:

  ```sql
  SELECT a.id, b.id, (a.embedding <=> b.embedding) AS distance
  FROM items a, items b
  WHERE a.sub_type_id = 'verbal.synonyms'
    AND b.sub_type_id = 'verbal.synonyms'
    AND a.id < b.id
  ORDER BY distance LIMIT 5;
  ```

  Distances should be in a sensible range (autonomous run observed 0.32–0.43 for synonyms). All non-zero.

---

## 2. Admin gate denies non-admins

The admin allowlist in `src/config/admins.ts` ships **empty**. This is deliberate; until your email is added, every admin route is locked.

- [ ] `bun dev` starts on `http://localhost:3000`.
- [ ] Sign in with the Google account you used in Phase 1.
- [ ] Navigate to `http://localhost:3000/admin/ingest`. The page should render the layout shell with a single line: **"This area is admin-only."** No form, no error stack.
- [ ] Open the browser dev console — there should be no Next.js error boundary thrown to the user.

---

## 3. Admin gate allows allowlisted email

- [ ] Edit `src/config/admins.ts` and add your email (lowercase) to the `adminEmails` array. Save.
- [ ] Restart `bun dev` (the config is read at module-load time).
- [ ] **Sign out and sign back in.** The session needs to be re-issued so the gate sees the updated config; depending on your session shape, simply clearing `authjs.session-token` and re-signing-in is sufficient.
- [ ] Navigate to `http://localhost:3000/admin/ingest`. The form should render: question prompt textarea, 4 option rows, sub-type and difficulty selects, explanation textarea, Suggest + Submit buttons.

---

## 4. Ingest a single item via the form

Use a question that does **not** already exist in the seed dataset (so you can verify the new row separately).

Suggested test item:
- Prompt: `Choose the word that most nearly means OBSTINATE.`
- Options: `flexible`, `stubborn`, `cheerful`, `prompt`
- Correct answer: B (stubborn)

Steps:

- [ ] Type the prompt into the question textarea.
- [ ] Fill the four option rows with the texts above.
- [ ] Select the radio next to option B.
- [ ] (Don't pick sub-type/difficulty yet — leave them empty.)
- [ ] Click **Suggest**. Wait for the spinner to clear.
  - [ ] Sub-type select populates with a plausible value (likely `verbal.synonyms`).
  - [ ] Difficulty select populates with a plausible value (`easy`, `medium`, or `hard`).
  - [ ] Re-click Suggest after manually changing both fields — the form should NOT override your edits.
- [ ] Click **Ingest item**. Wait for the spinner to clear.
  - [ ] A green "Saved. Item id: …" line appears below the buttons.
  - [ ] The form clears (body, options, explanation, sub-type, difficulty all reset).
  - [ ] The "Last 1 ingested" list at the bottom shows the new item id.

Confirm the row in Postgres (replace `<id>` with the value from the success line):

- [ ] `SELECT id, sub_type_id, difficulty, status, source, embedding IS NOT NULL AS has_embedding FROM items WHERE id = '<id>';`
  - [ ] `status` is `live`.
  - [ ] `source` is `real`.
  - [ ] `has_embedding` is `t` within ~5 seconds of submission.

---

## 5. /api/admin/ingest-item route handler

The API route is for scripted bulk-ingest. It guards itself with `Authorization: Bearer ${CRON_SECRET}` and ignores session auth.

- [ ] **Without a token:**

  ```bash
  curl -i -X POST http://localhost:3000/api/admin/ingest-item \
    -H 'Content-Type: application/json' \
    -d '{}'
  ```

  Expect `401 unauthorized`.

- [ ] **With the wrong token:**

  ```bash
  curl -i -X POST http://localhost:3000/api/admin/ingest-item \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer not-the-real-secret' \
    -d '{}'
  ```

  Expect `401 unauthorized`.

- [ ] **With the right token but a malformed body:**

  ```bash
  curl -i -X POST http://localhost:3000/api/admin/ingest-item \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $CRON_SECRET" \
    -d '{"foo": "bar"}'
  ```

  Expect `400 schema validation failed` with an `issues` array.

- [ ] **With a valid payload:**

  ```bash
  curl -i -X POST http://localhost:3000/api/admin/ingest-item \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $CRON_SECRET" \
    -d '{
      "subTypeId": "verbal.synonyms",
      "difficulty": "easy",
      "body": {"kind": "text", "text": "Choose the word that most nearly means TIRED."},
      "options": [
        {"id": "A", "text": "exhausted"},
        {"id": "B", "text": "alert"},
        {"id": "C", "text": "bored"},
        {"id": "D", "text": "anxious"}
      ],
      "correctAnswer": "A",
      "explanation": "TIRED and exhausted are direct synonyms."
    }'
  ```

  Expect `201` with `{"itemId": "<uuid>"}`. Confirm in Postgres that the row is `live`/`real` with an embedding.

---

## 6. Pgvector similarity in the admin path

Quick sanity check that the embedding-backfill workflow is producing usable vectors:

- [ ] Pick two seeded items in the same sub-type (`SELECT id, body->>'text' FROM items WHERE sub_type_id = 'verbal.synonyms';`).
- [ ] `SELECT (a.embedding <=> b.embedding) FROM items a, items b WHERE a.id = '<id1>' AND b.id = '<id2>';` returns a number in roughly `[0.0, 1.0]`. Identical-text items would be near 0; semantically distinct items near 0.5+.

---

## Deferred / follow-up

- **More items.** The architecture plan calls for ~150 hand-seeded real items. The Phase 2 bootstrap intentionally ships 55 — enough to satisfy the diagnostic-mix's per-verbal (4) and per-numerical (5) minimums, plus a small margin. The remaining ~95 will be hand-authored via the ingest form during/after Phase 3.
- **Local PG pool memoization.** Phase 1 left a known issue under Turbopack hot-reload: every request re-creates the local pool (`creating local docker pg pool` log fires repeatedly). Folding `globalThis` memoization into `src/db/index.ts` and `src/db/admin.ts` was deferred — surface this before Phase 3 starts so the diagnostic flow doesn't pile up pools during dev iteration.
- **Dedicated admin API token.** The /api/admin/ingest-item route reuses `CRON_SECRET` for its bearer-token auth. This is fine for the seed script and one-off curl, but the moment a second consumer appears (e.g. a CI job), introduce `ADMIN_API_TOKEN` as a separate env var.

---

## Tag

After all checks pass:

```bash
git tag -a phase-2-complete -m "Phase 2: real-item ingest, embedding backfill, bootstrap dataset"
git push origin phase-2-complete
```
