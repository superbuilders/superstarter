# Agent Bash Tool Design

**Goal:** Add general-purpose bash execution to the coder agent, enabling it to run tests, install dependencies, execute build commands, and perform git operations inside the Vercel Sandbox.

**Approach:** Hand-roll a `bashTool` following the exact same pattern as existing tools (read, glob, grep, write, edit). The sandbox flows through `experimental_context` — no new dependencies, no factory pattern, no async setup.

**Scope:** Coder agent only. Explorer remains read-only with its 3 tools.

## Architecture

### Current State

```
coder tools = { read, glob, grep, write, edit }
                 ↓ all use experimental_context → extractSandbox → sandbox.runCommand/readFile/writeFile
```

`glob` and `grep` already shell out via `sandbox.runCommand("find", ...)` and `sandbox.runCommand("grep", ...)`. The bash tool extends this pattern to arbitrary commands.

### Target State

```
coder tools = { read, glob, grep, write, edit, bash }
                                                  ↓
                                    sandbox.runCommand("bash", ["-c", command])
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Dependency | None (hand-rolled) | Consistent with existing `experimental_context` pattern; `bash-tool` pkg uses closure injection |
| Agent scope | Coder only | Explorer is read-only by design |
| Security | Sandbox policies only | Vercel Sandbox seccomp/landlock is sufficient; no command interceptor needed |
| Error handling | Non-zero exit codes are NOT errors | The LLM needs to see stderr/exitCode to debug. Only sandbox communication failures are errors. |
| Output truncation | 30,000 chars per stream | Matches bash-tool's default; prevents context window exhaustion |

## Changes

### 1. `src/lib/agent/fs/operations.ts` — add `bash()` function

New operation alongside read/glob/grep/write/edit:

```typescript
const MAX_OUTPUT_LENGTH = 30_000

interface BashResult {
    stdout: string
    stderr: string
    exitCode: number
}

async function bash(sandbox: Sandbox, command: string): Promise<BashResult> {
    const cmdResult = await errors.try(sandbox.runCommand("bash", ["-c", command]))
    if (cmdResult.error) {
        throw errors.wrap(cmdResult.error, `bash '${command.slice(0, 80)}'`)
    }

    const cmd = cmdResult.data
    const stdout = await cmd.stdout()
    const stderr = await cmd.stderr()

    return {
        stdout: stdout.length > MAX_OUTPUT_LENGTH
            ? stdout.slice(0, MAX_OUTPUT_LENGTH) + "\n[truncated]"
            : stdout,
        stderr: stderr.length > MAX_OUTPUT_LENGTH
            ? stderr.slice(0, MAX_OUTPUT_LENGTH) + "\n[truncated]"
            : stderr,
        exitCode: cmd.exitCode
    }
}
```

### 2. `src/lib/agent/fs/tools.ts` — add `bashTool`

New tool following the exact `executeFn` + `tool()` pattern:

```typescript
async function executeBash(
    { command }: { command: string },
    { experimental_context }: { experimental_context?: unknown }
) {
    const sandbox = extractSandbox(experimental_context)
    const result = await errors.try(bash(sandbox, command))
    if (result.error) {
        logger.warn("bash tool failed", { error: result.error, command })
        return { error: String(result.error) }
    }
    return {
        stdout: result.data.stdout,
        stderr: result.data.stderr,
        exitCode: result.data.exitCode
    }
}

const bashTool = tool({
    description: "Execute a bash command in the sandbox. Returns stdout, stderr, and exit code. Use for running tests, installing dependencies, build commands, git operations, and any task requiring shell execution. Prefer structured tools (read, write, edit, glob, grep) for file operations.",
    inputSchema: z.object({
        command: z.string().describe("The bash command to execute")
    }),
    strict: true,
    execute: executeBash
})
```

### 3. `src/lib/agent/coder.ts` — add bash to tools, update instructions

```typescript
import { bashTool, editTool, globTool, grepTool, readTool, writeTool } from "@/lib/agent/fs/tools"

const tools = {
    read: readTool,
    glob: globTool,
    grep: grepTool,
    write: writeTool,
    edit: editTool,
    bash: bashTool
} as const
```

Instructions updated to guide the model on bash vs structured tool usage:

> "Use bash for running tests, installing dependencies, build commands, git operations, and any task that requires shell execution. Prefer the structured tools (read, write, edit, glob, grep) for file operations — they provide better error handling and structured output."

### Files Not Changed

- `src/inngest/functions/agents/code.ts` — no changes needed, bash flows through `experimental_context` like all other tools
- `src/inngest/functions/agents/explore.ts` — not in scope
- `src/lib/agent/explorer.ts` — not in scope
- `src/lib/agent/fs/context.ts` — no changes needed
- `src/lib/agent/sandbox.ts` — no changes needed
