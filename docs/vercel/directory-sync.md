---
title: Directory Sync
product: vercel
url: /docs/directory-sync
type: conceptual
prerequisites:
  []
related:
  - /docs/rbac/access-roles
  - /docs/rbac/managing-team-members
  - /docs/dashboard-features
  - /docs/saml
summary: Learn how to configure Directory Sync for your Vercel Team.
---

# Directory Sync

> **🔒 Permissions Required**: Directory Sync

Directory Sync helps teams manage their organization membership from a third-party identity provider like Google Directory or Okta. Directory Sync is only available for **Enterprise Teams** and can only be configured by [**Team Owners**](/docs/rbac/access-roles#owner-role).

When Directory Sync is configured, changes to your Directory Provider will automatically be synced with your [team members](/docs/rbac/managing-team-members). The previously existing permissions/roles will be overwritten by Directory Sync, including current user performing the sync.

> **💡 Note:** Make sure that you still have the right permissions/role after configuring
> Directory Sync, [otherwise you might lock yourself
> out.](#preventing-account-lockout)

All team members will receive an email detailing the change. For example, if a new user is added to your Okta directory, that user will automatically be invited to join your Vercel Team. If a user is removed, they will automatically be removed from the Vercel Team.

You can configure a mapping between your Directory Provider's groups and a Vercel Team role. For example, your **Engineers** group on Okta can be configured with the [member](/docs/rbac/access-roles#member-role) role on Vercel, and your **Admin** group can use the [owner](/docs/rbac/access-roles#owner-role) role.

## Configuring Directory Sync

To configure directory sync for your team:

1. Ensure your team is selected in the [scope selector](/docs/dashboard-features)
2. From your team's dashboard, select the **Settings** tab, and then **Security & Privacy**
3. Under SAML Single Sign-On, select the **Configure** button. This opens a dialog to guide you through configuring Directory Sync for your Team with your Directory Provider.
4. Once you have completed the configuration walkthrough, configure how Directory Groups should map to Vercel Team roles:

   ![Image](`/docs-assets/static/docs/concepts/teams/dsync-roles.png`)
5. Finally, an overview of all synced members is shown. Click **Confirm and Sync** to complete the syncing:

   ![Image](`/docs-assets/static/docs/concepts/teams/dsync-confirmation.png`)
6. Once confirmed, Directory Sync will be successfully configured for your Vercel Team.

> **💡 Note:** SAML Single Sign-On is optionally available on the Enterprise plan, or as a paid add-on for the Pro plan. To enable,
> Enterprise teams can contact [sales](https://vercel.com/contact/sales), and Pro teams can purchase the add-on
> from their team's [Billing settings](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbilling%23paid-add-ons).

### Supported providers

See [SAML Single Sign-On](/docs/saml#saml-providers) for a list of all the SAML providers that Vercel supports.

## Preventing account lockout

To prevent account lockout ensure that at least one person in your team has the owner role, and that they are not removed from the team.

If access is lost due to removal of team owners, use the following group names to automatically allocate the corresponding roles to individuals in that group:

| Group name                | Role                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `vercel-role-owner`       | [Owner](/docs/rbac/access-roles#owner-role)                                                                                  |
| `vercel-role-member`      | [Member](/docs/rbac/access-roles#member-role)                                                                                |
| `vercel-role-developer`   | [Developer](/docs/rbac/access-roles#developer-role)                                                                          |
| `vercel-role-billing`     | [Billing](/docs/rbac/access-roles#billing-role)                                                                              |
| `vercel-role-viewer`      | [Viewer Pro](/docs/rbac/access-roles#pro-viewer-role) or [Viewer Enterprise](/docs/rbac/access-roles#enterprise-viewer-role) |
| `vercel-role-contributor` | [Contributor](/docs/rbac/access-roles#contributor-role)                                                                      |


---

[View full sitemap](/docs/sitemap)
