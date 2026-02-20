---
title: Accessibility Audit Tool
product: vercel
url: /docs/vercel-toolbar/accessibility-audit-tool
type: how-to
prerequisites:
  - /docs/vercel-toolbar
related:
  - /docs/vercel-toolbar/in-production-and-localhost
  - /docs/vercel-toolbar
  - /docs/vercel-toolbar/interaction-timing-tool
  - /docs/vercel-toolbar/layout-shift-tool
summary: Learn how to use the Accessibility Audit Tool to automatically check the Web Content Accessibility Guidelines 2.0 level A and AA rules.
---

# Accessibility Audit Tool

> **🔒 Permissions Required**: Accessibility Audit Tool

The accessibility audit tool automatically checks the [Web Content Accessibility Guidelines 2.0](https://www.w3.org/TR/WCAG20/) level A and AA rules, grouping them by impact as defined by [deque axe](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md#wcag-21-level-a--aa-rules), and runs in the background on [all environments the toolbar and added to](/docs/vercel-toolbar/in-production-and-localhost).

## Accessing the accessibility audit tool

To access the accessibility audit tool:

1. [Open the Toolbar Menu](/docs/vercel-toolbar#using-the-toolbar-menu)
2. Select the **Accessibility Audit** option. If there are accessibility issues detected on the page, a badge will display next to the option. The number inside the badge details the number of issues detected
3. The **Accessibility** panel will open on the right side of the screen. Here you can filter by **All**, **Critical**, **Serious**, **Moderate**, and **Minor** issues

## Enabling or disabling the accessibility audit tool

The accessibility audit tool is enabled by default. To disable it:

1. Open the **Preferences** panel by selecting the toolbar menu icon, then scrolling down to the **Preferences** section
2. Toggle the **Accessibility Audit** option to enable or disable the tool

## Inspecting accessibility issues

To inspect an accessibility issue select the filter option you want to inspect. A list of issues will are displayed as dropdowns. You can select each dropdown to view the issue details, including an explanation of the issue and a link to the relevant WCAG guideline. Hovering over the failing elements markup will highlight the element on the page, while clicking on the element will log it to the devtools console.

![Image](`/front/docs/vercel-toolbar/accessibility-audit-panel-light.png`)

## Recording accessibility issues

By default the accessibility audit tool will log issues on page load. To test ephemeral states, such as hover or focus, you can record issues by interacting with the page. To record issues select the **Start Recording** button in the **Accessibility** panel. This will start recording issues as you interact with the page. To stop recording, select the **Stop Recording** button. Recording persists for your session, so you can refresh the page, or navigate to a new page and it will continue to record issues while your tab is active.

## More resources

- [Interaction Timing Tool](/docs/vercel-toolbar/interaction-timing-tool)
- [Layout Shift Tool](/docs/vercel-toolbar/layout-shift-tool)


---

[View full sitemap](/docs/sitemap)
