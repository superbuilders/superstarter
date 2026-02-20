---
title: Vercel Toolbar
product: vercel
url: /docs/vercel-toolbar
type: reference
prerequisites:
  []
related:
  - /docs/comments
  - /docs/feature-flags
  - /docs/draft-mode
  - /docs/edit-mode
  - /docs/vercel-toolbar/layout-shift-tool
summary: Learn how to use the Vercel Toolbar to leave feedback, navigate through important dashboard pages, share deployments, use Draft Mode for previewing...
---

# Vercel Toolbar

> **🔒 Permissions Required**: Vercel Toolbar

The Vercel Toolbar is a tool that assists in the iteration and development process. Through the toolbar, you can:

- Leave feedback on deployments with [Comments](/docs/comments)
- Navigate [through dashboard pages](/docs/vercel-toolbar#using-the-toolbar-menu), and [share deployments](/docs/vercel-toolbar#sharing-deployments)
- Read and set [Feature Flags](/docs/feature-flags)
- Use [Draft Mode](/docs/draft-mode) for previewing unpublished content
- Edit content in real-time using [Edit Mode](/docs/edit-mode)
- Inspect for [Layout Shifts](/docs/vercel-toolbar/layout-shift-tool) and [Interaction Timing](/docs/vercel-toolbar/interaction-timing-tool)
- Check for accessibility issues with the [Accessibility Audit Tool](/docs/vercel-toolbar/accessibility-audit-tool)

## Activating the Toolbar

By default, when the toolbar first shows up on your deployments it is sleeping. This means it will not run any tools in the background or show comments on pages. You can activate it by clicking it or using . It will start activated if a tool is needed to show you the link you’re visiting, like a link to a comment thread or a link with flags overrides.

Users who have installed the browser extension can toggle on **Always Activate** in **Preferences** from the Toolbar menu.

## Enabling or Disabling the toolbar

The Vercel Toolbar is enabled by default for all preview deployments. You can disable the toolbar at the [team](/docs/vercel-toolbar/managing-toolbar#enable-or-disable-the-toolbar-team-wide), [project](/docs/vercel-toolbar/managing-toolbar#enable-or-disable-the-toolbar-project-wide), or [session](/docs/vercel-toolbar/managing-toolbar#disable-toolbar-for-session) level.

You can also manage its visibility for [automation](/docs/vercel-toolbar/managing-toolbar#disable-toolbar-for-automation) with HTTP headers and through [environment variables](/docs/vercel-toolbar/managing-toolbar#enable-or-disable-the-toolbar-for-a-specific-branch). To learn more, see [Managing the toolbar](/docs/vercel-toolbar/managing-toolbar).

To enable the toolbar for your local or production environments, see [Adding the toolbar to your environment](/docs/vercel-toolbar/in-production-and-localhost).

## Using the Toolbar Menu

You can access the Toolbar Menu by pressing  on your keyboard.

Alternatively, you can also access the Toolbar Menu through the Vercel Toolbar by clicking the menu icon. If you haven't activated the toolbar yet, log in first to display the menu.

| Feature                                                                       | Description                                                                                                                  |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Search**                                                                    | Quickly search the toolbar and access dashboard pages.                                                                       |
| **Quick branch access**                                                       | View the current branch and commit hash.                                                                                     |
| **Switch branches**                                                           | Quickly switch between branches (on preview and production branches - not locally).                                          |
| [**Layout shifts**](/docs/vercel-toolbar/layout-shift-tool)                   | Open the Layout Shift Tool to identify elements causing layout shifts.                                                       |
| [**Interaction timing**](/docs/vercel-toolbar/interaction-timing-tool)        | Inspect in detail each interaction's latency and view your current session's INP.                                            |
| [**Accessibility audit tool**](/docs/vercel-toolbar/accessibility-audit-tool) | Automatically check the Web Content Accessibility Guidelines 2.0 level A and AA rules.                                       |
| **Open Graph**                                                                | View [open graph](https://ogp.me/#metadata) properties for the page you are on and see what the link preview will look like. |
| [**Comments**](/docs/comments)                                                | Access the Comments panel to leave or view feedback.                                                                         |
| [**View inbox**](/docs/comments/using-comments#comment-threads)               | View all open comments.                                                                                                      |
| **Navigate to your team**                                                     | Navigate to your team's dashboard.                                                                                           |
| **Navigate to your project**                                                  | Navigate to your project's dashboard.                                                                                        |
| **Navigate to your deployment**                                               | Navigate to your deployment's dashboard.                                                                                     |
| [**Hide Toolbar**](#enabling-or-disabling-the-toolbar)                        | Hide the toolbar.                                                                                                            |
| [**Disable for session**](#enabling-or-disabling-the-toolbar)                 | Disable the toolbar for the current session.                                                                                 |
| [**Set preferences**](#toolbar-menu-preferences)                              | Set personal preferences for the toolbar.                                                                                    |
| **Logout**                                                                    | Logout of the toolbar.                                                                                                       |

## Setting Custom Keyboard Shortcuts

You can set your own keyboard shortcuts to quickly access specific tools. Additionally, you can change the default keyboard shortcuts for the Toolbar Menu  and for showing/hiding the toolbar  by following these steps:

1. Select Preferences in the Toolbar Menu
2. Select Configure next to Keyboard Shortcuts
3. Select Record shortcut… (or click the X if you have an existing keyboard shortcut set) next to the tool you’d like to set it for
4. Press the keys you’d like to use as the shortcut for that tool
5. To change the keyboard shortcuts for opening the Toolbar Menu and for showing and hiding the toolbar, you must have the [Browser Extension](https://vercel.com/docs/vercel-toolbar/browser-extension) installed.

## Sharing deployments

You can use the Share button in deployments with the Vercel Toolbar enabled, as well as in all preview deployments, to share your deployment's [generated URL](/docs/deployments/generated-urls). When you use the **Share** button from the toolbar, the URL will contain any relevant query parameters.

To share a deployment:

1. Go to the deployment you want to share and ensure you're logged into the Vercel Toolbar.
2. Find the **Share**  button in the Toolbar Menu and select it.
3. From the **Share** dialog, ensure you're allowing the right permissions and click **Copy Link** to copy the deployment URL to your clipboard. To learn more, see [Sharing Deployments](/docs/deployments/sharing-deployments).

If you're on an [Enterprise](/docs/plans/enterprise) team, you will be able to see who shared deployment URLs in your [audit logs](/docs/observability/audit-log).

## Reposition toolbar

You can reposition the toolbar by dragging it to either side of your screen. It will snap into place and appear there across deployments until you move it again. Repositioning only affects where you see the toolbar, it does not change the toolbar position for your collaborators.

## Toolbar Menu preferences

When logged into the Vercel Toolbar, you'll find a **Preferences** button in the Toolbar Menu. In this menu, you can update the following settings:

| Setting                                                             | Description                                                                                                                                                    |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[Notifications](/docs/comments/managing-comments#notifications)** | Set when you will receive notifications for comments in the deployment you're viewing                                                                          |
| **Theme**                                                           | Select your color theme                                                                                                                                        |
| **Layout Shift Detection**                                          | Enable or disable the [Layout Shift Tool](/docs/vercel-toolbar/layout-shift-tool)                                                                              |
| **[Keyboard Shortcuts](#setting-custom-keyboard-shortcuts)**        | Set custom keyboard shortcuts for tools and change the default keyboard shortcuts                                                                              |
| **Accessibility Audit**                                             | Enable or disable the [Accessibility Audit Tool](/docs/vercel-toolbar/accessibility-audit-tool)                                                                |
| **Measure Interaction Timing**                                      | Enable or disable the [Interaction Timing Tool](/docs/vercel-toolbar/interaction-timing-tool)                                                                  |
| **[Browser Extension](/docs/vercel-toolbar/browser-extension)**     | Add Vercel's extension to your browser to take screenshots, enable the toolbar in production, and access **Always Activate** and **Start Hidden** preferences. |
| **Always Activate**                                                 | Sets the toolbar to activate anytime you are authenticated as your Vercel user instead of waiting to be clicked.                                               |
| **Start Hidden**                                                    | Sets the toolbar to start hidden. Read more about [hiding and showing the toolbar](/docs/vercel-toolbar/managing-toolbar#disable-toolbar-for-session).         |

## More resources

- [Preview deployments](/docs/deployments/environments#preview-environment-pre-production)
- [Comments](/docs/comments)
- [Draft Mode](/docs/draft-mode)
- [Edit Mode](/docs/edit-mode)


---

[View full sitemap](/docs/sitemap)
