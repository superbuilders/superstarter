# Feature Pipeline — Sub-Plan DAG

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each sub-plan.

**Design Doc:** `docs/plans/2026-02-23-feature-pipeline-design.md`
**Monolithic Plan:** `docs/plans/2026-02-23-feature-pipeline-plan.md`

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
05: Judge Configs ─┘──(only 10 needs this)   │                                 │
                                             ├──▶ 11: Implementation Orch. ────┤
06: Quality Gates ────(only 11 needs this)───┘                                 │
                                                                               │
12: PR Creation ──────────────────────────────────────────────────────────────-┘
```

## Execution Waves

| Wave | Sub-Plans | Notes |
|------|-----------|-------|
| 1 | 01, 02, 04, 05, 06, 07, 12 | All leaf nodes — no dependencies, build in any order |
| 2 | 03 | Needs 01 (Schema) |
| 3 | 08, 09, 10, 11 | All phase orchestrators — can build in parallel |
| 4 | 13 | Needs everything above |

## How to Read Each Sub-Plan

Each sub-plan has:
- **Dependencies** — which sub-plans must be done first
- **Produces** — what files/modules this creates
- **Contract** — the non-negotiable interface. Changing these breaks downstream sub-plans.
- **Internal** — what CAN be changed freely without affecting other sub-plans
- **Steps** — implementation steps
