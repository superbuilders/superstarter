// Shared "session is still alive" threshold.
//
// Three call sites must use this value in lockstep so the heartbeat
// contract stays consistent:
//
//   1. The abandon-sweep cron (`src/app/api/cron/abandon-sweep/route.ts`)
//      finalizes any practice_sessions row whose `last_heartbeat_ms` is
//      older than `now - ABANDON_THRESHOLD_MS` as `'abandoned'`.
//
//   2. `startSession` (`src/server/sessions/start.ts`) reads existing
//      in-progress rows for `(user_id, type, sub_type_id)` and treats a
//      `last_heartbeat_ms` within the threshold as "fresh-resume" (return
//      the existing sessionId verbatim). Past the threshold it finalizes
//      the stale row as `'abandoned'` synchronously and inserts a fresh
//      one — same UPDATE shape the cron writes.
//
//   3. Any future heartbeat consumer (e.g., a "still active?" badge in
//      the Mastery Map, a session-recovery banner) should import this
//      constant rather than redefining it.
//
// SPEC §7.12 originally wrote `120000` here; plan §7.3 corrected it to
// 5 minutes. Tighten or loosen the threshold here only — both consumers
// pick up the new value automatically. Plan §11 tracks a forward-looking
// note that Phase 5 may want to tighten this further once the
// post-completion-orphan path is closed.

const ABANDON_THRESHOLD_MS = 5 * 60_000
// Same grace window the abandon-sweep cron writes when finalizing
// stale rows: `ended_at_ms = last_heartbeat_ms + HEARTBEAT_GRACE_MS`.
// `startSession`'s stale-row finalization mirrors this so any
// downstream reader sees identical row state regardless of which path
// finalized it.
const HEARTBEAT_GRACE_MS = 30_000

export { ABANDON_THRESHOLD_MS, HEARTBEAT_GRACE_MS }
