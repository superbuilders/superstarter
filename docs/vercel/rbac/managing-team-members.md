---
title: Managing Team Members
product: vercel
url: /docs/rbac/managing-team-members
type: how-to
prerequisites:
  - /docs/rbac
related:
  - /docs/rbac/access-roles
  - /docs/dashboard-features
summary: Learn how to manage team members on Vercel, and how to assign roles to each member with role-based access control (RBAC).
---

# Managing Team Members

As the team owner, you have the ability to manage your team's composition and the roles of its members, controlling the actions they can perform. These role assignments, governed by Role-Based Access Control (RBAC) permissions, define the access level each member has across all projects within the team's scope. Details on the various roles and the permissions they entail can be found in the [Access Roles section](/docs/rbac/access-roles).

## Adding team members and assigning roles

> **🔒 Permissions Required**: Inviting new team members

1. From the dashboard, select your team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select the **Settings** tab and go to the **Members** section
3. Enter the email address of the person you would like to invite, assign their [role](/docs/rbac/access-roles), and select the **Invite** button. You can invite multiple people at once using the **Add more** button:

![Image](https://vercel.com/front/docs/rbac/rbac-settings-members-light.png)

4. By default only the team level roles are visible in the dropdown. If you choose to assign the [contributor role](/docs/rbac/access-roles#contributor-role) to the new member, a second dropdown will be accessible by selecting the **Assign Project Roles** button. You can then select the project, and their role on that project you want to assign the contributor to:

> **🔒 Permissions Required**: Assigning project roles

![Image](https://vercel.com/front/docs/rbac/rbac-settings-assign-contributor-light.png)

5. You can view all pending invites in the **Pending Invitations** tab. When you issue an invite the recipient is not automatically added to the team. They have 7 days to accept the invite (30 days for SAML enforced teams) and join the team. After 7 days (or 30 days for SAML enforced teams), the invite will show as expired in the **Pending Invitations** tab. Once a member has accepted an invitation to the team, they'll be displayed as team members with their assigned role.
6. Once a member has been accepted onto the team, you can edit their role using the **Manage Role** button located alongside their assigned role in the **Team Members** tab.

![Image](https://vercel.com/front/docs/rbac/project-rbac-settings-manage-team-role-light.png)

### Invite link

Team owners can also share an invite link with others to allow them to join the team without needing to be invited individually.

To generate an invite link:

1. Ensure you have selected your team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select the **Settings** tab and go to the **Members** section
3. Select the **Invite Link** button and use the  icon to copy the invite link:

![Image](https://vercel.com/front/docs/rbac/project-rbac-invite-link-light.png)

4. Optionally, you can select **Reset Invite Link** to generate a new link. After doing this, all other invite links will become invalid.
5. Share the link with others. Those who join from an invite link will be given the lowest permissions for that team. For the Enterprise plan, they will be assigned the [**Viewer Enterprise**](/docs/rbac/access-roles#viewer-enterprise-role) role. For the Pro plan, they will be assigned the [**Member**](/docs/rbac/access-roles#member-role) role.

## Assigning project roles

> **🔒 Permissions Required**: Assigning project roles

Team [owners](/docs/rbac/access-roles#owner-role) can assign project roles to team members with the [contributor role](/docs/rbac/access-roles#contributor-role), enabling control over their project-related actions. You can assign these roles during team invitations or to existing members.

1. Ensure you have selected your team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select the project you want to assign a member to
3. Select **Access** from the left navigation, then inside the **Project Access** section select the team members email from the dropdown
4. Select the role you want to assign to the member on the project

![Image](https://vercel.com/front/docs/rbac/rbac-project-settings-assign-role-light.png)

## Delete a member

Team owners can delete members from a team. You can also remove yourself from a team.

1. Ensure you have selected your team from the [scope selector](/docs/dashboard-features#scope-selector)
2. Select the **Settings** tab and go to the **Members** section
3. Next to the name of the person you'd like to remove, select the ellipses (…) and then select **Remove from Team** from the menu

Vercel is also [SCIM](# "System for Cross-domain Identity Management") compliant. This means that if you are using SAML SSO, de-provisioning from the third-party provider will also remove the member from Vercel.


---

[View full sitemap](/docs/sitemap)
