---
title: Troubleshoot project collaboration
product: vercel
url: /docs/deployments/troubleshoot-project-collaboration
type: reference
prerequisites:
  - /docs/deployments
related:
  - /docs/plans/hobby
  - /docs/plans/pro-plan
  - /docs/accounts
  - /docs/git
  - /docs/rbac/managing-team-members
summary: Learn about common reasons for deployment issues related to team member requirements and how to resolve them.
---

# Troubleshoot project collaboration

This guide will help you understand how to troubleshoot deployment failures related to project collaboration.

For private repositories, if we cannot identify the Vercel user associated with a commit, any deployment associated with that commit will fail. You can use the following checklist to make sure your Vercel team is properly configured:

> **💡 Note:** Collaboration is free for public repositories.

## Team configuration

### Hobby teams

The [Hobby Plan](/docs/plans/hobby) does not support collaboration for private repositories. If you need collaboration, upgrade to the [Pro Plan](/docs/plans/pro-plan).

To deploy commits under a Hobby team, the commit author must be the owner of the Hobby team containing the Vercel project connected to the Git repository. This is verified by comparing the [**Login Connections**](/docs/accounts#login-methods-and-connections) Hobby team's owner with the commit author.

To make sure we can verify your commits:

1. Make sure all commits are authored by the git user associated with your account.
2. Link your git provider to your Vercel account in [Account Settings](/docs/accounts#sign-up-with-a-git-provider)

> **💡 Note:** If your account is not connected to your git provider, make sure you've properly configured your [Vercel email address](/docs/accounts#managing-emails) so that it matches the email associated with the commit.For the most reliable experience, ensure both your project and account are properly connected to your git provider.

For more information, see [Using Hobby teams](/docs/git#using-hobby-teams)

### Pro teams

The [Pro Plan](/docs/plans/pro-plan) allows for collaboration through team membership. Each person committing to your codebase should be added as a team member.

To deploy commits under a Vercel Pro team, the commit author must be a member of the team containing the Vercel project connected to the Git repository.

To make sure we can verify commits associated with your team:

1. Each person committing code can be [added as a team member](/docs/rbac/managing-team-members).
2. Make sure the commit author is a confirmed [member of your team](/docs/accounts#team-membership).
3. Team members should link their git provider to their Vercel account in [Account Settings](/docs/accounts#sign-up-with-a-git-provider)

For more information, see [Using Pro teams](/docs/git#using-pro-teams)

### Bot access

Ensure your bots are properly configured and that their commits are clearly identified as automated.

## Account configuration

### Connecting Git provider accounts

Each team member must connect their git provider account to their Vercel account:

1. Visit [Account Settings](https://vercel.com/account/settings/authentication)
2. Navigate to the [**Login Connections**](/docs/accounts#login-methods-and-connections) section
3. Connect your GitHub, GitLab, or Bitbucket account

### Managing multiple email addresses

If you use multiple email addresses for git commits, you will need to configure a secondary email address with either your git provider or Vercel depending on if your git repository is linked to your project.

To add secondary email addresses to your Vercel account:

1. Go to your [Account Settings](https://vercel.com/account/settings#email)
2. Add any email addresses you use for git commits
3. Verify each email address


---

[View full sitemap](/docs/sitemap)
