# Agent Bash Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a bash tool to the coder agent so it can run arbitrary shell commands (tests, builds, git, installs) inside the Vercel Sandbox.

**Architecture:** Hand-rolled `bashTool` following the exact same `experimental_context → extractSandbox → sandbox.runCommand` pattern as existing tools. No new dependencies. Coder-only — explorer stays read-only.

**Tech Stack:** `@vercel/sandbox` (existing), AI SDK `tool()` + `experimental_context` (existing)

**Design doc:** `docs/plans/2026-02-23-agent-bash-tool-design.md`

---

## Commit 1: `feat: add bash execution to coder agent`

### Task 1: Add bash operation

**Files:**
- Modify: `src/lib/agent/fs/operations.ts`

**Step 1: Add `MAX_OUTPUT_LENGTH` constant, `BashResult` interface, and `bash()` function**

Add after the existing `MAX_GREP_RESULTS` constant (line 7):

```typescript
const MAX_OUTPUT_LENGTH = 30_000
```

Add after the `edit` function (after line 336), before the exports:

```typescript
interface BashResult {
	stdout: string
	stderr: string
	exitCode: number
}

async function bash(sandbox: Sandbox, command: string): Promise<BashResult> {
	const cmdResult = await errors.try(sandbox.runCommand("bash", ["-c", command]))
	if (cmdResult.error) {
		logger.error("bash command failed", { error: cmdResult.error, command: command.slice(0, 80) })
		throw errors.wrap(cmdResult.error, `bash '${command.slice(0, 80)}'`)
	}

	const cmd = cmdResult.data

	const stdoutResult = await errors.try(cmd.stdout())
	if (stdoutResult.error) {
		logger.error("bash stdout failed", { error: stdoutResult.error })
		throw errors.wrap(stdoutResult.error, "bash stdout")
	}

	const stderrResult = await errors.try(cmd.stderr())
	if (stderrResult.error) {
		logger.error("bash stderr failed", { error: stderrResult.error })
		throw errors.wrap(stderrResult.error, "bash stderr")
	}

	const truncatedStdout = stdoutResult.data.length > MAX_OUTPUT_LENGTH
		? stdoutResult.data.slice(0, MAX_OUTPUT_LENGTH) + "\n[truncated]"
		: stdoutResult.data

	const truncatedStderr = stderrResult.data.length > MAX_OUTPUT_LENGTH
		? stderrResult.data.slice(0, MAX_OUTPUT_LENGTH) + "\n[truncated]"
		: stderrResult.data

	logger.debug("bash complete", {
		command: command.slice(0, 80),
		exitCode: cmd.exitCode,
		stdoutLength: stdoutResult.data.length,
		stderrLength: stderrResult.data.length
	})

	return {
		stdout: truncatedStdout,
		stderr: truncatedStderr,
		exitCode: cmd.exitCode
	}
}
```

**Step 2: Update exports**

Add `bash` and `MAX_OUTPUT_LENGTH` to the value exports block:

```typescript
export {
	ErrAmbiguousMatch,
	ErrInvalidPattern,
	ErrNoMatch,
	ErrNotADirectory,
	ErrNotAFile,
	ErrNotFound,
	ErrTooLarge,
	ErrTooManyResults,
	ErrWriteFailed,
	MAX_FILE_SIZE,
	MAX_GLOB_RESULTS,
	MAX_GREP_RESULTS,
	MAX_OUTPUT_LENGTH,
	bash,
	edit,
	glob,
	grep,
	read,
	write
}
```

Add `BashResult` to the type exports block:

```typescript
export type {
	BashResult,
	EditResult,
	GlobMatch,
	GlobResult,
	GrepMatch,
	GrepOptions,
	GrepResult,
	ReadResult,
	WriteResult
}
```

---

### Task 2: Add bash tool

**Files:**
- Modify: `src/lib/agent/fs/tools.ts`

**Step 1: Update import to include `bash` from operations**

Change the import line (line 6):

```typescript
import { bash, edit, glob, grep, read, write } from "@/lib/agent/fs/operations"
```

**Step 2: Add `executeBash` function and `bashTool` definition**

Add after the `editTool` definition (after line 172), before the exports:

```typescript
async function executeBash(
	{ command }: { command: string },
	{ experimental_context }: { experimental_context?: unknown }
) {
	const sandbox = extractSandbox(experimental_context)
	const result = await errors.try(bash(sandbox, command))
	if (result.error) {
		logger.warn("bash tool failed", { error: result.error, command: command.slice(0, 80) })
		return { error: String(result.error) }
	}
	return {
		stdout: result.data.stdout,
		stderr: result.data.stderr,
		exitCode: result.data.exitCode
	}
}

const bashTool = tool({
	description:
		"Execute a bash command in the sandbox. Returns stdout, stderr, and exit code. Use for running tests, installing dependencies, build commands, git operations, and any task requiring shell execution. Prefer structured tools (read, write, edit, glob, grep) for file operations.",
	inputSchema: z.object({
		command: z.string().describe("The bash command to execute")
	}),
	strict: true,
	execute: executeBash
})
```

**Step 3: Update exports**

Change the export line (line 174):

```typescript
export { bashTool, editTool, globTool, grepTool, readTool, writeTool }
```

---

### Task 3: Wire bash into coder agent

**Files:**
- Modify: `src/lib/agent/coder.ts`

**Step 1: Update import to include `bashTool`**

Change the import line (line 2):

```typescript
import { bashTool, editTool, globTool, grepTool, readTool, writeTool } from "@/lib/agent/fs/tools"
```

**Step 2: Add `bash` to tools object**

Replace the tools object (lines 9-15):

```typescript
const tools = {
	read: readTool,
	glob: globTool,
	grep: grepTool,
	write: writeTool,
	edit: editTool,
	bash: bashTool
} as const
```

**Step 3: Update instructions to guide bash vs structured tool usage**

Replace the instructions array (lines 17-27):

```typescript
const instructions = [
	"You are a coding agent.",
	"Given explicit instructions, use the available tools to read files for context, then write or edit code to complete the task.",
	"Follow these rules:",
	"- Read relevant files first to understand existing patterns and conventions",
	"- Use glob and grep to find files you need to understand or modify",
	"- Use write to create new files and edit to modify existing files",
	"- Use bash for running tests, installing dependencies, build commands, git operations, and any task requiring shell execution",
	"- Prefer structured tools (read, write, edit, glob, grep) for file operations — they provide better error handling and structured output",
	"- Make only the changes described in your instructions — no extra refactoring or improvements",
	"- Match the style and conventions of the existing codebase",
	"When finished, provide a brief summary of what you changed and why."
].join("\n")
```

---

### Task 4: Verify and commit

**Step 1: Typecheck**

Run: `bun typecheck`
Expected: PASS — all types resolve. `bashTool` matches the `tool()` signature, `bash` operation accepts `Sandbox` + `string`.

**Step 2: Lint**

Run: `bun lint`
Expected: PASS — no new lint violations. All patterns match existing conventions.

**Step 3: Commit**

```bash
git add src/lib/agent/fs/operations.ts src/lib/agent/fs/tools.ts src/lib/agent/coder.ts
git commit -m "feat: add bash execution to coder agent

Add bash tool for running arbitrary shell commands in the Vercel Sandbox.
Uses the same experimental_context → extractSandbox → sandbox.runCommand
pattern as existing tools. Output truncated at 30k chars per stream.

- operations.ts: bash() function with stdout/stderr capture and truncation
- tools.ts: bashTool with AI SDK tool() definition
- coder.ts: bash added to tools, instructions updated for tool guidance"
```

---

## Summary of Changes

| File | Action | Change |
|------|--------|--------|
| `src/lib/agent/fs/operations.ts` | Modify | Add `bash()` function, `BashResult` type, `MAX_OUTPUT_LENGTH` constant |
| `src/lib/agent/fs/tools.ts` | Modify | Add `executeBash` + `bashTool`, export `bashTool` |
| `src/lib/agent/coder.ts` | Modify | Import `bashTool`, add to tools object, update instructions |

**No new files. No new dependencies. No changes to Inngest functions or explorer agent.**
