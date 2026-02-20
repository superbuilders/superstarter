---
title: vercel guidance
product: vercel
url: /docs/cli/guidance
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Enable or disable guidance messages in the Vercel CLI using the vercel guidance command.
---

# vercel guidance

The `vercel guidance` command allows you to enable or disable guidance messages. Guidance messages are helpful suggestions shown after certain CLI commands complete, such as recommended next steps after a deployment.

## Usage

```bash filename="terminal"
vercel guidance <subcommand>
```

*Using the vercel guidance command to manage guidance
message settings.*

## Subcommands

### enable

Enable guidance messages to receive command suggestions after operations complete.

```bash filename="terminal"
vercel guidance enable
```

*Using vercel guidance enable to turn on guidance
messages.*

### disable

Disable guidance messages if you prefer a quieter CLI experience.

```bash filename="terminal"
vercel guidance disable
```

*Using vercel guidance disable to turn off guidance
messages.*

### status

Check whether guidance messages are currently enabled or disabled.

```bash filename="terminal"
vercel guidance status
```

*Using vercel guidance status to see the current
guidance setting.*

## Examples

### Enable guidance after deployment

```bash filename="terminal"
vercel guidance enable
vercel deploy
```

*After enabling guidance, deployments will show suggested next steps.*

### Check current status

```bash filename="terminal"
vercel guidance status
```

*Shows whether guidance messages are enabled or disabled.*


---

[View full sitemap](/docs/sitemap)
