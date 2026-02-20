---
title: Integrations for Comments
product: vercel
url: /docs/comments/integrations
type: how-to
prerequisites:
  - /docs/comments
related:
  - /docs/git
  - /docs/git/vercel-for-github
  - /docs/cli
  - /docs/vercel-toolbar/in-production-and-localhost
summary: "Learn how Comments integrates with Git providers like GitHub, GitLab, and BitBucket, as well as Vercel's Slack app."
---

# Integrations for Comments

## Git provider integration

Comments are available for projects using **any** Git provider. Github, BitBucket and GitLab [are supported automatically](/docs/git#supported-git-providers) with the same level of integration.

Pull requests (PRs) with deployments enabled receive [generated PR messages from Vercel bot](/docs/git/vercel-for-github). These PR messages contain the deployment URL.

The generated PR message will also display an **Add your feedback** URL, which lets people visit the deployment and automatically log in. The PR message tracks how many comments have been resolved.

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/vercel-bot-light.png`)

Vercel will also add a check to PRs with comments enabled. This check reminds the author of any unresolved comments, and **is not required by default**.

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/failed-check-light.png`)

To make this check required, check the docs for your favorite Git provider. Docs on required checks for the most popular git providers are listed below.

- [GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/managing-a-branch-protection-rule#creating-a-branch-protection-rule)
- [BitBucket](https://support.atlassian.com/bitbucket-cloud/docs/suggest-or-require-checks-before-a-merge/)
- [GitLab](https://docs.gitlab.com/ee/user/project/merge_requests/status_checks.html#block-merges-of-merge-requests-unless-all-status-checks-have-passed)

### Vercel CLI deployments

Commenting is available for deployments made with [the Vercel CLI](/docs/cli). The following git providers are supported for comments with Vercel CLI deployments:

- GitHub
- GitLab
- BitBucket

See [the section on Git provider integration information](#git-provider-integration) to learn more.

Commenting is available in production and localhost when you use [the Vercel Toolbar package](/docs/vercel-toolbar/in-production-and-localhost).

## Use the Vercel Slack app

The [Vercel Slack app](https://vercel.com/marketplace/slack) connects Vercel deployments to Slack channels. Any new activity will create corresponding Slack threads, which are synced between the deployment and Slack so that the entire discussion can be viewed and responded to on either platform.

To get started:

1. Go to [our Vercel Slack app in the Vercel Integrations Marketplace](https://vercel.com/marketplace/slack)
2. Select the **Add Integration** button from within the Marketplace, then select which Vercel account and project the integration should be scoped to
3. Confirm the installation by selecting the **Add Integration** button
4. From the pop-up screen, you'll be prompted to provide permission to access your Slack workspace. Select the **Allow** button
5. In the new pop-up screen, select the **Connect your Vercel account to Slack** button. When successful, the button will change to text that says, "Your Vercel account is connected to Slack"

> **💡 Note:** Private Slack channels will not appear in the dropdown list when setting up
> the Slack integration unless you have already invited the Vercel app to the
> channel. Do so by sending `/invite @Vercel` as a message to the channel.

### Linking Vercel and Slack users

1. In any channel on your Team's Slack instance enter `/vercel login`
2. Select **Continue with Vercel** to open a new browser window
3. From the new browser window, select **Authorize Vercel to Slack**
4. Once the connection is successful, you'll receive a "Successfully authenticated" message in the Slack channel.
5. You can use `/vercel whoami` at any time to check that you're successfully linked

Linking Slack and Vercel does the following:

- Allows Vercel to translate `@` mentions across messages/platforms
- Allows you to take extra actions
- Allows user replies to be correctly attributed to their Vercel user instead of a `slack-{slackusername}` user when replying in a thread

### Updating your Slack integration

If you configured the Slack app before October 4th, 2023, the updated app requires new permissions. You must reconfigure the app to subscribe to new comment threads and link new channels.

To do so:

1. Visit your team's dashboard and select the **Integrations** tab
2. Select **Manage** next to Slack in your list of integrations. On the next page, select **Configure**
3. Configure your Slack app and re-authorize it

> **💡 Note:** Your previous linked channels and subscriptions will continue to work even if
> you don't reconfigure the app in Slack.

### Connecting a project to a Slack channel

To see a specific project's comments in a Slack channel, send the following command as a message to the channel:

```bash
/vercel subscribe
```

This will open a modal that allows you to configure the subscription, including:

- Subscribing to comments for specific branches
- Subscribing to comments on specific pages

You can specify pages using a [glob pattern](#), and branches with regex, to match multiple options.

You can also configure your subscription with options when using the `/vercel subscribe` command. You can use the `/vercel help` command to see all available options.

### Commenting in Slack

When a new comment is created on a PR, the Vercel Slack app will create a matching thread in each of the subscribed Slack channels. The first post will include:

- A link to the newly-created comment thread
- A preview of the text of the first comment in the thread
- A ✅ **Resolve** button near the bottom of the Slack post
  - You may resolve comment threads without viewing them
  - You may reopen resolved threads at any time

Replies and edits in either Slack or the original comment thread will be reflected on both platforms.

Your custom Slack emojis will also be available on linked deployments. Search for them by typing `:`, then inputting the name of the emoji.

Use the following Slack command to list all available options for your Vercel Slack integration:

```bash
/vercel help
```

### Receiving notifications as Slack DMs

To receive comment notifications as DMs from Vercel's Slack app, you must link your Vercel account in Slack by entering the following command in any Slack channel, thread or DM:

```bash
/vercel login
```

### Vercel Slack app command reference

| Command                                 | Function                                                         |
| --------------------------------------- | ---------------------------------------------------------------- |
| `/vercel help`                          | List all commands and options                                    |
| `/vercel subscribe`                     | Subscribe using the UI interface                                 |
| `/vercel subscribe team/project`        | Subscribe the current Slack channel to a project                 |
| `/vercel subscribe list`                | List all projects the current Slack channel is subscribed to     |
| `/vercel unsubscribe team/project`      | Unsubscribe the current Slack channel from a project             |
| `/vercel whoami`                        | Check which account you're logged into the Vercel Slack app with |
| `/vercel logout`                        | Log out of your Vercel account                                   |
| `/vercel login` (or `link` or `signin`) | Log into your Vercel account                                     |

## Adding Comments to your issue tracker

> **🔒 Permissions Required**: Adding Comments to your issue tracker

Any member of your team can covert comments to an issue in Linear, Jira, or GitHub. This is useful for tracking bugs, feature requests, and other issues that arise during development. To get started:

- ### Install the Vercel integration for your issue tracker
  The following issue trackers are supported:
  - [Linear](/marketplace/linear)
  - [Jira Cloud](/marketplace/jira)
  - [GitHub](/marketplace/github)
  Once you open the integration, select the **Add Integration** button to install it. Select which Vercel team and project(s) the integration should be scoped to and follow the prompts to finish installing the integration.
  > **💡 Note:** On Jira, issues will be marked as reported by the user who converted the
  > thread and marked as created by the user who set up the integration. You may
  > want to consider using a dedicated account to connect the integration.

- ### Convert a comment to an issue
  On the top-right hand corner of a comment thread, select the icon for your issue tracker. A **Convert to Issue** dialog will appear.

  If you have more than one issue tracker installed, the most recently used issue tracker will appear on a comment. To select a different one, select the ellipsis icon (⋯) and select the issue tracker you want to use:

  ![Image](`/docs-assets/static/docs/workflow-collaboration/convert-to-issue-light.png`)

- ### Fill out the issue details
  Fill out the relevant information for the issue. The issue description will be populated with the comment text and any images in the comment thread. You can add additional text to the description if needed.

  The fields you will see are dependant on the issue tracker you use and the scope it has. When you are done, select **Create Issue**.

  **Linear**

  Users can set the team, project, and issue title. Only publicly available teams can be selected as Private Linear teams are not supported at this time.

  **Jira**

  Users can set the project, issue type, and issue title.

  You can't currently convert a comment into a child issue. After converting a comment into an issue, you may assign it a parent issue in Jira.

  **GitHub**

  Users can set the repository and issue title. If you installed the integration to a Github Organization, there will be an optional field to select the project to add your issue to.

- ### Confirm the issue was created
  Vercel will display a confirmation toast at the bottom-right corner of the page. You can click the toast to open the relevant issue in a new browser tab. The converted issue contains all previous discussion and images, and a link back to the comment thread.

  When you create an issue from a comment thread, Vercel will resolve the thread. The thread cannot be unresolved so we recommend only converting a thread to an issue once the relevant discussion is done.

  **Linear**

  If the email on your Linear account matches the Vercel account and you follow a thread converted to an issue, you will be added as a subscriber on the converted Linear issue.

  **Jira**

  On Jira, issues will be marked as *reported* by the user who converted the thread and marked as *created* by the user who set up the integration. You may wish to consider using a dedicated account to connect the integration.

  **GitHub**

  The issue will be marked as created by the `vercel-toolbar` bot and will have a label generated based on the Vercel project it was converted from. For example `Vercel: acme/website`.

  If selected, the converted issue will be added to the project or board you selected when creating the issue.


---

[View full sitemap](/docs/sitemap)
