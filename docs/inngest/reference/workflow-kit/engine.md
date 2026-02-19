# Using the workflow engine

The workflow `Engine` is used to run a given [workflow instance](/docs-markdown/reference/workflow-kit/workflow-instance) within an Inngest Function:

```tsx {{ title: "src/inngest/workflow.ts" }}
import { Engine, type Workflow } from "@inngest/workflow-kit";

import { inngest } from "./client";
import { actions } from "./actions";
import { loadWorkflowInstanceFromEvent } from "./loaders";

const workflowEngine = new Engine({
  actions: actionsWithHandlers,
  loader: (event) => {
    return loadWorkflowInstanceFromEvent(event);
  },
});

export default inngest.createFunction(
  { id: "blog-post-workflow" },
  { event: "blog-post.updated" },
  async ({ event, step }) => {
    // When `run` is called,
    //  the loader function is called with access to the event
    await workflowEngine.run({ event, step });
  }
);

```

## Configure

- `actions` (EngineAction\[]): See the EngineAction\[] reference.

* `loader` (function): An async function receiving the event as unique argument and returning a valid Workflow instance object.

- `disableBuiltinActions` (boolean): For selectively adding built-in actions, set this to true and expose the actions you want via the \<Provider> availableActions prop.