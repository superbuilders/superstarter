# createState

> Leverage a Network's State across Routers and Agents.

The `State` class provides a way to manage state and history across a network of agents. It includes key-value storage and maintains a stack of all agent interactions.

The `State` is accessible to all Agents, Tools and Routers as a `state` or `network.state` property.

## Creating State

```ts
import { createState } from '@inngest/agent-kit';

export interface NetworkState {
  // username is undefined until extracted and set by a tool
  username?: string;
}

const state = createState<NetworkState>({
  username: 'bar',
});

console.log(state.data.username); // 'bar'

const network = createNetwork({
  // ...
});

// Pass in state to each run
network.run("<query>", { state })
```

## Reading and Modifying State's data (`state.data`)

The `State` class provides typed data accesible via the `data` property.

  Learn more about the State use cases in the [State](/docs/concepts/state) concept guide.

**data** `object<T>`
  A standard, mutable object which can be updated and modified within tools.

## State History

The State history is passed as a `history` to the lifecycle hooks and via the `network` argument to the Tools handlers to the Router function.

The State history can be retrieved *- as a copy -* using the `state.results` property composed of `InferenceResult` objects:

## InferenceResult

The `InferenceResult` class represents a single agent call as part of the network state. It stores all inputs and outputs for a call.

**agent** `Agent`
  The agent responsible for this inference call.

**input** `string`
  The input passed into the agent's run method.

**prompt** `Message[]`
  The input instructions without additional history, including the system prompt, user input, and initial agent assistant message.

**history** `Message[]`
  The history sent to the inference call, appended to the prompt to form a complete conversation log.

**output** `Message[]`
  The parsed output from the inference call.

**toolCalls** `ToolResultMessage[]`
  Output from any tools called by the agent.

**raw** `string`
  The raw API response from the call in JSON format.

## `Message` Types

The state system uses several message types to represent different kinds of interactions:

```ts
type Message = TextMessage | ToolCallMessage | ToolResultMessage;

interface TextMessage {
  type: "text";
  role: "system" | "user" | "assistant";
  content: string | Array<TextContent>;
  stop_reason?: "tool" | "stop";
}

interface ToolCallMessage {
  type: "tool_call";
  role: "user" | "assistant";
  tools: ToolMessage[];
  stop_reason: "tool";
}

interface ToolResultMessage {
  type: "tool_result";
  role: "tool_result";
  tool: ToolMessage;
  content: unknown;
  stop_reason: "tool";
}
```
