---
title: Using Comments with Preview Deployments
product: vercel
url: /docs/comments/using-comments
type: reference
prerequisites:
  - /docs/comments
related:
  - /docs/comments/integrations
  - /docs/vercel-toolbar/in-production-and-localhost/add-to-production
summary: This guide will help you get started with using Comments with your Vercel Preview Deployments.
---

# Using Comments with Preview Deployments

## Add comments

You must be logged in to create a comment. You can press `c` to enable the comment placement cursor.

Alternatively, select the **Comment** option in the toolbar menu. You can then select a location to place your comment with your cursor.

### Mention users

You can use `@` to mention team members and alert them to your comment. For example, you might want to request Jennifer's input by writing "Hey @Jennifer, how do you feel about this?"

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/comment-light.png`)

### Add emojis to a comment

You can add emojis by entering `:` (the colon symbol) into your comment input box, then entering the name of the emoji. For example, add a smile by entering `:smile:`. As you enter the name of the emoji you want, suggestions will be offered in a popup modal above the input box. You can select one of the suggestions with your cursor.

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/emojis-light.png`)

To add a reaction, select the emoji icon to the right of the name of the commenter whose comment you want to react to. You can then search for the emoji you want to react with.

![Image](`/docs-assets/static/docs/concepts/deployments/preview-deployments/comments/reaction-screenshot-light.png`)

> **💡 Note:** Custom emoji from your Slack organization are supported when you integrate the
> [Vercel Slack app](/docs/comments/integrations#use-the-vercel-slack-app).

### Add screenshots to a comment

You can add screenshots to a comment in any of the following ways:

- Click the plus icon that shows when drafting a comment to upload a file.
- Click the camera icon to take a screenshot of the page you are on.
- Click and drag while in commenting mode to automatically screenshot a portion of the page and start a comment with it attached.

The latter two options are only available to users with the [browser extension](/docs/vercel-toolbar/in-production-and-localhost/add-to-production#accessing-the-toolbar-using-the-chrome-extension) installed.

### Use Markdown in a comment

Markdown is a markup language that allows you to format text, and you can use it to make your comments more readable and visually pleasing.

Supported formatting includes:

### Supported markdown formatting options

| Command             | Keyboard Shortcut (Windows) | Keyboard Shortcut (Mac) | Example Input                   | Example Output                                   |
| ------------------- | --------------------------- | ----------------------- | ------------------------------- | ------------------------------------------------ |
| Bold                | `Ctrl+B`                    | `⌘+B`                   | `*Bold text*`                   | **Bold text**                                    |
| Italic              | `Ctrl+I`                    | `⌘+I`                   | `_Italic text_`                 | *Italic text*                                    |
| Strikethrough       | `Ctrl+Shift+X`              | `⌘+⇧+X`                 | `~Strikethrough text~`          | ~~Strikethrough text~~                           |
| Code-formatted text | `Ctrl+E`                    | `⌘+E`                   | `` `Code-formatted text` ``     | `Code-formatted text`                            |
| Bulleted list       | `-` or `*`                  | `-` or `*`              | `- Item 1 - Item 2`             | • Item 1 • Item 2                                |
| Numbered list       | `1.`                        | `1.`                    | `1. Item 1 2. Item 2`           | 1. Item 1 2. Item 2                              |
| Embedded links      | N/A                         | N/A                     | `[A link](https://example.com)` | [A link](#supported-markdown-formatting-options) |
| Quotes              | `>`                         | `>`                     | `> Quote`                       | │ Quote                                          |

## Comment threads

Every new comment placed on a page begins a thread. The comment author, PR owner, and anyone participating in the conversation will see the thread listed in their **Inbox**.

The Inbox can be opened by selecting the **Inbox** option in the toolbar menu. A small badge will indicate if any comments have been added since you last checked. You can navigate between threads using the up and down arrows near the top of the inbox.

You can move the **Inbox** to the left or right side of the screen by selecting the top of the Inbox modal and dragging it.

### Thread filtering

You can filter threads by selecting the branch name at the top of the **Inbox**. A modal will appear, with the following filter options:

- **Filter by page**: Show comments across all pages in the inbox, or only those that appear on the page you're currently viewing
- **Filter by status**: Show comments in the inbox regardless of status, or either show resolved or unresolved

### Copy comment links

You can copy a link to a comment in two ways:

- Select a comment in the **Inbox**. When you do, the URL will update with an anchor to the selected comment
- Select the ellipses (three dots) icon to the right of the commenter's name, then select the **Copy Link** option in the menu that pops up


---

[View full sitemap](/docs/sitemap)
