---
title: Audit Logs
product: vercel
url: /docs/audit-log
type: reference
prerequisites:
  []
related:
  - /docs/rbac/managing-team-members
  - /docs/rbac/access-roles
  - /docs/plans/enterprise
  - /docs/cli/alias
  - /docs/cli/certs
summary: "Learn how to track and analyze your team members' activities."
---

# Audit Logs

> **🔒 Permissions Required**: Audit Logs

Audit logs help you track and analyze your [team members'](/docs/rbac/managing-team-members) activity. They can be accessed by team members with the [owner](/docs/rbac/access-roles#owner-role) role, and are available to customers on [enterprise](/docs/plans/enterprise) plans.

![Image](`/docs-assets/static/docs/concepts/teams/audit-logs-section-light.png`)

## Export audit logs

To export and download audit logs:

- Go to **Team Settings > Security > Audit Log**
- Select a timeframe to export a Comma Separated Value ([CSV](#audit-logs-csv-file-structure)) file containing all events occurred during that time period
- Click the **Export CSV** button to download the file

The team owner requesting an export will then receive an email with a link containing the report. This link is used to access the report and is valid for 24 hours.

Reports generated for the last 90 days (three months) will not impact your billing.

## Custom SIEM Log Streaming

> **🔒 Permissions Required**: Custom SIEM Log Streaming

In addition to the standard audit log functionalities, Vercel supports custom log streaming to your Security Information and Event Management (SIEM) system of choice. This allows you to integrate Vercel audit logs with your existing observability and security infrastructure.

We support the following SIEM options out of the box:

- AWS S3
- Splunk
- Datadog
- Google Cloud Storage

We also support streaming logs to any HTTP endpoint, secured with a custom header.

### Allowlisting IP Addresses

If your SIEM requires IP allowlisting, please use the following IP addresses:

```3.217.146.166
23.21.184.92
34.204.154.149
44.213.245.178
44.215.236.82
50.16.203.9
52.1.251.34
52.21.49.187
174.129.36.47
```

### Setup Process

To set up custom log streaming to your SIEM:

- From your [dashboard](/dashboard) go to **Team Settings**, select the **Security & Privacy** tab, and scroll to **Audit Log**
- Click the **Configure** button
- Select one of the supported SIEM providers and follow the step-by-step guide

![Image](`/docs-assets/static/docs/concepts/teams/audit-log-streams-light.png`)

The HTTP POST provider is generic solution to stream audit logs to any configured endpoint. To set this up, you need to provide:

- **URL:** The endpoint that will accept HTTP POST requests
- **HTTP Header Name:** The name of the header, such as `Authorization`
- **HTTP Header Value:** The corresponding value, e.g. `Bearer <token>`

For the request body format, you can choose between:

- **JSON:** Sends a JSON array containing event objects
- **NDJSON:** Sends events as newline-delimited JSON objects, enabling individual processing

### Audit Logs CSV file structure

The CSV file can be opened using any spreadsheet-compatible software, and includes the following fields:

| **Property**        | **Description**                                                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **timestamp**       | Time and date at which the event occurred                                                                                                                                                                        |
| **action**          | Name for the specific event. E.g, `project.created`, `team.member.left`, `project.transfer_out.completed`, `auditlog.export.downloaded`, `auditlog.export.requested`, etc. [Learn more about it here](#actions). |
| **actor\_vercel\_id** | User ID of the team member responsible for an event                                                                                                                                                              |
| **actor\_name**      | Account responsible for the action. For example, username of the team member                                                                                                                                     |
| **actor\_email**     | Email address of the team member responsible for a specific event                                                                                                                                                |
| **location**        | IP address from where the action was performed                                                                                                                                                                   |
| **user\_agent**      | Details about the application, operating system, vendor, and/or browser version used by the team member                                                                                                          |
| **previous**        | Custom metadata (JSON object) showing the object's previous state                                                                                                                                                |
| **next**            | Custom metadata (JSON object) showing the object's updated state                                                                                                                                                 |

## `actions`

Vercel logs the following list of `actions` performed by team members.

### `alias`

Maps a custom domain or subdomain to a specific deployment or URL of a project. To learn more, see the `vercel alias` [docs](/docs/cli/alias).

| **Action Name**                                      | **Description**                                                       |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| **`alias.created`**                                  | Indicates that a new alias was created                                |
| **`alias.deleted`**                                  | Indicates that an alias was deleted                                   |
| **`alias.protection-user-access-request-requested`** | An external user requested access to a protected deployment alias URL |

### `auditlog`

Refers to the audit logs of your Vercel team account.

| **Action Name**                  | **Description**                                           |
| -------------------------------- | --------------------------------------------------------- |
| **`auditlog.export.downloaded`** | Indicates that an export of the audit logs was downloaded |
| **`auditlog.export.requested`**  | Indicates that an export of the audit logs was requested  |

### `cert`

A digital certificate to manage SSL/TLS certificates for your custom domains through the [vercel certs](/docs/cli/certs) command. It is used to authenticate the identity of a server and establish a secure connection.

| **Action Name**    | **Description**                              |
| ------------------ | -------------------------------------------- |
| **`cert.created`** | Indicates that a new certificate was created |
| **`cert.deleted`** | Indicates that a new certificate was deleted |
| **`cert.renewed`** | Indicates that a new certificate was renewed |

### `deploy_hook`

Create URLs that accept HTTP POST requests to trigger deployments and rerun the build step. To learn more, see the [Deploy Hooks](/docs/deploy-hooks) docs.

| **Action Name**           | **Description**                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **`deploy_hook.deduped`** | A deploy hook is de-duplicated which means that multiple instances of the same hook have been combined into one |

### `deployment`

Refers to a successful build of your application. To learn more, see the [deployment](/docs/deployments) docs.

| **Action Name**              | **Description**                                               |
| ---------------------------- | ------------------------------------------------------------- |
| **`deployment.deleted`**     | Indicates that a deployment was deleted                       |
| **`deployment.job.errored`** | Indicates that a job in a deployment has failed with an error |

### `domain`

A unique name that identifies your website. To learn more, see the [domains](/docs/domains) docs.

| **Action Name**                    | **Description**                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| **`domain.auto_renew.changed`**    | Indicates that the auto-renew setting for a domain was changed                      |
| **`domain.buy`**                   | Indicates that a domain was purchased                                               |
| **`domain.created`**               | Indicates that a new domain was created                                             |
| **`domain.delegated`**             | Indicates that a domain was delegated to another account                            |
| **`domain.deleted`**               | Indicates that a domain was deleted                                                 |
| **`domain.move_out.requested`**    | Indicates that a request was made to move a domain out of the current account       |
| **`domain.moved_in`**              | Indicates that a domain was moved into the current account                          |
| **`domain.moved_out`**             | Indicates that a domain was moved out of the current account                        |
| **`domain.record.created`**        | Indicates that a new domain record was created                                      |
| **`domain.record.deleted`**        | Indicates that a new domain record was deleted                                      |
| **`domain.record.updated`**        | Indicates that a new domain record was updated                                      |
| **`domain.transfer_in`**           | Indicates that a request was made to transfer a domain into the current account     |
| **`domain.transfer_in.canceled`**  | Indicates that a request to transfer a domain into the current account was canceled |
| **`domain.transfer_in.completed`** | Indicates that a domain was transferred into the current account                    |

### `edge_config`

A key-value data store associated with your Vercel account that enables you to read data in the region closest to the user without querying an external database. To learn more, see the [Edge Config docs](/docs/edge-config).

| **Action Name**           | **Description**                                     |
| ------------------------- | --------------------------------------------------- |
| **`edge_config.created`** | Indicates that a new edge configuration was created |
| **`edge_config.deleted`** | Indicates that a new edge configuration was deleted |
| **`edge_config.updated`** | Indicates that a new edge configuration was updated |

### `integration`

Helps you pair Vercel's functionality with a third-party service to streamline installation, reduce configuration, and increase productivity. To learn more, see the [integrations docs](/docs/integrations).

| **Action Name**             | **Description**                             |
| --------------------------- | ------------------------------------------- |
| **`integration.deleted`**   | Indicates that an integration was deleted   |
| **`integration.installed`** | Indicates that an integration was installed |
| **`integration.updated`**   | Indicates that an integration was updated   |

### `password_protection`

[Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) allows visitors to access preview deployments with a password to manage team-wide access.

| **Action Name**                    | **Description**                                 |
| ---------------------------------- | ----------------------------------------------- |
| **`password_protection.disabled`** | Indicates that password protection was disabled |
| **`password_protection.enabled`**  | Indicates that password protection was enabled  |

### `preview_deployment_suffix`

Customize the appearance of your preview deployment URLs by adding a valid suffix. To learn more, see the [preview deployment suffix](/docs/deployments/generated-urls#preview-deployment-suffix) docs.

| **Action Name**                          | **Description**                                           |
| ---------------------------------------- | --------------------------------------------------------- |
| **`preview_deployment_suffix.disabled`** | Indicates that the preview deployment suffix was disabled |
| **`preview_deployment_suffix.enabled`**  | Indicates that the preview deployment suffix was enabled  |
| **`preview_deployment_suffix.updated`**  | Indicates that the preview deployment suffix was updated  |

### `project`

Refers to actions performed on your Vercel [projects](/docs/projects/overview).

| **Action Name**                    | **Description**                                                       |
| ---------------------------------- | --------------------------------------------------------------------- |
| **`project.analytics.disabled`**   | Indicates that analytics were disabled for the project                |
| **`project.analytics.enabled`**    | Indicates that analytics were enabled for the project                 |
| **`project.deleted`**              | Indicates that a project was deleted                                  |
| **`project.env_variable`**         | This field refers to an environment variable within a project         |
| **`project.env_variable.created`** | Indicates that a new environment variable was created for the project |
| **`project.env_variable.deleted`** | Indicates that a new environment variable was deleted for the project |
| **`project.env_variable.updated`** | Indicates that a new environment variable was updated for the project |

### `project.password_protection`

Refers to the password protection settings for a project.

| **Action Name**                            | **Description**                                                 |
| ------------------------------------------ | --------------------------------------------------------------- |
| **`project.password_protection.disabled`** | Indicates that password protection was disabled for the project |
| **`project.password_protection.enabled`**  | Indicates that password protection was enabled for the project  |
| **`project.password_protection.updated`**  | Indicates that password protection was updated for the project  |

### `project.sso_protection`

Refers to the [Single Sign-On (SSO)](/docs/saml) protection settings for a project.

| **Action Name**                       | **Description**                                            |
| ------------------------------------- | ---------------------------------------------------------- |
| **`project.sso_protection.disabled`** | Indicates that SSO protection was disabled for the project |
| **`project.sso_protection.enabled`**  | Indicates that SSO protection was enabled for the project  |
| **`project.sso_protection.updated`**  | Indicates that SSO protection was updated for the project  |

### `project.rolling_release`

Refers to [Rolling Releases](/docs/rolling-releases) for a project, which allow you to gradually roll out deployments to production.

| **Action Name**                          | **Description**                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------- |
| **`project.rolling_release.aborted`**    | Indicates that a rolling release was aborted                                 |
| **`project.rolling_release.approved`**   | Indicates that a rolling release was approved to advance to the next stage   |
| **`project.rolling_release.completed`**  | Indicates that a rolling release was completed successfully                  |
| **`project.rolling_release.configured`** | Indicates that the rolling release configuration was updated for the project |
| **`project.rolling_release.deleted`**    | Indicates that a rolling release was deleted                                 |
| **`project.rolling_release.started`**    | Indicates that a rolling release was started                                 |

### `project.transfer`

Refers to the transfer of a project between Vercel accounts.

| **Action Name**                      | **Description**                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| **`project.transfer_in.completed`**  | Indicates that a project transfer into the current account was completed successfully   |
| **`project.transfer_in.failed`**     | Indicates that a project transfer into the current account was failed                   |
| **`project.transfer_out.completed`** | Indicates that a project transfer out of the current account was completed successfully |
| **`project.transfer_out.failed`**    | Indicates that a project transfer out of the current account was                        |
| **`project.transfer.started`**       | Indicates that a project transfer was initiated                                         |

### `project.web-analytics`

Refers to the generation of web [analytics](/docs/analytics) for a Vercel project.

| **Action Name**                      | **Description**                                            |
| ------------------------------------ | ---------------------------------------------------------- |
| **`project.web-analytics.disabled`** | Indicates that web analytics were disabled for the project |
| **`project.web-analytics.enabled`**  | Indicates that web analytics were enabled for the project  |

### `shared_env_variable`

Refers to environment variables defined at the team level. To learn more, see the [shared environment variables](/docs/environment-variables/shared-environment-variables) docs.

| **Action Name**                     | **Description**                                                |
| ----------------------------------- | -------------------------------------------------------------- |
| **`shared_env_variable.created`**   | Indicates that a new shared environment variable was created   |
| **`shared_env_variable.decrypted`** | Indicates that a new shared environment variable was decrypted |
| **`shared_env_variable.deleted`**   | Indicates that a new shared environment variable was deleted   |
| **`shared_env_variable.updated`**   | Indicates that a new shared environment variable was updated   |

### `team`

Refers to actions performed by members of a Vercel [team](/docs/accounts/create-a-team).

| **Action Name**           | **Description**                                                                  |
| ------------------------- | -------------------------------------------------------------------------------- |
| **`team.avatar.updated`** | Indicates that the avatar (profile picture) associated with the team was updated |
| **`team.created`**        | Indicates that a new team was created                                            |
| **`team.deleted`**        | Indicates that a new team was deleted                                            |
| **`team.name.updated`**   | Indicates that the name of the team was updated                                  |
| **`team.slug.updated`**   | Indicates that the team's unique identifier, or "slug," was updated              |

### `team.member`

Refers to actions performed by any [team member](/docs/accounts/team-members-and-roles).

| **Action Name**                            | **Description**                                                 |
| ------------------------------------------ | --------------------------------------------------------------- |
| **`team.member.access_request.confirmed`** | Indicates that an access request by a team member was confirmed |
| **`team.member.access_request.declined`**  | Indicates that an access request by a team member was declined  |
| **`team.member.access_request.requested`** | Indicates that a team member has requested access to the team   |
| **`team.member.added`**                    | Indicates that a new member was added to the team               |
| **`team.member.deleted`**                  | Indicates that a member was removed from the team               |
| **`team.member.joined`**                   | Indicates that a member has joined the team                     |
| **`team.member.left`**                     | Indicates that a new member has left the team                   |
| **`team.member.role.updated`**             | Indicates that the role of a team member was updated            |


---

[View full sitemap](/docs/sitemap)
