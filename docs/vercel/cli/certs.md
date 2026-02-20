---
title: vercel certs
product: vercel
url: /docs/cli/certs
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to manage certificates for your domains using the vercel certs CLI command.
---

# vercel certs

The `vercel certs` command is used to manage certificates for domains, providing functionality to list, issue, and remove them. Vercel manages certificates for domains automatically.

## Usage

```bash filename="terminal"
vercel certs ls
```

*Using the vercel certs command to list all
certificates under the current scope.*

## Extended Usage

```bash filename="terminal"
vercel certs issue [domain1, domain2, domain3]
```

*Using the vercel certs command to issue certificates
for multiple domains.*

```bash filename="terminal"
vercel certs rm [certificate-id]
```

*Using the vercel certs command to remove a
certificate by ID.*

## Unique Options

These are options that only apply to the `vercel certs` command.

### Challenge Only

The `--challenge-only` option can be used to only show the challenges needed to issue a certificate.

```bash filename="terminal"
vercel certs issue foo.com --challenge-only
```

*Using the vercel certs command with the
\--challenge-only option.*

### Limit

The `--limit` option can be used to specify the maximum number of certs returned when using `ls`. The default value is `20` and the maximum is `100`.

```bash filename="terminal"
vercel certs ls --limit 100
```

*Using the vercel certs ls command with the
\--limit option.*


---

[View full sitemap](/docs/sitemap)
