# Sub-Plan 12: PR Creation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deterministic utility (no LLM) that creates a GitHub PR via the GitHub API.

**Architecture:** Pure function using GitHub REST API with an environment token. Does NOT use sandbox git push.

**Tech Stack:** GitHub REST API (or `gh` CLI outside sandbox)

**Dependencies:** None

**Produces:** `src/lib/pipeline/pr-creation.ts`

---

## Contract (non-negotiable)

**Function signature:**
```typescript
createPR(config: {
    branch: string
    githubRepoUrl: string
    prompt: string
    analysisOutput: unknown
    approachOutput: unknown
    implOutput: unknown
}) → { prUrl: string, prNumber: number, title: string, body: string }
```

**v2 changes from v1:**
- **No sandbox git push.** The sandbox GitHub token is read-only (by design — agents shouldn't have push access). PR creation uses the GitHub REST API directly with `process.env.GITHUB_TOKEN` (or similar env var). This requires a token with `repo` scope (push + PR creation).
- **Sandbox parameter removed** from the function signature. PR creation doesn't need the sandbox — it reads the branch from the sandbox's git state and pushes via API.

**Env requirement:** Requires a GitHub token with push and PR creation permissions. This is a deployment configuration concern documented here for implementers.

## Internal (can change freely)

- PR title/body generation, whether to use GitHub REST API or `gh` CLI, how outputs are summarized.

---

## Steps

1. Create `src/lib/pipeline/pr-creation.ts`. Uses GitHub REST API (or Octokit) with env token to push and create PR. Generates title from prompt, body from phase outputs.
2. `bun typecheck` — must pass.
3. Commit: `feat: add PR creation utility`
