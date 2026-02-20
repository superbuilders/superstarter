---
title: vercel flags
product: vercel
url: /docs/cli/flags
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/flags/vercel-flags
  - /docs/flags/vercel-flags/dashboard
summary: Learn about vercel flags on Vercel.
---

# vercel flags

The `vercel flags` command manages [Vercel Flags](/docs/flags/vercel-flags) for a project directly from the command line. You can create, list, inspect, enable, disable, archive, and delete feature flags, as well as manage SDK keys.

## Usage

```bash filename="terminal"
vercel flags list
```

*Using the vercel flags command to list all active
feature flags.*

```bash filename="terminal"
vercel flags add [slug]
```

*Using the vercel flags command to create a new
feature flag.*

```bash filename="terminal"
vercel flags inspect [flag]
```

*Using the vercel flags command to display information
about a feature flag.*

```bash filename="terminal"
vercel flags enable [flag]
```

*Using the vercel flags command to enable a boolean
feature flag in an environment.*

```bash filename="terminal"
vercel flags disable [flag]
```

*Using the vercel flags command to disable a boolean
feature flag in an environment.*

```bash filename="terminal"
vercel flags archive [flag]
```

*Using the vercel flags command to archive a feature
flag.*

```bash filename="terminal"
vercel flags rm [flag]
```

*Using the vercel flags command to delete a feature
flag.*

## Extended usage

### Adding flags

Boolean flags are created by default. You can specify a different kind and an optional description:

```bash filename="terminal"
vercel flags add my-feature --kind string --description "My feature flag"
```

*Creating a string feature flag with a description.*

When you create a flag, default variants are generated based on the kind:

| Kind      | Default variants              |
| --------- | ----------------------------- |
| `boolean` | Off (`false`) and On (`true`) |
| `string`  | `Value 1` and `Value 2`       |
| `number`  | `50`, `100`, and `200`        |

All three environments (production, preview, and development) start as paused.

### Enabling and disabling flags

The `enable` and `disable` commands control whether a boolean flag evaluates rules in a given environment. If you don't provide the `--environment` option, you'll be prompted to select one interactively.

```bash filename="terminal"
vercel flags enable my-feature --environment production
```

*Enabling a flag in production so it evaluates rules and serves variants.*

```bash filename="terminal"
vercel flags disable my-feature -e production --variant off
```

*Disabling a flag with a specific variant to serve while disabled.*

> **💡 Note:** The `enable` and `disable`
> commands only work with boolean flags. For string or number flags, update them
> in the
> .

### Archiving and removing flags

A flag must be archived before it can be deleted. Archived flags stop evaluating and can be restored from the [dashboard](/docs/flags/vercel-flags/dashboard).

```bash filename="terminal"
vercel flags archive my-feature --yes
```

*Archiving a flag without a confirmation prompt.*

```bash filename="terminal"
vercel flags rm my-feature --yes
```

*Deleting an archived flag without a confirmation prompt.*

### SDK keys

The `vercel flags sdk-keys` subcommand manages SDK keys for your project. SDK keys authenticate your application when evaluating flags. You can create keys for different environments and key types.

```bash filename="terminal"
vercel flags sdk-keys ls
```

*Using the vercel flags sdk-keys ls command to list
all SDK keys.*

```bash filename="terminal"
vercel flags sdk-keys add --type server --environment production
```

*Creating a server SDK key for the production environment.*

```bash filename="terminal"
vercel flags sdk-keys rm [hash-key]
```

*Using the vercel flags sdk-keys rm command to delete
an SDK key.*

When you create an SDK key, the output includes:

- **Hash key**: A truncated identifier shown in the key list
- **SDK key**: The full key value, shown only at creation time
- **Connection string**: A `flags:` URI containing all configuration needed to connect to Vercel Flags

> **⚠️ Warning:** Save the SDK key when it's created. It won't be shown again.

If you don't provide the `--environment` option, you'll be prompted to select one interactively.

## Unique options

These are options that only apply to the `vercel flags` command.

### State

The `--state` option, shorthand `-s`, filters the list of flags by state when using `vercel flags list`. Valid values are `active` and `archived`. Defaults to `active`.

```bash filename="terminal"
vercel flags ls --state archived
```

*Using the vercel flags ls command with the
\--state option to list archived flags.*

### Kind

The `--kind` option, shorthand `-k`, specifies the type of a new flag when using `vercel flags add`. Valid values are `boolean`, `string`, and `number`. Defaults to `boolean`.

```bash filename="terminal"
vercel flags add my-feature --kind string
```

*Using the vercel flags add command with the
\--kind option to create a string flag.*

### Description

The `--description` option, shorthand `-d`, sets a description for a new flag when using `vercel flags add`.

```bash filename="terminal"
vercel flags add my-feature --description "Controls the new onboarding flow"
```

*Using the vercel flags add command with the
\--description option.*

### Environment

The `--environment` option, shorthand `-e`, specifies the target environment for `vercel flags enable`, `vercel flags disable`, and `vercel flags sdk-keys add`. Valid values are `production`, `preview`, and `development`.

```bash filename="terminal"
vercel flags enable my-feature --environment production
```

*Using the vercel flags enable command with the
\--environment option.*

### Variant

The `--variant` option, shorthand `-v`, specifies the variant ID to serve when disabling a flag with `vercel flags disable`.

```bash filename="terminal"
vercel flags disable my-feature -e production --variant off
```

*Using the vercel flags disable command with the
\--variant option.*

### Type

The `--type` option specifies the type of SDK key when using `vercel flags sdk-keys add`.

```bash filename="terminal"
vercel flags sdk-keys add --type server --environment production
```

*Using the vercel flags sdk-keys add command with
the --type option.*

### Label

The `--label` option, shorthand `-l`, sets an optional label for an SDK key when using `vercel flags sdk-keys add`.

```bash filename="terminal"
vercel flags sdk-keys add --type server -e production --label "Production Server Key"
```

*Using the vercel flags sdk-keys add command with
the --label option.*

### Yes

The `--yes` option, shorthand `-y`, skips the confirmation prompt when archiving or deleting a flag, or when deleting an SDK key.

```bash filename="terminal"
vercel flags archive my-feature --yes
```

*Using the vercel flags archive command with the
\--yes option to skip confirmation.*


---

[View full sitemap](/docs/sitemap)
