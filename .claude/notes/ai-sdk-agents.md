# AI SDK Agents - Comprehensive Notes

## 1. Directory Structure

The agents documentation contains 6 core markdown files:
- `overview.md` - High-level agent concepts and ToolLoopAgent class introduction
- `building-agents.md` - Creating agents, configuration, and usage patterns
- `loop-control.md` - Controlling execution flow, stopping conditions, prepareStep
- `workflows.md` - Structured patterns for complex workflows
- `configuring-call-options.md` - Runtime configuration and dynamic behavior
- `subagents.md` - Delegating to specialized subagents

## 2. Agent Architecture

**Core Concept**: Agents are LLMs that use tools in a loop to accomplish tasks.

**Three Components**:
1. **LLMs** - Process input and decide next action
2. **Tools** - Extend capabilities beyond text (files, APIs, databases)
3. **Loop** - Orchestrates execution with context management and stopping conditions

**ToolLoopAgent Class**:
- Main abstraction for building agents
- Handles loop iteration, message history, and tool execution
- Default behavior: stops after 20 steps (`stepCountIs(20)`)
- Configurable with system instructions, tools, and output schemas

## 3. Agent Protocols & Execution Model

**Loop Execution Flow**:
```
Input -> Model Generation -> Check Result
  |
  Tool Call? -> Execute Tool -> Add to Context -> Continue
  |
  Text Generated? -> Return Result -> Done
  |
  Stop Condition Met? -> Done
```

**Each Step Represents**:
- One model generation (results in either text or tool call)
- Either a tool call to execute, or text response to return

**Loop Continues Until**:
- Model generates text (finish reasoning other than tool-calls)
- Tool invoked has no execute function
- Tool call needs approval
- Stop condition is met

## 4. Tool Execution Model

**Tool Definition** (using `tool()` helper):
```typescript
tool({
  description: '...',           // What the tool does
  inputSchema: z.object({...}), // Zod schema for inputs
  execute: async ({...}) => {},  // Function that runs
})
```

**Tool Execution Mechanics**:
- Model decides which tool to call and what inputs to provide
- SDK executes the tool automatically
- Result is added to message history as "tool" role message
- Model sees result and decides next action

**Tool Calling Control** (`toolChoice`):
- `'auto'` (default) - Model decides to use tools or generate text
- `'required'` - Force model to always call a tool
- `'none'` - Disable tools entirely
- `{ type: 'tool', toolName: 'specific' }` - Force specific tool

**Preliminary Tool Results** (for streaming):
- `execute` can be async generator function
- Each `yield` sends partial result to UI
- Allows showing progress while tool executes
- Used for subagent streaming

## 5. Multi-Step/Agentic Loops

**Default Loop**:
- Maximum 20 steps by default
- Each step: generate -> evaluate -> execute tool or stop
- Full context window available for each generation

**Loop Control Mechanisms**:

### A) Stop Conditions (`stopWhen`):
- `stepCountIs(N)` - Stop after N steps
- `hasToolCall('toolName')` - Stop after specific tool called
- Custom conditions - Define logic based on steps array
- Can combine multiple conditions (stops if ANY met)

### B) Dynamic Control (`prepareStep`):
- Runs before each step
- Can modify:
  - Model selection (switch based on complexity)
  - Available tools (`activeTools`)
  - Tool choice enforcement
  - Messages (e.g., truncate for context limits)
  - Any agent setting
- Receives: stepNumber, steps array, messages, model config
- Enables phased workflows (search -> analyze -> summarize)

### C) Message Management:
- System message + user message + alternating assistant/tool messages
- `prepareStep` can modify message history (e.g., keep recent only)
- All previous steps visible to stop conditions

## 6. Memory & Context Management

**Message History Structure**:
```
[system, user, assistant (or tool calls), tool, assistant (or tool calls), ...]
```

**Context Issues**:
- Long conversations can exceed model context limits
- `prepareStep` can implement sliding window (keep only recent N messages)
- Summarization possible: replace old messages with summaries

**Subagent Context Isolation**:
- Each subagent starts with fresh context window
- Critical benefit: heavy exploration doesn't bloat main agent
- Can pass main agent's message history to subagent if needed

**State Persistence**:
- All steps available in `steps` array
- Tool calls and results preserved
- Token usage tracked per step via `onStepFinish` callback

## 7. Human-in-the-Loop Support

**Tool Approvals**:
- Tools can require human approval before execution
- When `needsApproval` set, execution pauses waiting for confirmation
- Stops the agent loop (counts as loop termination condition)

**Callback Hooks**:
- `onStepFinish`: Called after each step completes
  - Receives: usage, finishReason, toolCalls
  - Can be in constructor (agent-wide) or method (per-call)
- Constructor callback runs first, then method callback

**User Interaction Points**:
- Tool approvals for sensitive operations
- Custom UI via `createAgentUIStreamResponse`
- Type-safe message types via `InferAgentUIMessage`

## 8. Streaming in Agents

**Streaming Text**:
```typescript
const result = await agent.stream({ prompt: '...' })
for await (const chunk of result.textStream) {
  console.log(chunk)
}
```

**Streaming UI Messages**:
- `createAgentUIStreamResponse()` - Create API response for client apps
- Works with Next.js routes, server actions
- Streams both text and tool calls with their results

**Streaming Tool Results** (Preliminary Results):
- Execute as async generator: `async function* ({ /* inputs */ })`
- Each `yield` sends partial result
- `readUIMessageStream()` accumulates chunks into complete UIMessage
- Frontend displays growing message as it arrives

**Subagent Progress**:
- Subagent invoked via tool's `execute` function
- Tool can stream subagent's progress to UI
- `toModelOutput` controls what main agent sees (full UI vs summary)

## 9. Error Handling in Agents

**Loop Termination on Error**:
- Tool execution failure stops the loop
- Incomplete tool calls handled via `convertToModelMessages` with `ignoreIncompleteToolCalls`
- Error can be logged and gracefully handled

**Cancellation Support**:
- `abortSignal` parameter in tool execute
- Pass through to async operations
- Triggers `AbortError` on cancellation
- Subagent cancellation propagates from parent

**Custom Error Recovery**:
- `prepareStep` can implement retry logic
- Modify model/tools on error (switch to stronger model)
- Early termination via stop conditions

## 10. Best Practices & Patterns

### A) 5 Core Workflow Patterns:

1. **Sequential Processing (Chains)**
   - Steps execute in order, each output -> next input
   - Use for pipelines with clear sequence
   - Example: generate copy -> evaluate quality -> improve if needed

2. **Routing**
   - Model classifies input -> determines processing path
   - First generation determines model/system prompt for next
   - Example: route query by complexity to different models

3. **Parallel Processing**
   - Independent tasks run simultaneously (Promise.all)
   - Aggregate results afterward
   - Example: parallel code review (security, performance, maintainability)

4. **Orchestrator-Worker**
   - Primary agent plans -> specialized workers execute
   - Each worker optimized for subtask type
   - Example: architect plans feature -> specialized agents implement files

5. **Evaluator-Optimizer**
   - Dedicated evaluation step assesses results
   - Based on evaluation: proceed, retry, or take corrective action
   - Iterative improvement loop
   - Example: translate -> evaluate -> improve if quality < threshold

### B) Agent Design Principles:
- Start with simplest approach that works
- Add complexity only when needed
- Balance flexibility (LLM freedom) vs control (constraints)
- Consider error tolerance and cost implications

### C) System Instructions:
- Define agent role and expertise
- Specify behavioral guidelines and rules
- Explain tool usage patterns
- Guide response format/style
- Set boundaries and constraints

### D) Tool Design:
- Clear descriptions for model understanding
- Structured Zod schemas for type safety
- Explicit execute functions
- No-execute tools for termination signals (with `toolChoice: 'required'`)

### E) Cost Optimization:
- Monitor token usage via `onStepFinish`
- Use budget-based stop conditions
- Switch to smaller models for simple tasks
- Summarize tool results in `prepareStep`

### F) Context Management:
- Track message count in `prepareStep`
- Implement sliding window for long conversations
- Use subagents for context-heavy work
- Extract summaries instead of full exploration

### G) Structured Workflows:
- Use core functions (`generateText`, `generateObject`) for predictable flows
- Combine with agents where flexibility needed
- Agents excel at exploration/multi-step reasoning
- Core functions excel at deterministic workflows

### H) Subagent Patterns:
- Use only when benefits exceed latency cost
- Context isolation is primary value proposition
- Streaming progress with `readUIMessageStream`
- `toModelOutput` keeps main agent focused (full UI != model input)
- Subagent instructions must explicitly produce summaries

### I) Call Options for Dynamic Behavior:
- Define `callOptionsSchema` (Zod)
- Implement `prepareCall` to modify settings
- Enables RAG (fetch docs -> inject into instructions)
- Dynamic model/tool selection per request
- Provider-specific options (e.g., reasoning effort)
- Async `prepareCall` for data fetching

### J) End-to-End Type Safety:
- `InferAgentUIMessage<typeof agent>` for UI types
- Tool parts have states: input-streaming, input-available, output-available, output-error
- Detect streaming vs complete: `part.preliminary` flag
- Subagent output accessible in tool part

### K) When NOT to Use Agents:
- Simple, one-shot tasks
- Workflows with fixed steps
- Deterministic processes with known paths
- Tasks requiring guaranteed specific behavior
- Use core functions (`generateText`) instead

### L) Manual Loop Control:
- Direct use of `generateText` with custom loop
- Complete control over messages, stopping, tools
- When `stopWhen`/`prepareStep` insufficient
- Lower-level but more flexible

## 11. Key Configuration Options

**ToolLoopAgent Constructor**:
- `model` - LLM to use
- `instructions` - System prompt
- `tools` - Object of available tools
- `stopWhen` - Stop condition(s)
- `prepareStep` - Callback before each step
- `toolChoice` - How model uses tools
- `output` - Structured output schema
- `onStepFinish` - Per-step callback
- `callOptionsSchema` - Runtime configuration schema
- `prepareCall` - Transform call options to settings

**Generation Methods**:
- `generate(options)` - Single generation
- `stream(options)` - Streaming response
- Both return: `text`, `steps` array, `staticToolCalls`, `usage`

## 12. Integration Points

**With UI** (React):
- `createAgentUIStreamResponse()` in API route
- `useChat<AgentMessageType>()` hook
- Full streaming support
- Type-safe messages

**With Next.js**:
- App Router: server actions with agent delegation
- API routes: `POST /api/chat` with `createAgentUIStreamResponse`
- Server components for data fetching into `callOptions`

**With External APIs**:
- Tools wrap API calls
- Errors caught and handled
- Context can be fetched and injected via `prepareCall`
