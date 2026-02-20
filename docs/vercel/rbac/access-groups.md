---
title: Access Groups
product: vercel
url: /docs/rbac/access-groups
type: how-to
prerequisites:
  - /docs/rbac
related:
  - /docs/rbac/access-roles/project-level-roles
  - /docs/rbac/access-roles
  - /docs/security/directory-sync
summary: Learn how to configure access groups for team members on a Vercel account.
---

# Access Groups

> **🔒 Permissions Required**: Access Groups

Access Groups provide a way to manage groups of Vercel users across projects on your team. They are a set of project role assignations, a combination of Vercel users and the projects they work on.

An Access Group consists of one or many projects in a team and assigns project roles to team members. Any team member included in an Access Group gets assigned the projects in that Access Group. They also get a default role.

Team administrators can apply automatic role assignments for default roles. And for more restricted projects, you can ensure only a subset of users have access to those projects. This gets handled with project-level role-based access control (RBAC).

![Image](`/front/docs/rbac/access-groups-light.png?lightbox`)

## Create an Access Group

1. Navigate to your team’s **Settings** tab and then **Access Groups** (`<team-name>/~/settings/access-groups`)
2. Select **Create Access Group**
3. Create a name for your Access Group
4. Select the projects and [project roles](/docs/rbac/access-roles/project-level-roles) to assign
5. Select the **Members** tab
6. Add members with the **Developer** and **Contributor** role to the Access Group
7. Create your Access Group by pressing **Create**

## Edit projects of an Access Group

1. Navigate to your team’s **Settings** tab and then **Access Groups** (`<team-name>/~/settings/access-groups`)
2. Press the **Edit Access Group** button for the Access Group you wish to edit from your list of Access Groups
3. Either:
   - Remove a project using the remove button to the right of a project
   - Add more projects using the **Add more** button below the project list and using the selection controls

## Add and remove members from an Access Group

1. Navigate to your team’s **Settings** tab and then **Access Groups** (`<team-name>/~/settings/access-groups`)
2. Press the **Edit Access Group** button for the Access Group you wish to edit from your list of Access Groups
3. Select the **Members** tab
4. Either:
   - Remove an Access Group member using the remove button to the right of a member
   - Add more members using the **Add more** button and the search controls

## Modifying Access Groups for a single team member

You can do this in two ways:

1. From within your team's members page using the **Manage Access** button (recommended for convenience). Access this by navigating to your team's **Settings** tab and then **Members**
2. By [editing each Access Group](#add-and-remove-members-from-an-access-group) using the **Edit Access Group** button and editing the **Members** list

## Access Group behavior

When configuring Access Groups, there are some key things to be aware of:

- Team roles cannot be overridden. An Access Group manages project roles only
- Only a subset of team role and project role combinations are valid:
  - **[Owner](/docs/rbac/access-roles#owner-role), [Member](/docs/rbac/access-roles#member-role), [Billing](/docs/rbac/access-roles#billing-role), [Viewer Pro](/docs/rbac/access-roles#viewer-pro-role), [Viewer Enterprise](/docs/rbac/access-roles#viewer-enterprise-role)**: All project role assignments are ignored
  - **[Developer](/docs/rbac/access-roles#developer-role)**: [Admin](/docs/rbac/access-roles#project-administrators) assignment is valid on selected projects. [Project Developer](/docs/rbac/access-roles#project-developer) and [Project Viewer](/docs/rbac/access-roles#project-viewer) role assignments are ignored
  - **[Contributor](/docs/rbac/access-roles#contributor-role)**: `Admin`, `Project Developer`, or `Project Viewer` roles are valid in selected projects
- When a `Contributor` belongs to **multiple** access groups the computed role will be:
  - `Admin` permissions in the project if any of the access groups they get assigned has a project mapping to `Admin`
  - `Project Developer` permissions in the project if any of the access groups they get assigned has a project mapping to `Project Developer` and there is none to `Admin` for that project
  - `Project Viewer` permissions in the project if any of the access groups they get assigned has a project mapping to `Project Viewer` and there is none to `Admin` and none to `Project Developer` for that project
- When a `Developer` belongs to **multiple** access groups the role assignation will be:
  - `Admin` permissions in the project if any of the access groups they get assigned has a project mapping to Admin
  - In all other cases the member will have `Developer` permissions
- Access Group assignations are not deleted when a team role gets changed. This allows a temporal increase of permissions without having to modify all Access Group assignations
- Direct project assignations also affect member roles. Consider these examples:
  - A direct project assignment assigns a member as `Admin`. That member is within an Access Group that assigns `Developer`. The computed role is `Admin`.
  - A direct project assignment assigns a member as `Developer`. That member is within an Access Group that assigns `Admin`. The computed role is `Admin`.

> **💡 Note:** Contributors and Developers can increase their level of permissions in a
> project but they can never reduce their level of permissions

## Directory sync

If you use [Directory sync](/docs/security/directory-sync), you are able to map a Directory Group with an Access Group. This will grant all users that belong to the Directory Group access to the projects that get assigned in the Access Group.

Some things to note:

- The final role the user will have in a specific project will depend on the mappings of all Access Groups the user belongs to
- Assignations using directory sync can lead to `Owners`, `Members` `Billing` and `Viewers` being part of an Access Group dependent on these mappings. **In this scenario, access groups assignations will get ignored**
- When a Directory Group is mapped to an Access Group, members of that group will default to `Contributor` role at team level. This is unless another Directory Group assignation overrides the team role


---

[View full sitemap](/docs/sitemap)
