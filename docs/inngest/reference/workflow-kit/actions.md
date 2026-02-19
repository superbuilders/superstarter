# Creating workflow actions

The [`@inngest/workflow-kit`](https://npmjs.com/package/@inngest/workflow-kit) package provides a [workflow engine](/docs-markdown/reference/workflow-kit/engine), enabling you to create workflow actions on the back end. These actions are later provided to the front end so end-users can build their own workflow instance using the [`<Editor />`](/docs-markdown/reference/workflow-kit/components-api).

Workflow actions are defined as two objects using the [`EngineAction`](#passing-actions-to-the-workflow-engine-engine-action) (for the back-end) and [`PublicEngineAction`](#passing-actions-to-the-react-components-public-engine-action) (for the front-end) types.

```ts {{ title: "src/inngest/actions-definition.ts" }}
import { type PublicEngineAction } from "@inngest/workflow-kit";

export const actionsDefinition: PublicEngineAction[] = [
  {
    kind: "grammar_review",
    name: "Perform a grammar review",
    description: "Use OpenAI for grammar fixes",
  },
];

```

```tsx {{ title: "src/inngest/actions.ts" }}
import { type EngineAction } from "@inngest/workflow-kit";

import { actionsDefinition } from "./actions-definition";

export const actions: EngineAction[] = [
  {
    // Add a Table of Contents
    ...actionsDefinition[0],
    handler: async ({ event, step, workflowAction }) => {
	      // implementation...
    }
  },
];
```

In the example above, the `actionsDefinition` array would be passed via props to the [`<Provider />`](/docs-markdown/reference/workflow-kit/components-api) while the `actions` are passed to the [`Engine`](/docs-markdown/reference/workflow-kit/engine).

> **Callout:** Why do I need two types of actions?The actions need to be separated into 2 distinct objects to avoid leaking the action handler implementations and dependencies into the front end:

## Passing actions to the React components: `PublicEngineAction[]`

- `kind` (string): Kind is an enum representing the action's ID.  This is not named as "id" so that we can keep consistency with the WorkflowAction type.

* `name` (string): Name is the human-readable name of the action.

- `description` (string): Description is a short description of the action.

* `icon` (string): Icon is the name of the icon to use for the action.  This may be an URL, or an SVG directly.

## Passing actions to the Workflow Engine: `EngineAction[]`

> **Callout:** Note: Inherits PublicEngineAction properties.

- `handler` (function): The handler is your code that runs whenever the action occurs. Every function handler receives a single object argument which can be deconstructed. The key arguments are event and step.

```ts {{ title: "src/inngest/actions.ts" }}
import { type EngineAction } from "@inngest/workflow-kit";

import { actionsDefinition } from "./actions-definition";

export const actions: EngineAction[] = [
{
    // Add a Table of Contents
    ...actionsDefinition[0],
    handler: async ({ event, step, workflow, workflowAction, state }) => {
        // ...
    }
},
];
```

The details of the `handler()` **unique argument's properties** can be found below:

### `handler()` function argument properties

- `event` (TriggerEvent): See the Inngest Function handler event argument property definition.

* `step` (Step): See the Inngest Function handler step argument property definition.

- `workflow` (Workflow): See the Workflow instance format.

* `workflowAction` (WorkflowAction): WorkflowAction is the action being executed, with fully interpolated inputs.Key properties are:id: string:  The ID of the action within the workflow instance.kind: string: The action kind, as provided in the PublicEngineAction.name?: string: The name, as provided in the PublicEngineAction.description?: string: The description, as provided in the PublicEngineAction.inputs?: string: The record key is the key of the EngineAction input name, and the value is the variable's value.

- `state` (object): State represents the current state of the workflow, with previous action's outputs recorded as key-value pairs.