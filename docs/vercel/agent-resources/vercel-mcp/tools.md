---
title: Tools
product: vercel
url: /docs/agent-resources/vercel-mcp/tools
type: conceptual
prerequisites:
  - /docs/agent-resources/vercel-mcp
  - /docs/agent-resources
related:
  - /docs/accounts
  - /docs/projects
  - /docs/deployments
  - /docs/functions
  - /docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links
summary: Learn about tools on Vercel.
---

# Tools

The Vercel MCP server provides [MCP tools](https://modelcontextprotocol.io/specification/2025-06-18/server/tools) that let AI assistants search documentation, manage projects, view deployments, and more.

> **💡 Note:** To enhance security, enable human confirmation for tool execution and exercise
> caution when using Vercel MCP alongside other servers to prevent prompt
> injection attacks.

## Documentation tools

### search\_documentation

Search Vercel documentation for specific topics and information.

| Parameter | Type   | Required | Default | Description                                                     |
| --------- | ------ | -------- | ------- | --------------------------------------------------------------- |
| `topic`   | string | Yes      | -       | Topic to focus the search on (e.g., 'routing', 'data-fetching') |
| `tokens`  | number | No       | 2500    | Maximum number of tokens to include in the result               |

**Sample prompt:** "How do I configure custom domains in Vercel?"

## Project Management Tools

### list\_teams

List all [teams](/docs/accounts) that include the authenticated user as a member.

**Sample prompt:** "Show me all the teams I'm part of"

### list\_projects

List all Vercel [projects](/docs/projects) associated with a user.

| Parameter | Type   | Required | Default | Description                                                                                                                                                                                     |
| --------- | ------ | -------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `teamId`  | string | Yes      | -       | The team ID to list projects for. Alternatively the team slug can be used. Team IDs start with 'team\_'. Can be found by reading `.vercel/project.json` (orgId) or using the `list_teams` tool. |

**Sample prompt:** "Show me all projects in my personal account"

### get\_project

Get detailed information about a specific [project](/docs/projects) including framework, domains, and latest deployment.

| Parameter   | Type   | Required | Default | Description                                                                                                                                                                                         |
| ----------- | ------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId` | string | Yes      | -       | The project ID to get details for. Alternatively the project slug can be used. Project IDs start with 'prj\_'. Can be found by reading `.vercel/project.json` (projectId) or using `list_projects`. |
| `teamId`    | string | Yes      | -       | The team ID to get project details for. Alternatively the team slug can be used. Team IDs start with 'team\_'. Can be found by reading `.vercel/project.json` (orgId) or using `list_teams`.        |

**Sample prompt:** "Get details about my next-js-blog project"

## Deployment Tools

### list\_deployments

List [deployments](/docs/deployments) associated with a specific project with creation time, state, and target information.

| Parameter   | Type   | Required | Default | Description                                   |
| ----------- | ------ | -------- | ------- | --------------------------------------------- |
| `projectId` | string | Yes      | -       | The project ID to list deployments for        |
| `teamId`    | string | Yes      | -       | The team ID to list deployments for           |
| `since`     | number | No       | -       | Get deployments created after this timestamp  |
| `until`     | number | No       | -       | Get deployments created before this timestamp |

**Sample prompt:** "Show me all deployments for my blog project"

### get\_deployment

Get detailed information for a specific [deployment](/docs/deployments) including build status, regions, and metadata.

| Parameter | Type   | Required | Default | Description                                                                                                                                                                                 |
| --------- | ------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idOrUrl` | string | Yes      | -       | The unique identifier or hostname of the deployment                                                                                                                                         |
| `teamId`  | string | Yes      | -       | The team ID to get the deployment for. Alternatively the team slug can be used. Team IDs start with 'team\_'. Can be found by reading `.vercel/project.json` (orgId) or using `list_teams`. |

**Sample prompt:** "Get details about my latest production deployment for the blog project"

### get\_deployment\_build\_logs

Get the build logs of a deployment by deployment ID or URL. You can use this to investigate why a deployment failed.

| Parameter | Type   | Required | Default | Description                                                                                                                                                                                      |
| --------- | ------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `idOrUrl` | string | Yes      | -       | The unique identifier or hostname of the deployment                                                                                                                                              |
| `limit`   | number | No       | 100     | Maximum number of log lines to return                                                                                                                                                            |
| `teamId`  | string | Yes      | -       | The team ID to get the deployment logs for. Alternatively the team slug can be used. Team IDs start with 'team\_'. Can be found by reading `.vercel/project.json` (orgId) or using `list_teams`. |

**Sample prompt:** "Show me the build logs for the failed deployment"

### get\_runtime\_logs

Get runtime logs for a project or deployment. Runtime logs include application output such as console.log messages, errors, and other execution details from [Vercel Functions](/docs/functions) during requests. You can filter logs by environment, log level, status code, source, time range, and full-text search. This makes it easier to debug runtime issues, monitor application behavior, and investigate production errors.

| Parameter      | Type   | Required | Default | Description                                                                                                                                                                                        |
| -------------- | ------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectId`    | string | Yes      | -       | The project ID to get runtime logs for                                                                                                                                                             |
| `teamId`       | string | Yes      | -       | The team ID to get runtime logs for. Alternatively the team slug can be used. Team IDs start with 'team\_'. Can be found by reading `.vercel/project.json` (orgId) or using the `list_teams` tool. |
| `deploymentId` | string | No       | -       | Filter logs to a specific deployment ID or URL                                                                                                                                                     |
| `environment`  | string | No       | -       | Filter by environment: `production` or `preview`                                                                                                                                                   |
| `level`        | array  | No       | -       | Filter by log level(s). Can specify multiple levels: `error`, `warning`, `info`, `fatal`                                                                                                           |
| `statusCode`   | string | No       | -       | Filter by HTTP status code (e.g., "500", "4xx")                                                                                                                                                    |
| `source`       | array  | No       | -       | Filter by source type(s). Can specify multiple sources: `serverless`, `edge-function`, `edge-middleware`, `static`                                                                                 |
| `since`        | string | No       | 24h ago | Start time - ISO format or relative time (e.g., "1h", "30m", "7d")                                                                                                                                 |
| `until`        | string | No       | now     | End time - ISO format or relative time                                                                                                                                                             |
| `limit`        | number | No       | 50      | Maximum number of log entries to return (max 1000)                                                                                                                                                 |
| `query`        | string | No       | -       | Full-text search query to filter logs                                                                                                                                                              |
| `requestId`    | string | No       | -       | Filter by specific request ID                                                                                                                                                                      |

**Sample prompt:** "Show me the runtime error logs for my project from the last hour"

## Domain Management Tools

### check\_domain\_availability\_and\_price

Check if domain names are available for purchase and get pricing information.

| Parameter | Type  | Required | Default | Description                                                                         |
| --------- | ----- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `names`   | array | Yes      | -       | Array of domain names to check availability for (e.g., \['example.com', 'test.org']) |

**Sample prompt:** "Check if mydomain.com is available"

### buy\_domain

Purchase a domain name with registrant information.

| Parameter       | Type    | Required | Default | Description                                                     |
| --------------- | ------- | -------- | ------- | --------------------------------------------------------------- |
| `name`          | string  | Yes      | -       | The domain name to purchase (e.g., example.com)                 |
| `expectedPrice` | number  | No       | -       | The price you expect to be charged for the purchase             |
| `renew`         | boolean | No       | true    | Whether the domain should be automatically renewed              |
| `country`       | string  | Yes      | -       | The country of the domain registrant (e.g., US)                 |
| `orgName`       | string  | No       | -       | The company name of the domain registrant                       |
| `firstName`     | string  | Yes      | -       | The first name of the domain registrant                         |
| `lastName`      | string  | Yes      | -       | The last name of the domain registrant                          |
| `address1`      | string  | Yes      | -       | The street address of the domain registrant                     |
| `city`          | string  | Yes      | -       | The city of the domain registrant                               |
| `state`         | string  | Yes      | -       | The state/province of the domain registrant                     |
| `postalCode`    | string  | Yes      | -       | The postal code of the domain registrant                        |
| `phone`         | string  | Yes      | -       | The phone number of the domain registrant (e.g., +1.4158551452) |
| `email`         | string  | Yes      | -       | The email address of the domain registrant                      |

**Sample prompt:** "Buy the domain mydomain.com"

## Access Tools

### get\_access\_to\_vercel\_url

Create a temporary [shareable link](/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) that grants access to protected Vercel deployments.

| Parameter | Type   | Required | Default | Description                                                              |
| --------- | ------ | -------- | ------- | ------------------------------------------------------------------------ |
| `url`     | string | Yes      | -       | The full URL of the Vercel deployment (e.g., 'https://myapp.vercel.app') |

**Sample prompt:** "myapp.vercel.app is protected by auth. Please create a shareable link for it"

### web\_fetch\_vercel\_url

Fetch content directly from a Vercel deployment URL (with [authentication](/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) if required).

| Parameter | Type   | Required | Default | Description                                                                                         |
| --------- | ------ | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `url`     | string | Yes      | -       | The full URL of the Vercel deployment including the path (e.g., 'https://myapp.vercel.app/my-page') |

**Sample prompt:** "Make sure the content from my-app.vercel.app/api/status looks right"

## CLI Tools

### use\_vercel\_cli

Instructs the LLM to use Vercel CLI commands with --help flag for information.

| Parameter | Type   | Required | Default | Description                                 |
| --------- | ------ | -------- | ------- | ------------------------------------------- |
| `command` | string | No       | -       | Specific Vercel CLI command to run          |
| `action`  | string | Yes      | -       | What you want to accomplish with Vercel CLI |

**Sample prompt:** "Help me deploy this project using Vercel CLI"

### deploy\_to\_vercel

Deploy the current project to Vercel.

**Sample prompt:** "Deploy this project to Vercel"


---

[View full sitemap](/docs/sitemap)
