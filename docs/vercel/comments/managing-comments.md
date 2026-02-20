---
title: Managing Comments on Preview Deployments
product: vercel
url: /docs/comments/managing-comments
type: how-to
prerequisites:
  - /docs/comments
related:
  - /docs/comments/integrations
summary: Learn how to manage Comments on your Preview Deployments from Team members and invited collaborators.
---

# Managing Comments on Preview Deployments

## Resolve comments

You can resolve comments by selecting the **☐ Resolve** checkbox that appears under each thread or comment. You can access this checkbox by selecting a comment wherever it appears on the page, or by selecting the thread associated with the comment in the **Inbox**.

Participants in a thread will receive a notification when that thread is resolved.

## Notifications

By default, the activity within a comment thread triggers a notification for all participants in the thread. PR owners will also receive notifications for all newly-created comment threads.

Activities that trigger a notification include:

- Someone creating a comment thread
- Someone replying in a comment thread you have enabled notifications for or participated in
- Someone resolving a comment thread you're receiving notifications for

Whenever there's new activity within a comment thread, you'll receive a new notification. Notifications can be sent to:

- [Your Vercel Dashboard](#dashboard-notifications)
- [Email](#email)
- [Slack](#slack)

### Customizing notifications for deployments

To customize notifications for a deployment:

1. Visit the deployment
2. Log into the Vercel toolbar
3. Select the **Menu** button (☰)
4. Select **Preferences** (⚙)
5. In the dropdown beside **Notifications**, select:
   - **Never**: To disable notifications
   - **All**: To enable notifications
   - **Replies and Mentions**: To enable only some notifications

### Customizing thread notifications

You can manage notifications for threads in the **Inbox**:

1. Select the three dots (ellipses) near the top of the first comment in a thread
2. Select **Unfollow** to mute the thread, or **Follow** to subscribe to the thread

### Dashboard notifications

While logged into Vercel, select the notification bell icon and select the **Comments** tab to see new Comments notifications. To view specific comments, you can:

- **Filter based on**:
  - Author
  - Status
  - Project
  - Page
  - Branch
- **Search**: Search for comments containing specific text

> **💡 Note:** Comments left on pages with query params in the URL may not appear on the page
> when you visit the base URL. Filter by page and search with a `*` wildcard to
> see all pages with similar URLs. For example, you might search for
> `/docs/conformance/rules/req*`.

You can also resolve comments from your notifications.

To reply to a comment, or view the deployment it was made on, select it and select the link to the deployment.

### Email

Email notifications will be sent to the email address associated with your Vercel account. Multiple notifications within a short period will be batched into a single email.

### Slack

When you configure Vercel's Slack integration, comment threads on linked branches will create Slack threads. New activity on Slack or in the comment thread will be reflected on both platforms. See [our Slack integration docs](/docs/comments/integrations#commenting-in-slack) to learn more.

## Troubleshooting comments

Sometimes, issues appear on a webpage for certain browsers and devices, but not for others. It's also possible for users to leave comments on a preview while viewing an outdated deployment.

To get around this issue, you can select the screen icon beside a commenter's name to copy their session info to your clipboard. Doing so will yield a JSON object similar to the following:

```json filename="session-data"
{
  "browserInfo": {
    "ua": "Mozilla/5.0 (Macintosh; Intel Mac OS X 9_10_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
    "browser": {
      "name": "Chrome",
      "version": "106.0.0.0",
      "major": "106"
    },
    "engine": {
      "name": "Blink",
      "version": "106.0.0.0"
    },
    "os": {
      "name": "Mac OS",
      "version": "10.15.7"
    },
    "device": {},
    "cpu": {}
  },
  "screenWidth": 1619,
  "screenHeight": 1284,
  "devicePixelRatio": 1.7999999523162842,
  "deploymentUrl": "vercel-site-7p6d5t8vq.vercel.sh"
}
```

On desktop, you can hover your cursor over a comment's timestamp to view less detailed session information at a glance, including:

- Browser name and version
- Window dimensions in pixels
- Device pixel ratio
- Which deployment they were viewing

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/debug-info-light.png`)


---

[View full sitemap](/docs/sitemap)
