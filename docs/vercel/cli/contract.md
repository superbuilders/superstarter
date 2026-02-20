---
title: vercel contract
product: vercel
url: /docs/cli/contract
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn about vercel contract on Vercel.
---

# vercel contract

The `vercel contract` command displays contract commitment information for your Vercel account. It shows details about your contract periods, commitment types, and values.

## Usage

```bash filename="terminal"
vercel contract
```

*Using the vercel contract command to view all
contract commitments.*

The command outputs a table grouped by contract ID showing:

| Field               | Description                                              |
| ------------------- | -------------------------------------------------------- |
| **Contract ID**     | The unique identifier for each contract                  |
| **Contract Period** | The start and end dates of the contract                  |
| **Commitment Type** | The type of commitment (e.g., spend or usage-based)      |
| **Category**        | Either "Spend" (Pro plans) or "Usage" (Enterprise plans) |
| **Period**          | The commitment period                                    |
| **Commitment**      | The committed value                                      |
| **Description**     | Additional details about the commitment                  |

## Unique options

These are options that only apply to the `vercel contract` command.

### Format

The `--format` option, shorthand `-F`, specifies the output format. Currently, `json` is the only supported format option.

```bash filename="terminal"
vercel contract --format json
```

*Using the vercel contract command to output contract
data as JSON.*

The JSON output includes:

- `context`: The user or team context
- `commitments`: An array of contract commitments with full details
- `totalCount`: The total number of commitments


---

[View full sitemap](/docs/sitemap)
