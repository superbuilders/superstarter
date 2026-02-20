---
title: Sharing a Preview Deployment
product: vercel
url: /docs/deployments/sharing-deployments
type: how-to
prerequisites:
  - /docs/deployments
related:
  - /docs/accounts/create-a-team
  - /docs/rbac/access-roles/project-level-roles
  - /docs/vercel-toolbar
  - /docs/deployments/generated-urls
  - /docs/comments
summary: Learn how to share a preview deployment with your team and external collaborators.
---

# Sharing a Preview Deployment

## Sharing with members of your team

By default, members of your [Vercel team](/docs/accounts/create-a-team) that have [access to your project](/docs/rbac/access-roles/project-level-roles) will also have access to your deployment. This allows them to comment, see who else is viewing the preview, and use the toolbar. Users who don't have access to the project will not have access to your deployment.

To share a preview deployment with a member of your team you can do any of the following:

- Send an invite to individual users (external or team members), or groups of people
- Copy the URL from the address bar of your browser and send it to them
- Select **Share**  in the [Vercel Toolbar](/docs/vercel-toolbar) menu, copy the URL and send it to them

They will also be able to find it by using the [generated URL](/docs/deployments/generated-urls) from any deployment in the [Vercel dashboard](/dashboard).

## Sharing a preview deployment with external collaborators

To share a deployment with anyone, you can do any of the following:

- **Recommended**: [Invite users](#invite-users) to view your deployment
- [Set access to anyone](#sharing-with-sharable-links-and-managing-permissions) (or anyone with the link if deployment protection is enabled)
- [Accept an access request](/docs/deployments/sharing-deployments#request-access)

When you share a preview deployment with an external user, **they will not be added to your Vercel team**. The collaborator does not need to have a Vercel account, but will need to create one if they wish to view a deployment that is [protected](#sharing-with-deployment-protection-enabled), use the [toolbar](/docs/vercel-toolbar), or leave [comments](/docs/comments).

Note that you can share two types of links: branch links, which reflect the latest commit, and commit links, which reflect changes up to a specific commit.

When sharing from the **Share** button next to the deployment in the Vercel dashboard, the share modal defaults to the branch link. You can switch to the commit link by selecting the dropdown arrow.

When sharing from **Share**  in the toolbar menu, you'll share the current link. If it's a commit-specific link, you can switch to the branch link to share an always up-to-date preview.

### Invite users

Users on Pro and Enterprise teams can use this method to add one or more collaborators. Hobby users are limited to one collaborator at any one time. To invite users to view your deployment:

1. Select **Share**  in the toolbar menu or select the **Share** button next to the deployment in the [Vercel dashboard](/dashboard)
2. In the **Share** modal that appears, enter the email(s), or names of people on your Vercel team you want to invite. You can also add a message to the invitation. The invitation will be sent as an email to the user(s)
3. The invited user can now view the preview deployment. If Deployment Protection is enabled or if they want to add a comment, they will need to log into their Vercel account
4. You can revoke access at any time by returning to the **Share** dialog and choosing the **Revoke** icon next to the user's email

![Image](`/front/docs/vercel-toolbar/invite-share-preview-light.png`)

This is the **recommended method for sharing a deployment with external collaborators**, as it allows you to control who has access to your deployment on an individual basis.

### Sharing with sharable links and managing permissions

1. Select **Share**  in the toolbar menu or select the **Share** button on the deployment page in the [Vercel dashboard](/dashboard)
2. In the **Share** modal that appears, you can manage who can view and comment on deployments:
   - **Team members with access**: This is the default setting. Only team members who have access to this project and external users granted access can comment
   - **Anyone (Without deployment protection)**: If you don't have [deployment protection](/docs/security/deployment-protection) enabled, you can change the setting to **Anyone**. This allows any visitor who logs in with a Vercel account to leave comments on the preview, regardless of their team status
   - **Anyone with the link (With deployment protection)**: If you have deployment protection on, you can select **Anyone with the link**. This option creates a [sharable link that bypasses deployment protection](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links). Anyone with this link can log in to the toolbar and comment, even if they are not a part of your team or haven't been individually added as collaborators

![Image](`/docs-assets/static/docs/concepts/deployments/shareable-links-light.png`)

3. After setting the chosen permission, use the **Copy Link** button to copy the link to your clipboard. This specific URL should be used, rather than the one from the address bar of your browser.

To learn more, see [sharable links](/docs/security/deployment-protection/methods-to-bypass-deployment-protection/sharable-links) in Deployment Protection.

### Request access

If someone without access to comment attempts to log into the toolbar on a deployment, they will see a screen with the option to **Request Access**. You will be notified by email and the Vercel [notifications](/docs/notifications) widget when a request is made to a deployment you own.

To respond to the request:

1. Select **Share**  in the toolbar menu or select the **Share** button next to the deployment in the [Vercel dashboard](/dashboard)
2. In the popup modal that appears, review the list under **Access Requests**
3. Respond to the request by either allowing or denying access

## Sharing with deployment protection enabled

It is important to ensure the security of your preview deployments, which you can enable through [deployment protection](/docs/security/deployment-protection/methods-to-protect-deployments). We recommend that you scope access to the fewest number of people possible.

Deployment protection allows you to secure your preview deployments, with [Authentication](/docs/security/deployment-protection/methods-to-protect-deployments/vercel-authentication) and/or [Password Protection](/docs/security/deployment-protection/methods-to-protect-deployments/password-protection) to ensure that only authorized users can view your preview deployment.

- If you don't have deployment protection enabled, anyone with the link can view your deployment
- If you have **Authentication** enabled, only team members can view your deployment, unless you have added the user individually or they have requested access, or you have enabled sharable links
- If you have **Password Protection** enabled, only users with the password can view your deployment, unless you have added the user individually or they have requested access, or you have enabled sharable links


---

[View full sitemap](/docs/sitemap)
