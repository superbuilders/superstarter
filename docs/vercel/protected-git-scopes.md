---
title: Restricting Git Connections to a single Vercel team
product: vercel
url: /docs/protected-git-scopes
type: conceptual
prerequisites:
  []
related:
  - /docs/rbac/access-roles
summary: Information to stop developers from deploying their repositories to a personal Vercel account by using Protected Git Scopes.
---

# Restricting Git Connections to a single Vercel team

> **🔒 Permissions Required**: Protected Git Scopes

Teams often need control over who can deploy their repositories to which teams or accounts. For example, a user on your team may accidentally try to deploy your project on their personal Vercel Account. To control this, you can add a Protected Git Scope.

Protected Git Scopes restrict Vercel account and team access to Organization-level Git repositories. This ensures that only authorized Vercel teams can deploy your repositories.

## Managing Protected Git Scopes

You can [add](#adding-a-protected-git-scope) up to five Protected Git Scopes to your Vercel Team. Protected Git Scopes are configured at the team level, not per project. Multiple teams can specify the same scope, allowing both teams access.

In order to add a Protected Git Scope to your Vercel Team, you must be an [Owner](/docs/rbac/access-roles#owner-role) of the Vercel Team, and have the required permission in the Git namespace.

For Github you must be an `admin`, for Gitlab you must be an `owner`, and for Bitbucket you must be a `owner`.

## Adding a Protected Git Scope

To add a Protected Git Scopes:

1. Go to your Team's dashboard and select the **Settings** tab
2. In the **Security & Privacy** section, go to **Protected Git Scopes**

![Image](https://vercel.com/docs-assets/static/docs/security/protected-git-scopes-light.png)

3. Select **Add** to add a new Protected Git Scope
4. In the modal, select the Git provider you wish to add:

   ![Image](https://vercel.com/docs-assets/static/docs/security/protected-git-scopes-modal-1-light.png)
5. In the modal, select the Git namespace you wish to add:

   ![Image](https://vercel.com/docs-assets/static/docs/security/protected-git-scopes-modal-2-light.png)
6. Click **Save**

## Removing a Protected Git Scope

To remove a Protected Git Scopes:

1. Go to your Team's dashboard and select the **Settings** tab.
2. In the **Security & Privacy** section, go to **Protected Git Scopes**

![Image](https://vercel.com/docs-assets/static/docs/security/protected-git-scopes-light.png)

3. Select **Remove** to remove the Protected Git Scope


---

[View full sitemap](/docs/sitemap)
