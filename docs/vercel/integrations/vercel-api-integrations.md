---
title: Building Integrations with Vercel REST API
product: vercel
url: /docs/integrations/vercel-api-integrations
type: reference
prerequisites:
  - /docs/integrations
related:
  - /docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables
  - /docs/drains/reference/logs
  - /docs/rest-api/vercel-api-integrations
  - /docs/rest-api/reference/welcome
  - /docs/rest-api
summary: Learn how to use Vercel REST API to build your integrations and work with redirect URLs.
---

# Building Integrations with Vercel REST API

## Using the Vercel REST API

See the following API reference documentation for how to use Vercel REST API to create integrations:

- [Creating a Project Environment Variable](/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables)
- [Forwarding Logs using Log Drains](/docs/drains/reference/logs)
- [Create an Access Token](/docs/rest-api/vercel-api-integrations#create-an-access-token)
- [Interacting with Teams](/docs/rest-api/vercel-api-integrations#interacting-with-teams)
- [Interacting with Configurations](/docs/rest-api/vercel-api-integrations#interacting-with-configurations)
- [Interacting with Vercel Projects](/docs/rest-api/vercel-api-integrations#interacting-with-vercel-projects)

### Create an Access Token

To use Vercel REST API, you need to authenticate with an [access token](/docs/rest-api/reference/welcome#authentication) that contains the necessary [scope](#scopes). You can then provide the API token through the [`Authorization` header](/docs/rest-api#authentication).

#### Exchange `code` for Access Token

When you create an integration, you define a [redirect URL](/docs/integrations/create-integration/submit-integration#redirect-url) that can have query parameters attached.

One of these parameters is the `code` parameter. This short-lived parameter is valid for **30 minutes** and can be exchanged **once** for a long-lived access token using the following API endpoint:

```bash filename="terminal"
{`POST https://api.vercel.com/v2/oauth/access_token`}
```

Pass the following values to the request body in the form of `application/x-www-form-urlencoded`.

| Key               | [Type](/docs/rest-api/reference#types) | Required | Description                                                 |
| ----------------- | ----------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| **client\_id**     | [ID](/docs/rest-api/reference#types)           | Yes      | ID of your application.                                     |
| **client\_secret** | [String](/docs/rest-api/reference#types)       | Yes      | Secret of your application.                                 |
| **code**          | [String](/docs/rest-api/reference#types)       | Yes      | The code you received.                                      |
| **redirect\_uri**  | [String](/docs/rest-api/reference#types)       | Yes      | The Redirect URL you configured on the Integration Console. |

#### Example Request

### Interacting with Teams

The response of your `code` exchange request includes a `team_id` property. If `team_id` is not null, you know that this integration was installed on a team.

If your integration is installed on a team, append the `teamId` query parameter to each API request. See [Accessing Resources Owned by a Team](/docs/rest-api#accessing-resources-owned-by-a-team) for more details.

### Interacting with Configurations

Each installation of your integration is stored and tracked as a configuration.

Sometimes it makes sense to fetch the configuration in order to get more insights about the current scope or the projects your integration has access to.

To see which endpoints are available, see the [Configurations](/docs/project-configuration) documentation for more details.

#### Disabled Integration Configurations

> **⚠️ Warning:** If an owner(s) of an integration leaves the team that's responsible for the
> integration, the integration will be flagged as disabled. The team will
> receive an email to take action (transfer ownership) within 30 days, otherwise
> the integration will be deleted.

When integration configurations are disabled:

- Any API requests will fail with a `403` HTTP status code and a `code` of `integration_configuration_disabled`
- We continue to send `project.created`, `project.removed` and `integration-configuration.removed` webhooks, as these will allow the integration configuration to operate correctly when re-activated. All other webhook delivery will be paused
- Log drains will not receive any logs

### Interacting with Vercel Projects

Deployments made with Vercel are grouped into Projects. This means that each deployment is assigned a name and is grouped into a project with other deployments using that same name.

Using the Vercel REST API, you can modify Projects that the Integration has access to. Here are some examples:

### Modifying Environment Variables on a Project

When building a Vercel Integration, you may want to expose an API token or a configuration URL for deployments within a [Project](/docs/projects/overview).

You can do so by [Creating a Project Environment Variable](/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables) using the API.

> **💡 Note:** Environment Variables created by an Integration will.

## Scopes

When creating integrations the following scopes can be updated within the Integration Console:

> **💡 Note:** Write permissions are required for both
> `project` and `domain` when
> updating the domain of a project.

| Scope                     | Description                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| integration-configuration | Interact with the installation of your integration                                                                                                                                                     |
| deployment                | Interact with deployments                                                                                                                                                                              |
| deployment-check          | Verify deployments with Checks                                                                                                                                                                         |
| edge-config               | Create and manage Edge Configs and their tokens                                                                                                                                                        |
| project                   | Access project details and settings                                                                                                                                                                    |
| project-env-vars          | Create and manage integration-owned project environment variables                                                                                                                                      |
| global-project-env-vars   | Create and manage all account project environment variables                                                                                                                                            |
| team                      | Access team details                                                                                                                                                                                    |
| user                      | Get information about the current user                                                                                                                                                                 |
| log-drain                 | Create and manage log drains to forward logs                                                                                                                                                           |
| domain                    | Manage and interact with domains and certificates. Write permissions are required for both `project` and `domain` when updating the domain of a project. |
| billing                   | Access billing information including charges and contract commitments. Only available to Pro and Enterprise teams.                                                                                     |

### Updating Scopes

As the Vercel REST API evolves, you'll need to update your scopes based on your integration's endpoint usage.

![Image](https://vercel.com/docs-assets/static/docs/integrations/console/confirm-scope-change.png)

Additions and upgrades always require a review and confirmation. To ensure this, every affected user and team owner will be informed through email to undergo this process.
Please make sure you provide a meaningful, short, and descriptive note for your changes.

Scope removals and downgrades won't require user confirmation and will be applied **immediately** to confirmed scopes and pending requested scope changes.

### Confirmed Scope Changes

User and Teams will always confirm **all pending changes** with one confirmation.
That means that if you have requested new scopes multiple times over the past year, the users will see a summary of all pending changes with their respective provided note.

Once a user confirms these changes, scopes get directly applied to the installation. You will also get notified through the new `integration-configuration.scope-change-confirmed` event.

## Common Errors

When using the Vercel REST API with Integrations, you might come across some errors which you can address immediately.

### CORS issues

To avoid CORS issues, make sure you only interact with the Vercel REST API on the **server side**.

Since the token grants access to resources of the Team or Personal Account, you should never expose it on the client side.

For more information on using CORS with Vercel, see [How can I enable CORS on Vercel?](/kb/guide/how-to-enable-cors).

### 403 Forbidden responses

Ensure you are not missing the `teamId` [query parameter](/docs/integrations/create-integration/submit-integration#redirect-url). `teamId` is required if the integration installation is for a Team.
Ensure the Scope of Your [Access Token](/docs/rest-api/vercel-api-integrations#using-the-vercel-api/scopes/teams) is properly set.

## Frequently Asked Questions

### Are integration configuration IDs reused after deletion?

No, integration configuration IDs (`icfg_*`) are not reused after an integration is deleted or uninstalled. Each installation of an integration receives a unique configuration ID that is permanently retired when the integration is removed. If you reinstall the same integration later, a new unique configuration ID will be generated.


---

[View full sitemap](/docs/sitemap)
