---
title: vercel init
product: vercel
url: /docs/cli/init
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/frameworks
summary: Learn how to initialize Vercel supported framework examples locally using the vercel init CLI command.
---

# vercel init

The `vercel init` command is used to initialize [Vercel supported framework](/docs/frameworks) examples locally from the examples found in the [Vercel examples repository](https://github.com/vercel/vercel/tree/main/examples).

## Usage

```bash filename="terminal"
vercel init
```

*Using the vercel init command to initialize a Vercel
supported framework example locally. You will be prompted with a list of
supported frameworks to choose from.*

## Extended Usage

```bash filename="terminal"
vercel init [framework-name]
```

*Using the vercel init command to initialize a
specific framework example from the Vercel examples
repository locally.*

```bash filename="terminal"
vercel init [framework-name] [new-local-directory-name]
```

*Using the vercel init command to initialize a
specific Vercel framework example locally and rename the directory.*

## Unique Options

These are options that only apply to the `vercel env` command.

### Force

The `--force` option, shorthand `-f`, is used to forcibly replace an existing local directory.

```bash filename="terminal"
vercel init --force
```

*Using the vercel init command with the
\--force option.*

```bash filename="terminal"
vercel init gatsby my-project-directory --force
```

*Using the vercel init command with the
\--force option.*


---

[View full sitemap](/docs/sitemap)
