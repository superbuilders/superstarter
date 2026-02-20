---
title: vercel rolling-release
product: vercel
url: /docs/cli/rolling-release
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/rolling-releases
summary: "Learn how to manage your project's rolling releases using the vercel rolling-release CLI command."
---

# vercel rolling-release

The `vercel rolling-release` command (also available as `vercel rr`) is used to manage your project's rolling releases. [Rolling releases](/docs/rolling-releases) allow you to gradually roll out new deployments to a small fraction of your users before promoting them to everyone.

## Usage

```bash filename="terminal"
vercel rolling-release [command]
```

*Using vercel rolling-release with a specific command
to manage rolling releases.*

## Commands

### configure

Configure rolling release settings for a project.

```bash filename="terminal"
vercel rolling-release configure --cfg='{"enabled":true, "advancementType":"manual-approval", "stages":[{"targetPercentage":10},{"targetPercentage":50},{"targetPercentage":100}]}'
```

*Using the vercel rolling-release configure command to
set up a rolling release with manual approval stages.*

### start

Start a rolling release for a specific deployment.

```bash filename="terminal"
vercel rolling-release start --dpl=dpl_abc
```

*Using the vercel rolling-release start command to
begin a rolling release for a deployment (where "dpl\_abc" is the deployment ID or URL).*

**Options:**

| Option  | Type    | Required | Description                        |
| ------- | ------- | -------- | ---------------------------------- |
| `--dpl` | String  | Yes      | The deployment ID or URL to target |
| `--yes` | Boolean | No       | Skip confirmation prompt           |

**Examples:**

```bash filename="terminal"
vercel rr start --dpl=dpl_123abc456def
vercel rr start --dpl=https://my-project-abc123.vercel.app
vercel rr start --dpl=dpl_123 --yes
```

### approve

Approve the current stage of an active rolling release.

```bash filename="terminal"
vercel rolling-release approve --dpl=dpl_abc --currentStageIndex=0
```

*Using the vercel rolling-release approve command to
approve the current stage and advance to the next stage.*

### abort

Abort an active rolling release.

```bash filename="terminal"
vercel rolling-release abort --dpl=dpl_abc
```

*Using the vercel rolling-release abort command to
stop an active rolling release.*

### complete

Complete an active rolling release, promoting the deployment to 100% of traffic.

```bash filename="terminal"
vercel rolling-release complete --dpl=dpl_abc
```

*Using the vercel rolling-release complete command to
finish a rolling release and fully promote the deployment.*

### fetch

Fetch details about a rolling release.

```bash filename="terminal"
vercel rolling-release fetch
```

*Using the vercel rolling-release fetch command to get
information about the current rolling release.*

## Unique Options

These are options that only apply to the `vercel rolling-release` command.

### Configuration

The `--cfg` option is used to configure rolling release settings. It accepts a JSON string or the value `'disable'` to turn off rolling releases.

```bash filename="terminal"
vercel rolling-release configure --cfg='{"enabled":true, "advancementType":"automatic", "stages":[{"targetPercentage":10,"duration":5},{"targetPercentage":100}]}'
```

*Using the vercel rolling-release configure command
with automatic advancement.*

### Deployment

The `--dpl` option specifies the deployment ID or URL for rolling release operations.

```bash filename="terminal"
vercel rolling-release start --dpl=https://example.vercel.app
```

*Using the vercel rolling-release start command with a
deployment URL.*

### Current Stage Index

The `--currentStageIndex` option specifies the current stage index when approving a rolling release stage.

```bash filename="terminal"
vercel rolling-release approve --currentStageIndex=0 --dpl=dpl_123
```

*Using the vercel rolling-release approve command with
a specific stage index.*

## Examples

### Configure a rolling release with automatic advancement

```bash filename="terminal"
vercel rolling-release configure --cfg='{"enabled":true, "advancementType":"automatic", "stages":[{"targetPercentage":10,"duration":5},{"targetPercentage":100}]}'
```

This configures a rolling release that starts at 10% traffic, automatically advances after 5 minutes, and then goes to 100%.

### Configure a rolling release with manual approval

```bash filename="terminal"
vercel rolling-release configure --cfg='{"enabled":true, "advancementType":"manual-approval","stages":[{"targetPercentage":10},{"targetPercentage":100}]}'
```

This configures a rolling release that starts at 10% traffic and requires manual approval to advance to 100%.

### Configure a multi-stage rolling release

```bash filename="terminal"
vercel rolling-release configure --cfg='{"enabled":true, "advancementType":"manual-approval", "stages":[{"targetPercentage":10},{"targetPercentage":50},{"targetPercentage":100}]}'
```

This configures a rolling release with three stages: 10%, 50%, and 100% traffic, each requiring manual approval.

### Disable rolling releases

```bash filename="terminal"
vercel rolling-release configure --cfg='disable'
```

This disables rolling releases for the project.


---

[View full sitemap](/docs/sitemap)
