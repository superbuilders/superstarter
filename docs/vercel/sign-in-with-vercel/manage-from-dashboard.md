---
title: Manage Sign in with Vercel from the Dashboard
product: vercel
url: /docs/sign-in-with-vercel/manage-from-dashboard
type: how-to
prerequisites:
  - /docs/sign-in-with-vercel
related:
  - /docs/sign-in-with-vercel/authorization-server-api
  - /docs/rest-api
  - /docs/sign-in-with-vercel/scopes-and-permissions
summary: Learn how to manage Sign in with Vercel from the Dashboard
---

# Manage Sign in with Vercel from the Dashboard

## Create an App

To manage any third-party apps, or create a new one yourself, you need to create an App. An App acts as an intermediary that requests and manages access to resources on behalf of the user. It communicates with the [Vercel Authorization Server](/docs/sign-in-with-vercel/authorization-server-api) to get tokens which act as credentials for accessing protected resources through the [Vercel REST API](/docs/rest-api).

To create an App, follow these steps:

1. Navigate to your teams [**Settings**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings\&title=Go+to+team+settings) tab
2. Scroll down and select **Apps**, and click **Create**
3. Choose a name for your app
4. Choose a slug for your app (The slug is automatically generated from the name if you don't provide one)
5. Optionally add a logo for your app
6. Click **Save**

| Field | Required | Description                                                                                                                          |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Name  | Yes      | The name of your app. It must be unique across all Vercel applications. Example: `My App`                                            |
| Slug  | Yes      | The slug of your app. A URL friendly name that uniquely identifies your app. Defaults to the name if not provided. Example: `my-app` |
| Logo  | Optional | The logo that represents your app.                                                                                                   |

## Choose your client authentication method

The client authentication method determines how your app will authenticate with the Vercel Authorization Server. You can enable multiple methods to provide flexibility for your app in different deployment scenarios.

| Field                 | Description                                           | Usage                                                                                                                  | Security                                                                                          |
| --------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `client_secret_basic` | HTTP Basic Authentication Scheme                      | Client credentials are sent via HTTP Basic Authentication header (Authorization: Basic `<base64-encoded-credentials>`) | Suitable for server-side applications that can securely store credentials                         |
| `client_secret_post`  | HTTP request body as a form parameter                 | Client credentials are included as form parameters in the request body (`client_id` and `client_secret`)               | The same as `client_secret_basic`                                                                 |
| `client_secret_jwt`   | JSON Web Token (JWT)                                  | Client authenticates using a JWT signed with the shared client secret                                                  | Provides additional security by avoiding the transmission of the client secret in requests        |
| `none`                | For public, unauthenticated, non-confidential clients | No client authentication required - suitable for public applications that cannot securely store secrets                | For single page applications (SPAs), mobile apps, and CLIs that cannot securely store credentials |

## Generate a client secret

Client secrets are used to authenticate your app with the Vercel Authorization Server. You can generate a client secret by clicking the **Generate** button.

> **💡 Note:** You can have up to two active client secrets at a time. This lets you rotate
> secrets without downtime.

## Configure the authorization callback URL

The authorization callback URL is where Vercel redirects users after they authorize your app. This URL must be registered to prevent unauthorized redirects and protect against malicious attacks.

To add a callback URL:

1. Navigate to the **Manage** page for your app
2. Scroll to **Authorization Callback URLs**
3. Enter your callback URL
4. Click **Add**

For local development, add `http://localhost:3000/api/auth/callback`. For production, add `https://your-domain.com/api/auth/callback`. For Apps hosted on Vercel, instead of specifying a custom domain for the callback URL, you can instead select a Vercel project from a dropdown in the UI. This will let you configure an authorization URL matching any of your App's deployment domains.

When a user authorizes your app, Vercel redirects them to this URL with a `code` query parameter. Your application exchanges this code for tokens using the [Token Endpoint](/docs/sign-in-with-vercel/authorization-server-api#token-endpoint).

## Configure the necessary permissions

Permissions control what data your app can access. Configure them from the **Permissions** page in your app settings.

To configure permissions:

1. Navigate to the **Manage** page for your app
2. Select the **Permissions** tab
3. Enable the scopes and permissions your app needs:
   - **openid**: Required to issue an ID Token for user identification
   - **email**: Access the user's email address in the ID Token
   - **profile**: Access the user's name, username, and profile picture in the ID Token
   - **offline\_access**: Issue a Refresh Token to get new Access Tokens without re-authentication
4. Click **Save**

When users authorize your app, they'll see these permissions on the consent page and decide whether to grant access.

Learn more about scopes and permissions in the [scopes and permissions](/docs/sign-in-with-vercel/scopes-and-permissions) documentation.


---

[View full sitemap](/docs/sitemap)
