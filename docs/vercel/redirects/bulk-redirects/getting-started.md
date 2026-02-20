---
title: Getting Started
product: vercel
url: /docs/redirects/bulk-redirects/getting-started
type: how-to
prerequisites:
  - /docs/redirects/bulk-redirects
  - /docs/redirects
related:
  - /docs/projects/project-configuration
  - /docs/cli/redirects
  - /docs/rest-api/reference/endpoints/bulk-redirects
summary: Learn how to import thousands of simple redirects from CSV, JSON, or JSONL files.
---

# Getting Started

Bulk redirects can be specified either as part of a Vercel deployment or updated immediately through the UI, API, or CLI by settings redirects at the Project level without the need for a new deployment.

- [Deployment-time redirects](#deployment-time-redirects)
- [Project-level redirects](#project-redirects)

## Deployment-time redirects

Bulk redirects in deployments are specified in the `bulkRedirectsPath` field in `vercel.json`. `bulkRedirectsPath` can point to either a single file or a folder with up to 100 files. Vercel supports any combination of CSV, JSON, and JSONL files containing redirects, and they can be generated at build time.

Learn more about bulk redirects fields and file formats in the [project configuration documentation](/docs/projects/project-configuration#bulkredirectspath).

- ### Create your redirect file
  You can create fixed files of redirects, or generate them at build time as long as they end up in the location specified by `bulkRedirectsPath` before the build completes.
  ```csv filename="redirects.csv"
  source,destination,permanent
  /old-blog,/blog,true
  /old-about,/about,false
  /legacy-contact,https://example.com/contact,true
  ```

- ### Configure bulkRedirectsPath
  Add the `bulkRedirectsPath` property to your `vercel.json` file, pointing to your redirect file. You can also point to a folder containing multiple redirect files if needed.
  ```json filename="vercel.json"
  {
    "bulkRedirectsPath": "redirects.csv"
  }
  ```

- ### Deploy
  Deploy your project to Vercel. Your bulk redirects will be processed and applied automatically.
  ```bash
  vercel deploy
  ```
  Any errors processing the bulk redirects will appear in the build logs for the deployment.

## Project Redirects

Project-level redirects let you create and update bulk redirects without needing to redeploy. Redirects are staged when created and can be immediately published to production without a new deployment.

- ### Navigate to the Redirects tab
  From your [dashboard](/dashboard), select your project and click the [**Redirects** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fredirects\&title=Go+to+Redirects).

- ### Create a redirect
  Click **Create** and enter the following:
  - **Source**: The path to redirect from (e.g., `/old-page`)
  - **Destination**: The path or URL to redirect to (e.g., `/new-page`)
  - **Status code**: Select `307` (temporary) or `308` (permanent)
  You can also configure whether the redirect should be **case sensitive** (default `false`) or whether **query parameters should be preserved** (default `false`).

- ### Test your changes
  New redirects are staged until you publish them. From the review redirects dialog, click on the **source** path for each redirect to open a staging URL where the new redirects are applied.

- ### Publish your changes
  After testing your redirects, click **Publish** to make your changes live.

### Editing and deleting redirects

To edit or delete a redirect:

1. From the **Redirects** tab, find the redirect you want to modify.
2. Click the three dots menu on the right side of the redirect row.
3. Select **Edit** or **Delete**.
4. Click **Publish** to apply your changes.

### Bulk upload

You can upload multiple redirects at once:

1. From the **Redirects** tab, click the **Create** button and click **CSV**.
2. Select a CSV file containing your redirects.
3. Review the changes and click **Publish**.

### Using the CLI

You can manage redirects using the [Vercel CLI](/docs/cli/redirects). Make sure that you are using at least version `49.1.3` of the CLI.

```bash filename="terminal"
# List all redirects
vercel redirects ls

# List all redirects versions
vercel redirects ls-versions

# Add a redirect
vercel redirects add /old-path /new-path --permanent

# Bulk upload CSV files
vercel redirects upload my-redirects.csv

# Remove a redirect
vercel redirects rm /old-path

# Promote staging redirects
vercel redirects promote 596558a5-24cd-4b94-b91a-d1f4171b7c3f
```

### Using the API

You can also manage redirects programmatically through the [Vercel REST API](/docs/rest-api/reference/endpoints/bulk-redirects). This is useful for automating redirect management from webhook events, such as managing redirects in a CMS and instantly updating Vercel with changes.

```bash filename="terminal"
curl -X PUT "https://api.vercel.com/v1/bulk-redirects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "teamId": "team_123",
    "projectId": "project_123",
    "redirects": [
      {
        "source": "/old-path",
        "destination": "/new-path",
        "permanent": true
      }
    ]
  }'
```


---

[View full sitemap](/docs/sitemap)
