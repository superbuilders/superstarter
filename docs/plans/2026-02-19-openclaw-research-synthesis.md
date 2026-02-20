# OpenClaw Research Synthesis

Date: 2026-02-19
Purpose: Synthesize 13 OpenClaw memory files into actionable insights for the Paul agent architecture.

---

## Executive Summary

OpenClaw is an open-source, self-hosted personal AI assistant framework with ~212k GitHub stars. Created by Peter Steinberger (ex-PSPDFKit founder, ~100M EUR exit in 2021), it began as a weekend WhatsApp relay project in November 2025 and grew to become the dominant open-source AI assistant framework. Steinberger made 6,600+ commits in January 2026 with Claude Code assistance before joining OpenAI in February 2026 and handing the project to an independent foundation.

We studied OpenClaw to answer three questions:

1. What agent infrastructure patterns have been validated at scale and are worth adopting?
2. What mistakes did they make that we should avoid?
3. Does their architecture confirm or challenge our design choices for Paul?

The core finding: **OpenClaw is not an AI agent. It is infrastructure around an agent.** The actual think-act-observe loop is Pi (by Mario Zechberg). OpenClaw is the gateway, channels, memory, plugins, and companion apps that make the agent useful in the real world. This separation is the most important structural lesson.

---

## Architecture Overview

OpenClaw runs as a four-layer stack. Each layer has a clear responsibility boundary.

```
+--------------------------------------------------+
|  INTELLIGENCE                                    |
|  Pi agent framework, 20+ LLM providers,          |
|  model failover, auth profile rotation           |
+--------------------------------------------------+
|  EXECUTION                                       |
|  Tool invocation, Playwright browser,            |
|  cron jobs, webhooks, A2UI canvas,               |
|  execution approval workflows                    |
+--------------------------------------------------+
|  INTEGRATION                                     |
|  20+ channel adapters (WhatsApp, Telegram,       |
|  Slack, Discord, Signal, iMessage, Teams, ...)   |
|  Composition-based ChannelPlugin interface       |
+--------------------------------------------------+
|  GATEWAY                                         |
|  Single WebSocket process on :18789              |
|  Multiplexes WS + HTTP + UI on one port          |
|  RSA 4096 device auth, session management,       |
|  protocol versioning, exponential backoff        |
+--------------------------------------------------+
```

| Layer | OpenClaw Component | Analogue in Paul |
|-------|-------------------|-----------------|
| Gateway | WebSocket server on :18789, RSA auth | Inngest event bus + Next.js API routes |
| Integration | ChannelPlugin adapters (20+ platforms) | Web dashboard only (single interface) |
| Execution | Tools: bash, browser, cron, canvas | AgentKit tools: read, write, bash, typecheck |
| Intelligence | Pi agent framework | Inngest AgentKit Networks |

The gateway accepts connections via path-based routing on a single multiplexed port:

| Path | Handler |
|------|---------|
| `/` (default) | WebSocket upgrade |
| `/openai/*` | OpenAI-compatible API |
| `/control/ui/*` | Browser dashboard |
| `/canvas/*` | A2UI visual workspace |
| `/hook/*` | Inbound webhooks |
| `/slackhttp/*` | Slack HTTP events |
| `/tools/*` | Tool invocation API |

---

## Key Patterns Adopted

These are patterns from OpenClaw that we ARE using in Paul, either because the research confirmed our prior intuition or because it offered a better approach than what we had.

### 1. Separation of Agent Loop from Infrastructure

OpenClaw delegates the think-act-observe loop entirely to Pi. It builds gateway, channels, memory, plugins on top — but never reimplements the loop.

Paul does the same: Inngest AgentKit handles the agent loop. We build tools, config, workspace management, and observability around it.

The implication: our AgentKit choice is architecturally equivalent to OpenClaw's Pi choice. The framework choice is independent of everything else we build.

### 2. Factory Function Wrapping for API Stability

OpenClaw wraps every Pi API call through ~100 `pi-*.ts` adapter files. They don't call Pi directly from feature code. The adapter layer handles:

- Auth profile rotation and cooldown
- Context window guarding (token accounting)
- Failover classification and provider rotation
- Provider-specific message sanitization (Google/Anthropic differences)
- Hook injection (`before_tool_call`, `after_tool_call`, etc.)

We use the same pattern: factory functions wrap AgentKit primitives. Direct AgentKit calls from feature code are forbidden. This gives us one place to add cross-cutting concerns (logging, error handling, token tracking) without touching every call site.

### 3. Tool Capability Tiers (Cascading, Never Expanding)

OpenClaw's tool policy resolves in cascade order:

```
Global tools.allow/deny
  -> Provider-specific restrictions
    -> Per-agent overrides
      -> Group-level policies
        -> Sandbox-specific allowlists
```

A lower layer can only restrict, never expand beyond what the layer above allows. This is the "cascading, never expanding" principle.

Paul's tool tiers map to this directly:

| Tier | Paul | OpenClaw Equivalent |
|------|------|---------------------|
| read-only | Research agents (read files, search) | `group:fs` read-only |
| analysis | Concept agents (read + reason) | Provider-level restrictions |
| verification | Review agents (typecheck, lint, test) | Agent-level overrides |
| write | Implementation agents (write, edit, bash) | Full `group:runtime` |

### 4. Event-Driven Orchestration

OpenClaw's gateway runs an event bus. Every channel event, tool call, session event, and agent lifecycle event flows through it. Hooks fire on named events (`message_received`, `before_tool_call`, `agent_end`, etc.).

Paul uses Inngest's event system for the same purpose. Every workflow step emits typed events. The Inngest dashboard is our flight recorder.

### 5. Skills as Markdown Convention Context

OpenClaw's skill system is YAML frontmatter + markdown. Skills are **prompt context, not code**. The LLM reads skill documentation and decides when to apply it. There is no programmatic dispatch — the model has agency.

```yaml
---
name: github-pr-review
description: Review pull requests on GitHub
openclaw:
  requires:
    - bins: ["gh", "git"]
  always: false
---
# PR Review Skill
## When to Use
- Reviewing pull requests
## Commands
- `gh pr view <number>`
```

Paul uses CLAUDE.md and the `rules/` directory the same way. Convention context is markdown that agents read and internalize, not programmatic configuration. This validates our approach of keeping enforcement lightweight (lint rules) and context-heavy (markdown).

---

## Key Patterns Rejected

These are patterns from OpenClaw that we chose NOT to use, with explicit reasoning for each.

### 1. Session Trees

Pi's session tree system allows an agent to branch a "side quest" sub-session for a sub-task (like fixing a broken tool), then rewind and merge results back into the main session. This prevents context window exhaustion on long-horizon tasks.

**Why we rejected it:** Paul's agents are ephemeral per-run. They don't maintain long-running sessions that risk context exhaustion. Each Inngest workflow run starts fresh. The session tree pattern solves a problem we don't have at this scale.

If Paul ever needs long-running stateful agents, session trees become relevant. For now, they add complexity without payoff.

### 2. Hybrid Memory System (BM25 + Vector + Temporal Decay + MMR)

OpenClaw implements a sophisticated multi-layer memory architecture:

- Markdown files as source of truth
- sqlite-vec for vector embeddings (Voyage/OpenAI)
- Hybrid search: BM25 keyword + cosine similarity, weighted merge
- Temporal decay: `e^(-lambda * age)` with 30-day half-life
- MMR diversity re-ranking (lambda=0.7)
- 400-token chunks with 80-token overlap
- Evergreen exemptions for MEMORY.md and non-dated files

**Why we rejected it:** This memory system serves a persistent personal assistant that needs to remember conversations across days and weeks. Paul agents start fresh for each run. We have no cross-run persistence requirement. Adding this system would be solving a problem we don't have while adding ~5 dependencies and significant complexity.

Steinberger himself says "Don't waste your time on stuff like RAG." The system that comes from his own product contradicts his stated preference — suggesting it emerged from user demand rather than conviction.

### 3. Channel Adapter Pattern (Multi-Platform)

The `ChannelPlugin` interface supporting 20+ messaging platforms (Discord, Telegram, WhatsApp, Slack, Signal, iMessage, Teams, LINE, etc.) is OpenClaw's largest architectural layer.

**Why we rejected it:** Paul has one interface: the web dashboard. There are no plans for messaging platform integrations. Building a ChannelPlugin abstraction would be pure overhead with no consumer.

If Paul ever needs Slack or Discord integration for agent output notifications, the pattern is well-understood and can be added then.

### 4. Plugin System with 20 Hook Phases

OpenClaw's plugin system provides 20 hook types, 11 registration methods, three-stage loading (manifest → import → sync register), four discovery origins, and a community marketplace (ClawHub).

```
before_model_resolve    before_prompt_build    before_agent_start
llm_input               llm_output             agent_end
before_compaction        after_compaction        before_reset
message_received         message_sending         message_sent
before_tool_call         after_tool_call         tool_result_persist
before_message_write     session_start           session_end
gateway_start            gateway_stop
```

**Why we rejected it:** Paul has a fixed agent roster, not an extensible marketplace. We have no third-party plugin authors. The 20-hook system serves a platform where unknown code needs well-defined injection points. For an internal tool with a known set of agents, this is over-engineering.

Additionally, OpenClaw's plugin marketplace (ClawHub) became a security disaster: 341 malicious skills, one-click RCE, 28,000+ exposed instances. A plugin marketplace requires security infrastructure that is out of scope.

### 5. MCP Integrations

OpenClaw integrates with the Model Context Protocol ecosystem. Steinberger himself later abandoned MCP:

> "Most MCPs are something for marketing."
> "GitHub MCP alone consumed 23k tokens (previously 50k)."
> "Removed last MCP because Claude invoked Playwright unnecessarily."

**Why we rejected it:** Token cost is real. An MCP that injects 23k tokens of context to give an agent GitHub access is worse than having the agent call `gh` CLI directly. Standard CLIs are cheaper and more controllable. We follow Steinberger's evolved position, not his initial one.

---

## Pi Agent Framework Analysis

Pi is two npm packages by Mario Zechberg:

```
@mariozechner/pi-agent-core    v0.53.0   The agent loop
@mariozechner/pi-coding-agent  v0.53.0   Coding tools + session management
```

### What Pi Exports

| Export | Purpose |
|--------|---------|
| `AgentMessage` | Message format (role + content blocks) |
| `AgentTool` | Tool interface (name, description, parameters, execute) |
| `AgentToolResult` | Return type from tool execution |
| `AgentEvent` | Streaming events (lifecycle, delta, heartbeat) |
| `AgentSession` | Session state container |
| `codingTools` | Pre-built Read/Write/Edit/Bash tools |
| `SessionManager` | Session persistence (load/save/version) |
| `createAgentSession` | Factory for new sessions |

### The Agent Loop

Pi's loop is the standard think-act-observe cycle:

```
Talk to LLM
  -> Detect tool calls in response
    -> Execute tools
      -> Feed results back into context
        -> Repeat until final answer
```

OpenClaw does not reimplement any of this. Pi handles it entirely.

### Session Trees

The key architectural innovation in Pi. Sessions branch like version control:

1. Agent encounters a blocking sub-problem (e.g., a broken tool)
2. Agent spawns a "side quest" branch session
3. Side quest session has its own context window
4. Side quest resolves the blocking problem
5. Main session rewinds to the branch point
6. Resolved state is merged back
7. Main session continues with fresh context

This prevents context window exhaustion on long multi-hour tasks without requiring manual compaction or session resets.

**Relevance to Paul:** We don't need this now (ephemeral runs), but the pattern is valuable if we ever build long-horizon autonomous workflows. The key idea — branch on blocking sub-problems, merge on resolution — is cleaner than compaction or restart approaches.

### Hot Reloading

Pi agents can write code, reload the modified module, test it, and iterate — all within the same session. This is extension-first design: the agent writes its own capabilities rather than being given a fixed tool set at startup.

**Relevance to Paul:** Our research agents read existing code rather than writing new capabilities. Hot reloading is not directly applicable. However, the extension-first philosophy (agents should understand their own execution environment) aligns with our Context Frontloading principle.

### System Prompt Size

Pi's system prompt is under 1,000 tokens — the shortest of any documented agent framework. This is intentional: the agent loop itself needs minimal instructions; the domain knowledge lives in skills (markdown files) loaded on demand.

**Relevance to Paul:** Our per-agent system prompts should be minimal. Domain context goes into the workspace (CLAUDE.md, rules/, codebase files), not the system prompt. Bloated system prompts are a smell.

---

## Steinberger's Philosophy

### The Agentic Trap

Steinberger documented a maturity curve for AI-assisted development:

| Stage | Behavior | Why |
|-------|----------|-----|
| Beginner | Short prompts ("please fix this") | No framework, works directly |
| Middle | Complex multi-agent orchestration, 8+ agents, custom workflows | Over-engineered in response to limitations |
| Expert | Return to short prompts through deep system knowledge | Understands what the model actually needs |

The trap: middle-stage developers build elaborate orchestration infrastructure to compensate for model limitations. Experts realize the model doesn't need orchestration — it needs context and trust.

This should calibrate our ambition for Paul. We should start simple, add complexity only where agent failures demand it, and always ask whether a new abstraction solves a real failure mode or just feels sophisticated.

### Steerability is Non-Negotiable

Steinberger explicitly rejected async background agents (Cursor web, OpenAI Codex async):

> "Still don't see how this could be moved to background agents. I steer the models a lot."

His workflow keeps agents visible and interactive. He monitors the output stream in real time, course-corrects via prompting, and stays in the loop on decisions.

Paul's web dashboard serves this function. Every agent run must be inspectable mid-flight. Deep Observability is not a nice-to-have — it is what makes the system steerable.

### Blast-Radius Thinking

Scale parallel agents inversely to damage potential:

| Work Type | Blast Radius | Steinberger's Approach |
|-----------|-------------|----------------------|
| Refactoring (shared code) | High | 1-2 agents |
| Schema changes | High | 1 agent, human review |
| Tests, UI, isolated features | Low | 4+ agents |
| Research, documentation | Minimal | Unlimited |

Paul's Worktree Isolation principle maps to blast-radius thinking: each worktree limits the damage radius of a failed run to one branch. This is what enables aggressive parallelism on low-risk work.

### Agent Self-Awareness

> "It knows what its source code is. It understands how it sits and runs in its own harness."

Steinberger configures agents to read their own config, understand which model they run, and inspect their tool set. This enables autonomous modification and better decision-making about what tools to reach for.

Paul's agents receive their configuration as context. They should know their own scope, what tools they have, what the success criteria are, and what verification steps are expected — before they start work.

### Memory as Markdown

> "Don't waste your time on stuff like RAG, subagents, Agents 2.0 or other things that are mostly just charade."

Steinberger's actual memory system: markdown files in the workspace. The agent reads them. No vector database, no embedding pipeline, no retrieval. The model's context window is the retrieval system.

His 800-line agent config file includes naming conventions, API preferences, React patterns, database migration approaches, testing guidelines, and AST-Grep rules — all as readable markdown.

This validates Paul's approach: CLAUDE.md + rules/ directory as the agent's "memory." The model reads it on each run. No persistence infrastructure needed.

### What He Explicitly Rejects

| Anti-pattern | Steinberger's position |
|-------------|----------------------|
| MCP | "Mostly marketing" — 23k token overhead |
| Plan mode | "Hack for older model generations" |
| Worktrees | "Cognitive load" — commits to main instead |
| Async agents | "No steerability" — rejected Cursor web and Codex async |
| RAG | "Mostly charade" — markdown files suffice |
| Automated tests in separate context | "Usually not great" |

Note: Steinberger rejects git worktrees for his own workflow (prefers committing to main). Paul uses worktrees for a different reason — parallel isolation of concurrent runs, not for branching individual work. His concern (cognitive load) doesn't apply to infrastructure-managed worktrees.

---

## Transferable Patterns

Detailed, actionable patterns from OpenClaw worth adopting, regardless of whether we use OpenClaw code directly.

### 1. Capabilities Declaration Over Runtime Checks

OpenClaw channels declare what they support at registration time via a `ChannelCapabilities` object. Feature code checks the declaration — it never does `if (channelId === "discord")`.

```typescript
type ChannelCapabilities = {
    chatTypes: Array<"direct" | "channel" | "group" | "thread">
    polls?: boolean
    reactions?: boolean
    edit?: boolean
    threads?: boolean
    media?: boolean
}

function canSendPoll(channel: ChannelPlugin): boolean {
    return channel.capabilities.polls === true
}
```

**Apply to Paul:** Agent capabilities (what tools a given agent has, what output formats it supports) should be declared at registration time. Routing logic checks declarations. Scattered `if (agentType === "researcher")` conditionals are a smell.

### 2. Two-Stage Manifest Loading

OpenClaw loads plugin manifests in two stages:

1. **Manifest stage**: Load only `openclaw.plugin.json` (cheap JSON read, no code execution). Returns metadata: id, name, channels, skills, configSchema.
2. **Load stage**: Import the actual plugin code. Validate config. Call `register(api)`.

The 200ms TTL manifest cache serves fast repeated queries. Heavy plugin code is loaded only when the plugin is actually needed.

**Apply to Paul:** Agent definitions should have a lightweight descriptor (id, type, capabilities, config schema) separate from the agent implementation. The orchestrator reads descriptors to build workflow plans, then loads agent implementations only when scheduling execution.

### 3. Sync-Only Registration

OpenClaw's `register(api)` function is synchronous. Async `register` functions are ignored with a warning. This guarantee:

- No I/O can block boot sequence
- Plugin registration order is deterministic
- Boot time is bounded (no network calls during startup)

**Apply to Paul:** Agent and tool registration must be synchronous. Any initialization that requires I/O (reading config from DB, fetching external resources) happens after registration, in an explicit initialization phase.

### 4. Non-Destructive Config Writes

The challenge: config files contain `${ENV_VAR}` syntax. A naive read-modify-write cycle loses env var references, substituting their current values.

OpenClaw's solution:

1. Read the resolved config snapshot (env vars substituted — this is what code uses)
2. Build a minimal merge-patch (only changed fields)
3. Re-read the on-disk file (raw, with `${VAR}` syntax intact)
4. Apply the patch to the raw file, restoring `${VAR}` where values match the resolved state
5. Atomic write via temp-file rename

**Apply to Paul:** Any config system that allows user-editable files with env var references needs this pattern. Naive overwrites are a correctness bug, not just a style issue.

### 5. Per-Resource Lock Queues

Session files use per-store lock queues, not a global lock:

- Each session file has its own queue
- Concurrent writes to different sessions proceed in parallel
- A queue for store X does not block writes to store Y
- Within one store, writes are serialized to prevent corruption

A global lock would serialize ALL session writes, creating a bottleneck under concurrent agent runs.

**Apply to Paul:** If we ever persist per-run state to files or a shared resource, lock at the resource level, not globally. The queue key is the resource identifier (file path, record ID), not a process-wide mutex.

### 6. Maintenance on Save

Session maintenance (pruning old entries, capping to N most recent, rotating large files) runs at write time — not as a separate GC process or scheduled job.

Benefits:
- No separate maintenance process to deploy and monitor
- Maintenance is triggered exactly when data changes
- File size and entry count are bounded immediately after any write

**Apply to Paul:** Run-level cleanup (archiving old workflow runs, pruning stale worktrees) should trigger on workflow completion, not via a separate cron job. The completion event IS the trigger.

### 7. Archive Pruned Data to JSONL

When OpenClaw prunes old sessions (>30 days), it doesn't delete them. It appends pruned transcripts to a `.archive.jsonl` file. The active session file stays small; the archive grows append-only.

This preserves the audit trail indefinitely at near-zero cost (JSONL compresses well; appends are cheap).

**Apply to Paul:** Never delete workflow run data. Archive completed and abandoned runs to append-only JSONL. The active run table stays small; the history is always available for debugging.

### 8. Pure Functions for Gating Logic

OpenClaw's ACL check is a pure function:

```typescript
function isSenderIdAllowed(
    allow: AllowConfig,
    senderId: string | undefined,
    allowWhenEmpty: boolean
): boolean {
    if (!allow.hasEntries) return allowWhenEmpty
    if (allow.hasWildcard) return true
    if (!senderId) return false
    return allow.entries.includes(senderId)
}
```

No side effects. No database calls. No async. Input in, boolean out.

Same for mention detection, activation mode resolution, tool policy cascade.

**Apply to Paul:** All routing, gating, and policy decisions should be pure functions. They take config as input and return decisions. This makes them trivially testable and easy to reason about.

### 9. Normalize at the Boundary

Each channel adapter handles platform-specific parsing before handing a normalized payload to core routing:

- Discord event → parse Discord-specific fields → normalized `InboundMessage`
- WhatsApp event → parse WhatsApp-specific fields → normalized `InboundMessage`
- Core routing receives only `InboundMessage`, never Discord or WhatsApp types

**Apply to Paul:** Each tool adapter normalizes its output to our internal types before returning to the agent. Agent code never handles provider-specific response shapes.

### 10. Progressive Disclosure for Token Budget

Skills are loaded in two passes:

1. Load skill names and descriptions only (~97 chars each per skill) to give the agent an overview
2. Inject full skill content (potentially thousands of tokens) only when the agent activates that skill

This keeps the base context window small while making full content available on demand.

**Apply to Paul:** Large context (full file contents, complete API documentation, detailed spec files) should be injected on demand, not frontloaded into every agent run. The agent reads a table of contents, then requests specific documents.

---

## Anti-Patterns and Cautionary Lessons

### Security as an Afterthought

OpenClaw's security posture was consistently reactive:

- **CVE-2026-25253**: Missing WebSocket origin validation led to credential theft and remote code execution
- **ClawHub marketplace**: 341 malicious skills discovered — 335 from a single campaign. Skills were stealing config files and establishing persistence.
- **28,000+ exposed instances** discoverable via Shodan due to a detectable `User-Agent: OpenClaw-Gateway/1.0` fingerprint
- **Gartner rating**: "Insecure by default"

The root cause: **sandboxing was opt-in**. Users had to explicitly enable container isolation. The default was full system access. When the community grew, the default became the attacker's surface.

Paul lessons:
- Default-deny for all tool execution. Expanding permissions is explicit and logged.
- No plugin marketplace. Fixed agent roster, known code only.
- No public ports. Dashboard behind authentication from day one.
- Every agent run is scoped to a worktree. Blast radius is bounded by filesystem.

### Runtime Bloat from Inclusive Dependencies

OpenClaw reported 13.5s startup time and 1.2GB of `node_modules`. The inclusive dependency strategy — supporting 20+ channel platforms, each with its own SDK — resulted in bundling code that most users would never invoke.

The community alternative NanoClaw (~500 LOC) demonstrates that a minimal implementation is achievable.

Paul lessons:
- We use Bun (faster startup than Node.js)
- We have no channel adapters to bundle
- Dependencies are evaluated per-feature, not pre-bundled

### Unbounded Token Costs

Community reports: $300-750/month for heavy users; $560 for a single weekend; $5 per 30-minute session at peak. OpenClaw shipped without token budgets.

Paul lessons:
- Every workflow run should have a token budget configured at dispatch time
- Token usage is logged as a structured event (not just model metadata)
- Runaway agent loops are terminated by Inngest step timeouts
- Model selection per agent (cheaper models for research, expensive models for implementation) directly controls cost

### Opt-In Everything is a Security Failure

The opt-in sandbox was not the only opt-in problem. Approval workflows, ACL whitelists, and mention-gating were also features users had to discover and configure. The result: most instances ran with full permissions and no gating.

Security-relevant features must be:
1. On by default
2. Explicit to disable
3. Visible in the dashboard

---

## How This Influenced the Architecture

### 1. Validated the AgentKit Choice

The clearest lesson from OpenClaw: don't build your own agent loop. Use an existing framework and build infrastructure around it. OpenClaw delegates to Pi; Paul delegates to Inngest AgentKit. The infrastructure layer (tool definitions, config, workspace management, observability) is where architectural decisions matter.

### 2. Reinforced the Factory Pattern

OpenClaw's ~100 `pi-*.ts` adapter files are factory functions that wrap Pi's API. Direct Pi calls don't appear in feature code. We apply the same pattern with AgentKit: every interaction goes through our factory layer, which handles logging, error handling, token tracking, and hook injection.

This is not bureaucracy — it's the only way to add cross-cutting concerns without touching every call site.

### 3. Informed Tool Policy Design

OpenClaw's cascading tool policy (global → provider → agent → group → sandbox, never expanding) directly shaped Paul's tool tiers. The "never expanding" constraint is the critical safety property: no lower-level configuration can grant permissions that the layer above denied.

Our tiers:

| Tier | Agents | Permitted |
|------|--------|-----------|
| read-only | Researchers | fs.read, search, grep |
| analysis | Concept generators | read-only + reason + output |
| verification | Reviewers | analysis + typecheck, lint, test |
| write | Implementors | verification + fs.write, edit, bash |

### 4. Shaped Observability Requirements

OpenClaw's flight recorder pattern — every event, every tool call, every session state transition logged — directly inspired Paul's Deep Observability principle. The reason it matters: when an agent fails or produces unexpected output, you need to reconstruct exactly what happened.

Without flight recording, debugging is guessing. With it, debugging is reading.

Every tool call in Paul emits a structured event: what was called, with what arguments, what it returned, how long it took, what the agent decided from the result.

### 5. Warned Against Premature Plugin Systems

OpenClaw's 20-hook plugin system is genuinely well-designed. The security failure wasn't the hooks — it was the marketplace. Unknown code from unknown authors was installed and executed with full system permissions.

Paul has no marketplace, no plugin authors, and no third-party extension point. We have a fixed set of agents written and reviewed by us. A plugin system would add complexity (20+ hook types, three-stage loading, four discovery origins) without any consumer to justify it.

If we ever add an extension point, the OpenClaw pattern is a solid reference — but the security posture must be default-deny from the start.

### 6. Validated Ephemeral Memory

Two independent data points confirmed the right choice:

- Steinberger explicitly advocates against RAG and complex memory systems ("mostly charade")
- OpenClaw's complex memory system (BM25 + vector + temporal decay + MMR) serves persistent personal assistants that need cross-conversation recall

Paul agents are not persistent personal assistants. They are ephemeral task executors. Each run gets full context (codebase, conventions, task spec) injected fresh. No cross-run persistence needed.

The cost of this choice is slightly higher per-run token consumption. The benefit is zero memory infrastructure, zero staleness bugs, and zero context poisoning from previous runs.

---

## TL;DR

- OpenClaw is infrastructure around an agent (Pi), not an agent itself — we are building the same separation with Inngest AgentKit
- Patterns worth adopting: capability declarations, two-stage manifest loading, per-resource locks, maintenance-on-save, progressive disclosure, pure gating functions, normalize at boundary
- Patterns we skip: session trees (ephemeral runs don't need them), hybrid memory (no cross-run persistence), channel adapters (one interface), plugin marketplace (fixed roster, no marketplace)
- Steinberger's most durable lessons: blast-radius thinking, steerability over autonomy, markdown-as-memory, start simple and add complexity only where failures demand it
- Security anti-pattern to internalize: opt-in sandboxing is a failure mode — Paul defaults to minimum permissions and requires explicit expansion
