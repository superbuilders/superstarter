---
title: vercel dns
product: vercel
url: /docs/cli/dns
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to manage your DNS records for your domains using the vercel dns CLI command.
---

# vercel dns

The `vercel dns` command is used to manage DNS record for domains, providing functionality to list, add, remove, and import records.

> **💡 Note:** When adding DNS records, please wait up to 24 hours for new records to
> propagate.

## Usage

```bash filename="terminal"
vercel dns ls
```

*Using the vercel dns command to list all DNS records
under the current scope.*

## Extended Usage

```bash filename="terminal"
vercel dns add [domain] [subdomain] [A || AAAA || ALIAS || CNAME || TXT] [value]
```

*Using the vercel dns command to add an A record for a
subdomain.*

```bash filename="terminal"
vercel dns add [domain] '@' MX [record-value] [priority]
```

*Using the vercel dns command to add an MX record for
a domain.*

```bash filename="terminal"
vercel dns add [domain] [name] SRV [priority] [weight] [port] [target]
```

*Using the vercel dns command to add an SRV record for
a domain.*

```bash filename="terminal"
vercel dns add [domain] [name] CAA '[flags] [tag] "[value]"'
```

*Using the vercel dns command to add a CAA record for
a domain.*

```bash filename="terminal"
vercel dns rm [record-id]
```

*Using the vercel dns command to remove a record for a
domain.*

```bash filename="terminal"
vercel dns import [domain] [path-to-zonefile]
```

*Using the vercel dns command to import a zonefile for
a domain.*

## Unique Options

These are options that only apply to the `vercel dns` command.

### Limit

The `--limit` option can be used to specify the maximum number of dns records returned when using `ls`. The default value is `20` and the maximum is `100`.

```bash filename="terminal"
vercel dns ls --limit 100
```

*Using the vercel dns ls command with the
\--limit option.*


---

[View full sitemap](/docs/sitemap)
