# Sub-Plan 12: PR Creation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deterministic utility (no LLM) that pushes a feature branch and creates a GitHub PR.

**Architecture:** Pure function that executes git push and gh CLI commands in the sandbox.

**Tech Stack:** Vercel Sandbox SDK, GitHub CLI

**Dependencies:** None

**Produces:** `src/lib/pipeline/pr-creation.ts`

---

## Contract (non-negotiable)

**Function signature:**
```typescript
createPR(sandbox, config: {
    branch: string
    githubRepoUrl: string
    prompt: string
    analysisOutput: unknown
    approachOutput: unknown
    implOutput: unknown
}) → { prUrl: string, prNumber: number, title: string, body: string }
```

## Internal (can change freely)

- PR title generation logic
- PR body format and content
- Whether git push uses SSH or HTTPS
- Whether PR is created via `gh` CLI or GitHub API
- How phase outputs are summarized into the PR body

---

## Steps

### Step 1: Create PR creation module

**Files:** Create `src/lib/pipeline/pr-creation.ts`

Deterministic function that:
1. Pushes the feature branch via sandbox bash (`git push origin <branch>`)
   - This is the ONLY place git push is allowed — the sandbox bash ban in `fs/operations.ts` stays for agent tool calls
   - PR creation runs via `step.run()` in the master orchestrator, not via agent tools
2. Creates a PR via `gh pr create` in the sandbox (or GitHub API)
3. Generates PR title from the feature prompt
4. Generates PR body with summary sections from analysis, approach, and implementation outputs
5. Returns `{ prUrl, prNumber, title, body }`

### Step 2: Verify

Run: `bun typecheck`
Expected: PASS

### Step 3: Commit

```bash
git add src/lib/pipeline/pr-creation.ts
git commit -m "feat: add PR creation utility"
```
