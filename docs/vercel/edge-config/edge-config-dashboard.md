---
title: Managing Edge Configs with the Dashboard
product: vercel
url: /docs/edge-config/edge-config-dashboard
type: how-to
prerequisites:
  - /docs/edge-config
related:
  - /docs/accounts
  - /docs/projects/overview
  - /docs/dashboard-features
  - /docs/edge-config/using-edge-config
  - /docs/edge-config/edge-config-limits
summary: Learn how to create, view and update your Edge Configs and the data inside them in your Vercel Dashboard at the Hobby team, team, and project levels.
---

# Managing Edge Configs with the Dashboard

You can create, view and update your [Edge Configs](/edge-config), and the data inside them, in your Vercel Dashboard at both the [account level](/docs/accounts) and the [project level](/docs/projects/overview).

## Creating an Edge Config

### At the account level

To add an Edge Config at the Hobby team or team level, follow these steps:

1. Make sure that you are in the [right Hobby team or team](/docs/dashboard-features)

2. Click on the **Storage** tab

3. Click the **Create Store** button

4. Type a name for your Edge Config in the dialog and click **Create**. The name shouldn't exceed 32 characters and can only contain alphanumeric letters, "\_", and "-".

5. On creation, you are taken to the `my_edge_config_id` config page. By default, a key-value pair of `"greeting": "hello world"` is created. On the detail page of the newly created Edge Config you can:
   - View and manage stored items
   - Connect projects to and disconnect projects from this Edge Config
   - Generate, copy, and delete tokens associated with this Edge Config

Your Edge Config is now ready to be used. You can also [create an Edge Config at the project level](/docs/edge-config/edge-config-dashboard#at-the-project-level).

> **💡 Note:** If you're creating a project at the account-level, we won't automatically
> create a token, connection string, and environment variable until a project
> has been connected.

### At the project level

1. Navigate to your [project](/docs/projects/overview) page and click on the **Edge Config** tab

2. Click **Create Project Store** and type a name slug for your Edge Config in the dialog that opens. The name shouldn't exceed 32 characters and can only contain alphanumeric letters, "\_", and "-".

3. Click **Create**.

4. Once created, you can click on the Edge Config to [manage it](#managing-edge-configs). The following items are automatically created:
   - An environment variable `EDGE_CONFIG` that holds a [connection string](/docs/edge-config/using-edge-config#using-a-connection-string). If you go to your project's **Settings > Environment Variables**, you'll see the newly created environment variable.
   - A [read access token](/docs/edge-config/using-edge-config#creating-a-read-access-token). This token, along with your **EDGE CONFIG ID** is used to create a [connection string](/docs/edge-config/using-edge-config#using-a-connection-string). This connection string is saved as the value of your `EDGE_CONFIG` environment variable. Using this enables you to use the SDK in your project to read the contents of the store.

## Managing Edge Configs

To view a list of all Edge Configs available in your Hobby team or team, go to **Storage** then select **Edge Config** from the drop-down after making sure that you are in the [correct Hobby team or team](/docs/dashboard-features).

![Image](https://vercel.com/docs-assets/static/docs/storage/edge-config/edge-config-view-all-configs-light.png)

*List of Edge Configs in a team account*

In the **Used by** column, you can see in which project(s) the Edge Config is used. The right column shows the size of the data contained in the config. To manage the Edge Config, its store and tokens, click on the Edge Config's row to open the detail page.

![Image](https://vercel.com/docs-assets/static/docs/storage/edge-config/edge-config-usage-light.png)

*Edge Config detail page*

To rename the Edge Config, select the **Settings** item in the sidebar, update the Edge Config Name, and select **Save**.

To delete the Edge Config, select the **Settings** item in the sidebar, then select **Delete Edge Config**.

## Managing items in the store

The default view of the Edge Config's detail page shows the list of all items in the store. You will see an open accordion titled **Learn how to use this in code** if the Edge Config is connected to at least one project. This accordion provides the steps with a code example on how to read your store items.

To add, edit or delete any item in your store, edit the `json` object in the right panel and click **Save Items**.

### Restoring Edge Config backups

Backups of your Edge Config are automatically created when you make changes, and are stored for a [length of time](/docs/edge-config/edge-config-limits#backup-retention) determined by your plan. To restore one:

1. From your dashboard, select the **Storage** tab and then select your Edge Config
2. From the left section, select the **Backups** tab
3. From the list, select the backup that you would like to view. You'll be taken to the **Items** tab to view a comparison of the backup version and current version
4. To restore the backup, select the **Restore** button and confirm the action

To learn more about backups, see [Edge Config backups](/docs/edge-config/using-edge-config#edge-config-backups).

> **💡 Note:** When protected by a JSON schema, the backup must pass schema validation to be
> restored.

## Schema validation

You can protect your Edge Config by adding a JSON schema to it. Vercel uses this schema to validate the data that is added to the store and prevent updates that fail validation. To add a schema:

1. From your dashboard, select the **Storage** tab and then select your Edge Config
2. Toggle the **Schema** button to open the schema editing tab
3. Enter your [JSON schema](https://json-schema.org/) into the editor. Vercel will use the schema to validate your data in real-time
4. Click **Save**. This will save changes to both the schema and data

The following snippet is an example of a schema that allows you to set boolean flags and a list of redirects.

```json filename="schema.json"
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "additionalProperties": false,
  "required": ["flags", "redirects"],
  "properties": {
    "flags": {
      "type": "object",
      "patternProperties": {
        "^.*$": {
          "type": "boolean"
        }
      }
    },
    "redirects": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": { "type": "string" },
          "to": { "type": "string" }
        }
      }
    }
  }
}
```

## Managing connected projects

![Image](https://vercel.com/docs-assets/static/docs/storage/edge-config/edge-config-projects-light.png)

*List of connected projects*

Click on **Projects** in the left panel of the Edge Config detail page to open a view that shows the projects connected with this Edge Config.

To delete a connection, click on the vertical ellipsis  icon on the right hand side of the row and click **Delete environment variable** and confirm by clicking **Delete connection** in the dialog.

Deleting a connection does not delete the underlying token used by that Connection String. To learn how to delete tokens, review [Managing read access tokens](#managing-read-access-tokens).

To connect the Edge Config with another project, click **Connect Project**, find the project from the drop-down in the dialog and click **Connect**. If you receive a warning that this project already has an `EDGE_CONFIG` environment variable, open the **Advanced Options** and change the environment variable name in the corresponding field to a name other than `EDGE_CONFIG`. The **Connect** button will be enabled once the new environment variable does not already exist in the project.

## Managing read access tokens

![Image](https://vercel.com/docs-assets/static/docs/storage/edge-config/edge-config-tokens-light.png)

*List of tokens*

To delete a token, click on the vertical ellipsis  icon on the right hand side of the token's row and click **Delete Token** and confirm by clicking **Delete Token** in the dialog.

You can copy the connection string to be used in your code by clicking on **Copy Connection String** from the same pop up from the vertical ellipsis  icon.

You can generate a new token by clicking the **Generate Token** button, typing a name slug in the dialog that opens and clicking **Create**.

## Up Next


---

[View full sitemap](/docs/sitemap)
