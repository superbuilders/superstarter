# Skills Alignment: Agent Architecture vs. `.agents/skills/`

**Date:** 2026-02-19
**Purpose:** Cross-reference the project's `.agents/skills/` directory against the agent architecture and foundation plan to identify what is aligned, what conflicts with project conventions, what is missing, and how skills should be delivered to agents at runtime.

---

## Executive Summary

The project has 8 skill directories. Six are directly relevant to dashboard implementation. One (`turborepo`) is actively irrelevant and should be excluded from agent discovery. Four conflicts exist between skill content and enforced project rules — all resolvable with explicit override notes in agent system prompts. Four skill gaps exist, one of which is high-priority: no skill covers Inngest Realtime SSE consumption wired into the RSC promise-passing pattern, which is the most critical implementation surface in the Live Workflow Viewer.

The `readConventionsTool` scope should stay narrow (`CLAUDE.md` + `rules/*.md` only). Skills are task-specific and expensive at scale — inject them at agent factory time, not on every tool call.

---

## Skills Inventory

| Skill Directory | Description | Relevance |
|---|---|---|
| `web-design-guidelines` | Web UI compliance checker | Peripheral — design token enforcement overlaps with `bun style` |
| `find-skills` | Meta-skill for discovering other skills | Infrastructure — used by agents to discover what skill files exist |
| `next-best-practices` | 15+ sub-files: RSC boundaries, async patterns, data patterns, error handling, metadata, file conventions, suspense, parallel routes | High — directly covers the page/content RSC pattern |
| `next-cache-components` | PPR, `use cache` directive, `cacheLife`, `cacheTag`, `updateTag` | High — architecture cache strategy maps directly to these APIs |
| `turborepo` | Monorepo build system configuration and patterns | IRRELEVANT — this is a single-app repo, not a monorepo |
| `vercel-composition-patterns` | React composition: compound components, boolean prop avoidance | High — plan review, judge management, and list views |
| `vercel-react-best-practices` | 57 performance optimization rules | High — live streaming components, derived state, memo patterns |
| `building-components` | Accessible, composable UI component patterns | Medium — aria patterns for live agent activity feeds |

---

## Skills Relevant to Dashboard Implementation

| Dashboard View | Relevant Skill | Specific Pattern |
|---|---|---|
| All views (`page.tsx` + `content.tsx`) | `next-best-practices/rsc-boundaries.md` | Async client component detection, non-serializable props |
| All views | `next-best-practices/async-patterns.md` | `params` as `Promise<{}>` (Next.js 15+) |
| Dashboard Home (`/agents`) | `next-cache-components` | `'use cache'` + `cacheLife('minutes')` for recent runs list — directly matches architecture cache strategy |
| All list views | `next-best-practices/data-patterns.md` | Avoiding waterfalls via `Promise.all` + Suspense |
| Live Workflow Viewer | `vercel-react-best-practices` | Async suspense boundaries — stream progressively |
| Plan Review + Implementation Review | `vercel-composition-patterns` | Avoid boolean prop proliferation for approve/feedback/rework modes |
| Judge Management CRUD | `vercel-composition-patterns` | Compound component pattern for list + edit + toggle |
| Any realtime component | `vercel-react-best-practices` | `rerender-derived-state-no-effect`, `rerender-dependencies`, `rerender-memo` |
| Accessibility | `building-components` | `aria-live="polite"` for routine events, `aria-live="assertive"` for errors, roving focus |

---

## Skill-Project Conflicts

Four conflicts exist between skill content and enforced project conventions. All are resolvable. None require modifying the skills themselves — they require explicit override notes in the implementer agent system prompt.

### Conflict 1: `next-cache-components` vs. `rsc-data-fetching-patterns.md`

**Skill says:** Cached components are written as `async function` server components.

**Project rule says:** `rsc-data-fetching-patterns.md` bans `async` server components categorically.

**Actual scope of the project rule:** The ban targets page-level server components — the entry point that orchestrates data fetching and passes promises down. The rule exists to prevent waterfall blocking at the page boundary.

**Resolution:** Cached sub-components can be `async` — they are not page-level orchestrators. The architecture's 3-tier model (static shell + cached sub-components + dynamic streams) explicitly relies on async cached sub-components. This distinction must be stated in the implementer agent system prompt: "The `async` RSC ban applies to `page.tsx` only. Cached sub-components used inside Suspense boundaries may be `async`."

---

### Conflict 2: `vercel-composition-patterns` vs. `no-object-module.md`

**Skill says:** Compound components use dot-notation (`Composer.Frame()`, `Composer.Header()`).

**Project rule says:** `no-object-module.md` bans object namespaces — objects containing only functions.

**Resolution:** Use named ESM exports instead of dot-notation. The composition pattern is valid; only the export mechanism changes. `ComposerFrame` and `ComposerHeader` as separate named exports achieve identical composability without the object namespace. Agent system prompt note: "Apply compound component composition patterns from `vercel-composition-patterns`, but export each component as a named ESM export rather than as dot-notation properties of a parent object."

---

### Conflict 3: `next-best-practices/data-patterns.md` vs. `rsc-data-fetching-patterns.md`

**Skill says:** `async function Dashboard()` with `await Promise.all(...)` — shows awaiting at the page level.

**Project rule says:** No `async` pages. Pass promises down via `.then()`. Never `await` in page components.

**Resolution:** Project rule wins. The skill represents the framework minimum — the project's RSC pattern goes further to enable full streaming. Frame it in the system prompt as: "The `data-patterns` skill shows the framework baseline. The project's `rsc-data-fetching-patterns.md` rule is stricter and takes precedence: no `await` in page components, chain with `.then()`, pass promises as props."

---

### Conflict 4: `next-best-practices/rsc-boundaries.md` vs. `rsc-data-fetching-patterns.md`

**Skill says:** "Only Server Components can be async" — implying async RSC is valid at page level.

**Project rule says:** Stricter. Page-level server components must not be `async` regardless of framework capability.

**Resolution:** Project rule overrides the framework default. System prompt note: "The framework permits async RSC; the project prohibits async page-level RSC. `rsc-data-fetching-patterns.md` is the authoritative source."

---

## Missing Skills

Four gaps exist between what the skills cover and what the architecture requires. Listed by priority.

### Gap 1 (Highest Priority): Inngest Realtime SSE in RSC Promise-Passing Pattern

**What is missing:** No skill covers how to wire an Inngest Realtime subscription into the RSC promise-passing pattern.

**Why it matters:** The Live Workflow Viewer is the most novel and highest-risk component in the dashboard. It must stream agent step events via Inngest's SSE subscription API (`inngest.useRealtimeSubscription` or equivalent) inside a `React.use()`-consuming client component, behind a Suspense boundary, while the page component passes the subscription handle as a prop. No existing skill addresses this intersection.

**Consequence of the gap:** An implementer agent without this guidance will either (a) use `useEffect` + `useState` instead of the RSC streaming model, losing the architectural coherence, or (b) break the `async` page ban trying to initialize the subscription server-side.

**Recommended action:** Author a `inngest-realtime-rsc` skill before assigning the Live Workflow Viewer task to an implementer agent.

---

### Gap 2: Server Actions with `revalidateTag`

**What is missing:** `next-best-practices/data-patterns.md` shows `revalidatePath` for cache invalidation after mutations. The architecture specifies tag-based revalidation (`revalidateTag`) paired with the `cacheTag` API from `next-cache-components`.

**Why it matters:** Using `revalidatePath` invalidates entire route caches. Using `revalidateTag` + `cacheTag` enables surgical invalidation of only the affected cached sub-components. The architecture's cache strategy is designed around the latter.

**Recommended action:** Author a `server-actions-revalidation` skill that shows the full mutation loop: server action calls `revalidateTag(tag)`, cached component is decorated with `cacheTag(tag)`, Suspense boundary re-streams the updated sub-tree.

---

### Gap 3: `aria-live` Patterns for Realtime Data Streams

**What is missing:** `building-components` covers general accessibility patterns. No skill covers `aria-live` region management specifically for continuously updating agent activity streams.

**Why it matters:** The architecture has explicit accessibility requirements for live agent activity feeds. The key distinction — `aria-live="polite"` for routine step completions vs. `aria-live="assertive"` for errors and interruptions — is not documented anywhere in the skill set.

**Recommended action:** Extend `building-components` with a section on live region management for streaming data, or author a focused `aria-live-streams` skill.

---

### Gap 4: PPR Composition (Static Shell + Cached Sub-Components + Dynamic Streams)

**What is missing:** The architecture describes a 3-tier content model. No single skill demonstrates the full composition: a static shell page component, cached async sub-components inside it, and dynamic Suspense-streamed client components beneath those.

**Why it matters:** The individual pieces exist across `next-cache-components` and the project's `rsc-data-fetching-patterns.md`. The compositional pattern — how all three tiers nest together correctly — is not demonstrated end-to-end anywhere.

**Recommended action:** Author a `ppr-composition` skill that shows the full 3-tier nesting with concrete examples of each layer's responsibilities.

---

## `readConventionsTool` Scope Recommendation

**Recommendation: Keep as-is. `readConventionsTool` reads `CLAUDE.md` + `rules/*.md` only. Do not add skills to this tool.**

| Factor | Analysis |
|---|---|
| Token cost per tool call | Skills add 200,000–250,000 tokens per invocation |
| Explorer parallelism | Explorer runs 6 times in parallel during onboarding — adding skills multiplies cost by 6 |
| Convention vs. skill distinction | Conventions are INVARIANT project constraints. Skills are TASK-SPECIFIC implementation knowledge. |
| Relevance per slice | The `structure` slice explorer has no use for React composition patterns. The `db` slice explorer has no use for `aria-live` patterns. |
| Correct mental model | `readConventionsTool` answers "what are the rules?" Skills answer "how do I implement this feature?" |

Skills injected into every slice via `readConventionsTool` would be noise for 5 of 6 explorer slices and would massively inflate token cost with no benefit. The separation is correct.

---

## Skill Delivery Strategy

Skills should be delivered at agent factory time, not at tool call time.

### Option A: `injectSkillContext` Helper (Recommended)

Create a `injectSkillContext(skillNames: string[]): string` helper in `scripts/agents/` that reads specified SKILL.md files and returns concatenated content for inclusion in agent system prompts.

```typescript
// scripts/agents/skill-context.ts
function injectSkillContext(skillNames: string[]): string {
    // reads .agents/skills/{name}/SKILL.md files
    // returns concatenated content for system prompt injection
}
```

**Token cost:** 20,000–30,000 tokens once per agent spawn. Not per tool call.

**Usage:** The implementer agent factory calls `injectSkillContext` with the task-relevant skills and includes the result in the system prompt before spawning.

---

### Option B: Dedicated `readSkillsTool` (Selective)

A separate `readSkillsTool` that takes an array of skill names and returns only those SKILL.md files. Given only to implementer and reviewer agents.

**Token cost:** 3,000–10,000 tokens per selective call, paid only when the agent needs to reference implementation patterns.

**Advantage over Option A:** Agent pulls skills on demand rather than receiving all context upfront. Useful if agents have variable task scope.

---

### Agent Skill Assignment Matrix

| Agent Type | Skills to Receive | Delivery Method |
|---|---|---|
| Explorer agents (all 6 slices) | None | — |
| Specialist agents (DB, error handling) | None | — |
| Implementer agent | `next-best-practices`, `next-cache-components`, `vercel-composition-patterns`, `vercel-react-best-practices`, `building-components` | System prompt injection at factory time |
| Reviewer agent | `next-best-practices`, `next-cache-components`, `vercel-composition-patterns` | System prompt injection at factory time |
| Any agent (all) | Exclude `turborepo` | Hard-exclude from `find-skills` discovery |

**Rationale for exclusions:**

- `turborepo` is actively misleading for a single-app repo. It should be excluded from `find-skills` results entirely, not just deprioritized. An agent that discovers it may waste cycles investigating monorepo patterns that don't apply.
- `web-design-guidelines` overlaps with `bun style` enforcement. Style compliance is already covered by the linting pipeline. Do not add it to agent context unless a specific UI audit task is assigned.
- `find-skills` is infrastructure — available to all agents that need to discover available patterns, but not injected proactively.

---

## TL;DR

- 6 of 8 skills are relevant; `turborepo` should be hard-excluded from agent discovery, `web-design-guidelines` is low-priority overlap
- 4 conflicts exist between skills and project rules — all resolvable via explicit override notes in implementer agent system prompts; the `async` RSC ban applies to pages only, not cached sub-components
- 4 skill gaps: Inngest Realtime SSE (highest priority, must be authored before Live Workflow Viewer task), `revalidateTag` mutation loop, `aria-live` for streams, PPR 3-tier composition
- `readConventionsTool` scope stays narrow — skills are task-specific and too expensive to inject on every tool call across 6 parallel explorer slices
- Deliver skills at agent factory time via `injectSkillContext` helper or a dedicated `readSkillsTool`; only implementer and reviewer agents receive skill context
