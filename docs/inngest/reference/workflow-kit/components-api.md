# Components API (React)

The [`@inngest/workflow-kit`](https://npmjs.com/package/@inngest/workflow-kit) package provides a set of React components, enabling you to build a workflow editor UI in no time!

![workflow-kit-announcement-video-loop.gif](/assets/docs-markdown/reference/workflow-kit/workflow-demo.gif)

## Usage

```tsx {{ title: "src/components/my-workflow-editor.ts" }}
import { useState } from "react";
import { Editor, Provider, Sidebar, type Workflow } from "@inngest/workflow-kit/ui";

// import `PublicEngineAction[]`
import { actionsDefinitions } from "@/inngest/actions-definitions";

// NOTE - Importing CSS from JavaScript requires a bundler plugin like PostCSS or CSS Modules
import "@inngest/workflow-kit/ui/ui.css";
import "@xyflow/react/dist/style.css";

export const MyWorkflowEditor = ({ workflow }: { workflow: Workflow }) => {
  const [workflowDraft, updateWorkflowDraft] =
    useState<typeof workflow>(workflow);

  return (
    <Provider
      workflow={workflowDraft}
      trigger={{ event: { name: 'blog-post.updated' } }}
      availableActions={actionsDefinitions}
      onChange={updateWorkflowDraft}
    >
      <Editor>
        <Sidebar position="right"></Sidebar>
      </Editor>
    </Provider>
  );
};
```

## Reference

### `<Provider>`

> **Callout:** \<Provider> is a Controlled Component, watching the workflow=\{} to update.Make sure to updated workflow=\{} based on the updates received via onChange=\{}.

- `workflow` (Workflow): A Workflow instance object.

* `trigger` (object): An object with a name: string property representing an event name.

- `availableActions` (PublicEngineAction\[]): See the PublicEngineActionEngineAction\[] reference.

* `onChange` (function): A callback function, called after each workflow changes.

- `{children}` (React.ReactNode): The \<Provider> component should always get the following tree as children:

```tsx
<Editor>
  <Sidebar position="right"></Sidebar>
</Editor>
```