# Feature Pipeline — Sub-Plan DAG (v2, post-review)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each sub-plan.

**Design Doc:** `docs/plans/2026-02-23-feature-pipeline-design.md`
**Monolithic Plan:** `docs/plans/2026-02-23-feature-pipeline-plan.md`
**Original sub-plans (pre-review):** `docs/plans/feature-pipeline/`

## Changes from v1

After review by 4 specialist agents + 1 grug-brain Mule, then grug-brain self-evaluation by all 4:

- **9 tables → 5.** Dropped `agent_steps`, `tool_calls`, `memory_records`, `sandbox_snapshots`. Steps/tool calls → jsonb on `agent_invocations`. Memories → jsonb on `feature_runs`.
- **10 enums → 5.** Dropped `finishReason`, `toolOutputType`, `memoryKind`, `snapshotStatus`, `agentType` (text column instead).
- **5 judges + meta-judge → 1 judge.** Start with 1 judge evaluating all criteria. Deterministic verdict aggregation. No meta-judge LLM call. Add specialist judges later if quality is insufficient.
- **`agent_invocations` slimmed** from 35 columns to ~15 + jsonb for raw data.
- **Removed `sandboxes.runId`** — eliminates circular FK.
- **`cta_events.invocationId` nullable** — master-fired CTAs have no invocation.
- **All DB writes use upsert semantics** — Inngest replay-safe.
- **PR creation uses GitHub API with env token** — not sandbox git push.
- **Gate order fixed:** typecheck → test → lint → build (functional before style).

## DAG

```
01: Schema ────────┐
                   ├──▶ 03: Persistence ─────┐
02: Event Contract ┤                         │
                   │                         ├──▶ 08: Analysis Orchestrator ────┐
04: Memory Tool ───┤                         │                                 │
                   │                         ├──▶ 09: Approaches Orchestrator ──┤
07: Phase Loop ────┤                         │                                 │
                   │                         ├──▶ 10: Judging Orchestrator ─────┼──▶ 13: Master Orchestrator
05: Judge Config ──┘──(only 10 needs this)   │                                 │
                                             ├──▶ 11: Implementation Orch. ────┤
06: Quality Gates ────(only 11 needs this)───┘                                 │
                                                                               │
12: PR Creation ──────────────────────────────────────────────────────────────-┘
```

## Execution Waves

| Wave | Sub-Plans | Notes |
|------|-----------|-------|
| 1 | 01, 02, 04, 05, 06, 07, 12 | All leaf nodes — build in any order |
| 2 | 03 | Needs 01 (Schema) |
| 3 | 08, 09, 10, 11 | Phase orchestrators — build in parallel |
| 4 | 13 | Needs everything above |
