# Workflow instance

A workflow instance represents a user configuration of a sequence of [workflow actions](/docs-markdown/reference/workflow-kit/actions), later provided to the [workflow engine](/docs-markdown/reference/workflow-kit/engine) for execution.

Example of a workflow instance object:

```json
{
  "name": "Generate social posts",
  "edges": [
    {
      "to": "1",
      "from": "$source"
    },
    {
      "to": "2",
      "from": "1"
    }
  ],
  "actions": [
    {
      "id": "1",
      "kind": "generate_tweet_posts",
      "name": "Generate Twitter posts"
    },
    {
      "id": "2",
      "kind": "generate_linkedin_posts",
      "name": "Generate LinkedIn posts"
    }
  ]
}
```

> **Callout:** How to use the workflow instance objectWorkflow instance objects are meant to be retrieved from the \<Provider> Editor, stored in database and loaded into the Workflow Engine using a loader.Use this reference if you need to update the workflow instance between these steps.

## `Workflow`

A Workflow instance in an object with the following properties:

- `name` (string): Name of the worklow configuration, provided by the end-user.

* `description` (string): description of the worklow configuration, provided by the end-user.

- `actions` (WorkflowAction\[]): See the WorkflowAction reference below.

* `edges` (WorkflowEdge\[]): See the WorkflowEdge reference below.

## `WorkflowAction`

`WorkflowAction` represent a step of the workflow instance linked to an defined [`EngineAction`](/docs-markdown/reference/workflow-kit/actions).

- `id` (string): The ID of the action within the workflow instance.  This is used as a reference and must be unique within the Instance itself.

* `kind` (string): The action kind, used to look up the EngineAction definition.

- `name` (string): Name is the human-readable name of the action.

* `description` (string): Description is a short description of the action.

- `inputs` (object): Inputs is a list of configured inputs for the EngineAction.The record key is the key of the EngineAction input name, and
  the value is the variable's value.This will be type checked to match the EngineAction type before
  save and before execution.Ref inputs for interpolation are "!ref($.\<path>)", eg. "!ref($.event.data.email)"

## `WorkflowEdge`

A `WorkflowEdge` represents the link between two `WorkflowAction`.

- `from` (string): The WorkflowAction.id of the source action."$source" is a reserved value used as the starting point of the worklow instance.

* `to` (string): The WorkflowAction.id of the next action.