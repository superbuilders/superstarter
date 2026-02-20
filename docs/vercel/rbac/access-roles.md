---
title: Access Roles
product: vercel
url: /docs/rbac/access-roles
type: reference
prerequisites:
  - /docs/rbac
related:
  - /docs/rbac/access-roles/team-level-roles
  - /docs/projects/overview
  - /docs/deployments
  - /docs/integrations
  - /docs/domains
summary: Learn about the different roles available for team members on a Vercel account.
---

# Access Roles

Vercel distinguishes between different roles to help manage team members' access levels and permissions. These roles are categorized into two groups: team level and project level roles. Team level roles are applicable to the entire team, affecting all projects within that team. Project level roles are confined to individual projects.

The two groups are further divided into specific roles, each with its own set of permissions and responsibilities. These roles are designed to provide a balance between autonomy and security, ensuring that team members have the access they need to perform their tasks while maintaining the integrity of the team and its resources.

- [**Team level roles**](#team-level-roles): Users who have access to all projects within a team
  - [Owner](#owner-role)
  - [Member](#member-role)
  - [Developer](#developer-role)
  - [Security](#security-role)
  - [Billing](#billing-role)
  - [Pro Viewer](#pro-viewer-role)
  - [Enterprise Viewer](#enterprise-viewer-role)
  - [Contributor](#contributor-role)
- [**Project level roles**](#project-level-roles): Users who have restricted access at the project level. Only contributors can have configurable project roles
  - [Project Administrator](#project-administrators)
  - [Project Developer](#project-developer)
  - [Project Viewer](#project-viewer)

## Team level roles

> **🔒 Permissions Required**: Team level roles

Team level roles are designed to provide a broad level of control and access to the team as a whole. These roles are assigned to individuals and apply to all projects within the team, ensuring centralized control and access while upholding the team's security and integrity.

| Role                                             | Description                                                                                                                                                                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Owner**](#owner-role)                         | Have the highest level of control. They can manage, modify, and oversee the team's settings, all projects, team members and roles.                                                                                                                 |
| [**Member**](#member-role)                       | Have full control over projects and most team settings, but cannot invite or manage users by default.                                                                                                                                              |
| [**Developer**](#developer-role)                 | Can deploy to projects and manage environment settings but lacks the comprehensive team oversight that an owner or member possesses.                                                                                                               |
| [**Security**](#security-role)                   | Can manage security features, IP blocking, firewall. Cannot create deployments by default.                                                                                                                                                         |
| [**Billing**](#billing-role)                     | Primarily responsible for the team's financial management and oversight. The billing role also gets read-only access to every project.                                                                                                             |
| [**Pro Viewer**](#pro-viewer-role)               | Has limited read-only access to projects and deployments, ideal for stakeholder collaboration                                                                                                                                                      |
| [**Enterprise Viewer**](#enterprise-viewer-role) | Has read-only access to the team's resources and projects.                                                                                                                                                                                         |
| [**Contributor**](#contributor-role)             | A unique role that can be configured to have any of the project level roles or none. If a contributor has no assigned project role, they won't be able to access that specific project. **Only contributors can have configurable project roles**. |

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Owner role

> **🔒 Permissions Required**: The owner role

| About                      | Details                                                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | The owner role is the highest level of authority within a team, possessing comprehensive access and control over all team and [project settings](/docs/projects/overview#project-settings).                                                                                                                                              |
| **Key Responsibilities**   | - Oversee and manage all team resources and projects  - Modify team settings, including [billing](#billing-role) and [member](#member-role) roles  - Grant or revoke access to team projects and determine project-specific roles for members  - Access and modify all projects, including their settings and deployments |
| **Access and Permissions** | Owners have unrestricted access to all team functionalities, can modify all settings, and change other members' roles.  Team owners inherently act as [project administrators](#project-administrators) for every project within the team, ensuring that they can manage individual projects' settings and deployments.             |

Teams can have more than one owner. For continuity, we recommend that at least two individuals have owner permissions. Additional owners can be added without any impact on existing ownership. Keep in mind that role changes, including assignment and revocation of team member roles, are an exclusive capability of those with the owner role.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Member role

> **🔒 Permissions Required**: The member role

Members play a pivotal role in team operations and project management.

**Key responsibilities**

- Create [deployments](/docs/deployments) and manage projects
- Set up [integrations](/docs/integrations) and manage project-specific [domains](/docs/domains)
- Handle [deploy hooks](/docs/deploy-hooks) and adjust [Vercel Function](/docs/functions) settings
- Administer security settings for their assigned projects

**Access and permissions**

Certain team-level settings remain exclusive to owners. Members cannot edit critical team settings like billing information or [invite new users to the team](/docs/rbac/managing-team-members), this keeps a clear boundary between the responsibilities of members and owners.

| About                      | Details                                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Members play a pivotal role in team operations and project management.                                                                                                                                                                                                                                                                                                  |
| **Key Responsibilities**   | - Create [deployments](/docs/deployments) and manage projects  - Set up [integrations](/docs/integrations) and manage project-specific [domains](/docs/domains)  - Handle [deploy hooks](/docs/deploy-hooks) and adjust [Serverless Function](/docs/functions/serverless-functions) settings  - Administer security settings for their assigned projects |
| **Access and Permissions** | Certain team-level settings remain exclusive to owners. Members cannot edit critical team settings like billing information or [invite new users to the team](/docs/rbac/managing-team-members), keeping a clear boundary between the responsibilities of members and owners.                                                                                           |

To assign the member role to a team member, refer to our [Adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Developer role

> **🔒 Permissions Required**: The developer role

| About                      | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Central to the team's operational functionality, developers ensure a balance between project autonomy and the safeguarding of essential settings.                                                                                                                                                                                                                                                                                                                                                                                                                |
| **Key Responsibilities**   | - Create [deployments](/docs/deployments) and manage projects  - Control [environment variables](/docs/environment-variables), particularly for preview and development environments  - Manage project [domains](/docs/domains)  - Create a [production build](/docs/deployments/environments#production) by committing to the `main` branch of a project. Developers can also create preview branches and [preview deployments](/docs/deployments/environments#preview-environment-pre-production) by committing to any branch other than `main` |
| **Access and Permissions** | While developers have significant access to project functionalities, they are restricted from altering production environment variables and team-specific settings. They cannot invite new team members.  Only contributors can be assigned [project level roles](#project-level-roles); developers **cannot**.  Developers can deploy to production by merging to the production branch in Git-based workflows.                                                                                                                                       |

Central to the team's operational functionality, developers ensure a balance between project autonomy and the safeguarding of essential settings.

**Key responsibilities**

- Create [deployments](/docs/deployments) and manage projects
- Control [environment variables](/docs/environment-variables), particularly for preview and development environments
- Manage project [domains](/docs/domains)
- Create a [production build](/docs/deployments/environments#production-environment) by committing to the `main` branch of a project. Note that developers can create preview branches and [preview deployments](/docs/deployments/environments#preview-environment-pre-production) by committing to any branch other than `main`

**Access and permissions**

While Developers have significant access to project functionalities, they are restricted from altering production environment variables and team-specific settings. They are also unable to invite new team members. Note that the capability to become a project administrator is reserved for the contributor role. Those with the developer role **cannot** be assigned [project level roles](#project-level-roles).

Developers can deploy to production through merging to the production branch for Git projects.

**Additional information**

To assign the developer role to a team member, refer to our [Adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Contributor role

> **🔒 Permissions Required**: The contributor role

Contributors offer flexibility in access control at the project level. To limit team members' access at the project level, they must first be assigned the contributor role. Only after being assigned the contributor role can they receive project-level roles. **Contributors have no access to projects unless explicitly assigned**.

Contributors may have project-specific role assignments, with the potential for comprehensive control over assigned projects only.

**Key responsibilities**

- Typically assigned to specific projects based on expertise and needs
- Initiate [deployments](/docs/deployments) - *Depending on their assigned [project role](#project-level-roles)*
- Manage [domains](/docs/domains) and set up [integrations](/docs/integrations) for projects if they have the [project administrator](#project-administrators) role assigned
- Adjust [Vercel functions](/docs/functions) and oversee [deploy hooks](/docs/deploy-hooks)

**Access and permissions**

Contributors can be assigned to specific projects and have the same permissions as [project administrators](#project-administrators), [project developers](#project-developer), or [project viewers](#project-viewer). They can also be assigned no project role, which means they won't be able to access that specific project.

| About                      | Details                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Contributors offer flexibility in access control at the project level. To limit team members' access at the project level, they must first be assigned the contributor role. Only after being assigned the contributor role can they receive project-level roles.  - **Contributors have no access to projects unless explicitly assigned**.  - Contributors may have project-specific role assignments, with the potential for comprehensive control over assigned projects only.                |
| **Key Responsibilities**   | - Typically assigned to specific projects based on expertise and needs  - Initiate [deployments](/docs/deployments) — *Depending on their assigned [project role](#project-level-roles)*  - Manage [domains](/docs/domains) and set up [integrations](/docs/integrations) for projects if they have the [project administrator](#project-administrators) role assigned  - Adjust [Serverless Functions](/docs/functions/serverless-functions) and oversee [deploy hooks](/docs/deploy-hooks) |
| **Access and Permissions** | Contributors can be assigned to specific projects and have the same permissions as [project administrators](#project-administrators), [project developers](#project-developer), or [project viewers](#project-viewer).  They can also be assigned no project role, which means they won't be able to access that specific project.  See the [Project level roles](#project-level-roles) section for more information on project roles.                                                            |

To assign the contributor role to a team member, refer to our [Adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Security role

> **🔒 Permissions Required**: The security role

| About                      | Details                                                                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Inspect and manage Vercel security features.                                                                                                                          |
| **Key Responsibilities**   | - Manage Firewall  - Rate Limiting  - Deployment Protection                                                                                                 |
| **Access and Permissions** | The security role is designed to provide focused access to security features and settings.  This role also has read-only access to all projects within the team. |

This role does not offer deployment permissions by default.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Billing role

> **🔒 Permissions Required**: The billing role

| About                      | Details                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Specialized for financial operations, the billing role oversees financial operations and team resources management.                                                                                                       |
| **Key Responsibilities**   | - Oversee and manage the team's billing information  - Review and manage team and project costs  - Handle the team's payment methods                                                                            |
| **Access and Permissions** | The billing role is designed to provide financial oversight and management, with access to the team's billing information and payment methods.  This role also has read-only access to all projects within the team. |

The billing role can be assigned at no extra cost. For [Pro teams](/docs/plans/pro-plan), it's limited to one member while for [Enterprise teams](/docs/plans/enterprise), it can be assigned to multiple members.

To assign the billing role to a team member, refer to our [Adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

**Compatible permission group:** `UsageViewer`.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Pro Viewer role

> **🔒 Permissions Required**: The Pro Viewer role

An observational role designed for Pro teams, Pro Viewer members can monitor team activities and collaborate on projects with limited administrative visibility.

**Key responsibilities**

- Monitor and inspect all team [projects](/docs/projects/overview) and deployments
- Collaborate on [preview deployments](/docs/deployments/environments#preview-environment-pre-production) with commenting and feedback capabilities
- Review project-level performance data and analytics

**Access and permissions**

Pro Viewer members have read-only access to core project functionality but cannot view sensitive team data. They are restricted from:

- Viewing observability and log data
- Accessing team settings and configurations
- Viewing detailed usage data and billing information

Pro Viewer members cannot make changes to any settings or configurations.

**Additional information**

Pro Viewer seats are provided free of charge on Pro teams, making them ideal for stakeholders who need project visibility without full administrative access.

To assign the Pro Viewer role to a team member, refer to the [adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

### Enterprise Viewer role

> **🔒 Permissions Required**: The viewer role

| About                      | Details                                                                                                                                                  |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | An observational role, viewers are informed on team activities without direct intervention.                                                              |
| **Key Responsibilities**   | - Monitor and inspect all team [projects](/docs/projects/overview)  - Review shared team resources  - Observe team settings and configurations |
| **Access and Permissions** | Viewers have broad viewing privileges but are restricted from making changes.                                                                            |

> **🔒 Permissions Required**: The Enterprise Viewer role

An observational role with enhanced visibility for Enterprise teams, Enterprise Viewer members have comprehensive read-only access to team activities and operational data.

**Key responsibilities**

- Monitor and inspect all team [projects](/docs/projects/overview) and deployments
- Collaborate on [preview deployments](/docs/deployments/environments#preview-environment-pre-production) with commenting and feedback capabilities
- Review project-level performance data and analytics
- Access observability and log data for troubleshooting and monitoring
- View team settings and configurations for governance and compliance
- Monitor usage data and resource consumption patterns

**Access and permissions**

Enterprise Viewer members have comprehensive read-only access across the team, including sensitive operational data that Pro viewers cannot access. This enhanced visibility supports Enterprise governance and compliance requirements.

Enterprise Viewer members cannot make changes to any settings or configurations but have visibility into all team operations.

**Additional information**

The enhanced access provided by Enterprise Viewer roles makes them ideal for compliance officers, auditors, and senior stakeholders who need full operational visibility.

To assign the Enterprise Viewer role to a team member, refer to the [adding team members and assigning roles](/docs/rbac/managing-team-members#adding-team-members-and-assigning-roles) documentation.

**Compatible permission group:** `UsageViewer`.

See the [Team Level Roles Reference](/docs/rbac/access-roles/team-level-roles) for a complete list of roles and their permissions.

## Project level roles

> **🔒 Permissions Required**: Project level roles

Project level roles provide fine-grained control and access to specific projects within a team. These roles are assigned to individuals and are restricted to the projects they're assigned to, allowing for precise access control while preserving the overarching security and integrity of the team.

| Role                                                 | Description                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [**Project Administrator**](#project-administrators) | Team owners and members inherently act as project administrators for every project. Project administrators can create production deployments, manage all [project settings](/docs/projects/overview#project-settings), and manage production [environment variables](/docs/environment-variables). |
| [**Project Developer**](#project-developer)          | Can deploy to the project and manage its environment settings. Team developers inherently act as project developers.                                                                                                                                                                               |
| [**Project Viewer**](#project-viewer)                | Has read-only access to a specific project. Both team billing and viewer members automatically act as project viewers for every project.                                                                                                                                                           |

See the [Project Level Roles Reference](/docs/rbac/access-roles/project-level-roles) for a complete list of roles and their permissions.

### Project administrators

> **🔒 Permissions Required**: The project administrator role

| About                      | Details                                                                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Project administrators hold significant authority at the project level, operating as the project-level counterparts to team [members](#owner-role) and [owners](#owner-role).                                                                           |
| **Key Responsibilities**   | - Govern [project settings](/docs/projects/overview#project-settings)  - Deploy to all [environments](/docs/deployments/environments)  - Manage all [environment variables](/docs/environment-variables) and oversee [domains](/docs/domains) |
| **Access and Permissions** | Their authority doesn't extend across all [projects](/docs/projects/overview) within the team. Project administrators are restricted to the projects they're assigned to.                                                                               |

To assign the project administrator role to a team member, refer to our [Assigning project roles](/docs/rbac/managing-team-members#assigning-project-roles) documentation.

See the [Project Level Roles Reference](/docs/rbac/access-roles/project-level-roles) for a complete list of roles and their permissions.

### Project developer

> **🔒 Permissions Required**: The project developer role

| About                      | Details                                                                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Project developers play a key role in working on projects, mirroring the functions of [team developers](#developer-role), but with a narrowed project focus.                                                                                                                  |
| **Key Responsibilities**   | - Initiate [deployments](/docs/deployments)  - Manage [environment variables](/docs/environment-variables) for development and [preview environments](/docs/deployments/environments#preview-environment-pre-production)  - Handle project [domains](/docs/domains) |
| **Access and Permissions** | Project developers have limited scope, with access restricted to only the projects they're assigned to.                                                                                                                                                                       |

To assign the project developer role to a team member, refer to our [Assigning project roles](/docs/rbac/managing-team-members#assigning-project-roles) documentation.

See the [Project Level Roles Reference](/docs/rbac/access-roles/project-level-roles) for a complete list of roles and their permissions.

### Project viewer

> **🔒 Permissions Required**: The project viewer role

| About                      | Details                                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**            | Adopting an observational role within the project scope, they ensure transparency and understanding across projects.                                                                                                                                                       |
| **Key Responsibilities**   | - View and inspect all [deployments](/docs/deployments)  - Review [project settings](/docs/projects/overview#project-settings)  - Examine [environment variables](/docs/environment-variables) across all environments and view project [domains](/docs/domains) |
| **Access and Permissions** | They have a broad view but can't actively make changes.                                                                                                                                                                                                                    |

To assign the project viewer role to a team member, refer to our [Assigning project roles](/docs/rbac/managing-team-members#assigning-project-roles) documentation.

See the [Project Level Roles Reference](/docs/rbac/access-roles/project-level-roles) for a complete list of roles and their permissions.

## Permission groups

Existing team roles can be combined with permission groups to create custom access configurations based on your team's specific needs. This allows for more granular control over what different team members can do within the Vercel platform. The table below outlines key permissions that can be assigned to customize roles.

| Permission                        | Description                                                                                           | Compatible Roles                     | Already Included in |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------- |
| **Create Project**                | Allows the user to create a new project.                                                              | Developer, Contributor               | Owner, Member       |
| **Full Production Deployment**    | Deploy to production from CLI, rollback and promote any deployment.                                   | Developer, Contributor               | Owner, Member       |
| **Usage Viewer**                  | Read-only usage team-wide including prices and invoices.                                              | Developer, Security, Billing, Viewer | Owner               |
| **Environment Manager**           | Create and manage project environments.                                                               | Developer                            | Owner               |
| **Environment Variable Manager**  | Create and manage environment variables.                                                              | Developer                            | Owner, Member       |
| **Deployment Protection Manager** | Configure password protection, deployment protection by pass, and Vercel Authentication for projects. | Developer                            | Owner, Member       |

See [project level roles](/docs/rbac/access-roles/project-level-roles) and [team level roles](/docs/rbac/access-roles/team-level-roles) for a complete list of roles, their permissions, and how they can be combined.


---

[View full sitemap](/docs/sitemap)
