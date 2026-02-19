# createTool

> Provide tools to an agent

Tools are defined using the `createTool` function.

```ts
import { createTool } from '@inngest/agent-kit';

const tool = createTool({
  name: 'write-file',
  description: 'Write a file to disk with the given contents',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'The path to write the file to',
      },
      contents: {
        type: 'string',
        description: 'The contents to write to the file',
      },
    },
    required: ['path', 'contents'],
  },
  handler: async ({ path, contents }, { agent, network }) => {
    await fs.writeFile(path, contents);
    return { success: true };
  },
});
```

## Options

**name** `string` *(required)*
  The name of the tool. Used by the model to identify which tool to call.

**description** `string` *(required)*
  A clear description of what the tool does. This helps the model understand when and how to use the tool.

**parameters** `JSONSchema | ZodType` *(required)*
  A JSON Schema object or Zod type that defines the parameters the tool accepts. This is used to validate the model's inputs and provide type safety.

**handler** `function` *(required)*
  The function that executes when the tool is called. It receives the validated parameters as its first argument and a context object as its second argument.

  Option to disable strict validation of the tool parameters.

**lifecycle** `Lifecycle`
  Lifecycle hooks that can intercept and modify inputs and outputs throughout the stages of tool execution.

### Handler Function

The handler function receives two arguments:

1. `input`: The validated parameters matching your schema definition
2. `context`: An object containing:
   * `agent`: The Agent instance that called the tool
   * `network`: The network instance, providing access to the [`network.state`](/reference/state).

Example handler with full type annotations:

```ts
import { createTool } from '@inngest/agent-kit';

const tool = createTool({
  name: 'write-file',
  description: 'Write a file to disk with the given contents',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      contents: { type: 'string' },
    },
  },
  handler: async ({ path, contents }, { agent, network }) => {
    await fs.writeFile(path, contents);
    network.state.fileWritten = true;
    return { success: true };
  },
});
```

### `lifecycle`

**onStart** `function`
  Called before the tool handler is executed. The `onStart` hook can be used to:

  * Modify input parameters before they are passed to the handler
  * Prevent the tool from being called by throwing an error

**onFinish** `function`
  Called after the tool handler has completed. The `onFinish` hook can be used to:

  * Modify the result before it is returned to the agent
  * Perform cleanup operations

  ```ts onStart theme={"system"}
  const tool = createTool({
    name: 'write-file',
    lifecycle: {
      onStart: ({ parameters }) => {
        // Validate or modify parameters before execution
        return parameters;
      },
    },
  });
  ```

  ```ts onFinish theme={"system"}
  const tool = createTool({
    name: 'write-file',
    lifecycle: {
      onFinish: ({ result }) => {
        // Modify or enhance the result
        return result;
      },
    },
  });
  ```
