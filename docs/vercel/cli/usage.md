---
title: vercel usage
product: vercel
url: /docs/cli/usage
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn about vercel usage on Vercel.
---

# vercel usage

The `vercel usage` command displays billing usage for the current billing period or a custom date range. It shows usage and costs for each service, helping you understand your resource consumption.

## Usage

```bash filename="terminal"
vercel usage
```

*Using the vercel usage command to view billing usage
for the current billing period.*

```bash filename="terminal"
vercel usage --from 2025-01-01 --to 2025-01-31
```

*Using the vercel usage command to view billing usage
for a custom date range.*

The command outputs a table showing:

- **Service**: The name of each Vercel service
- **Usage**: Resources consumed (USD or legacy MIUs)
- **Effective Cost**: The cost after any applicable discounts
- **Billed Cost**: The final amount charged

## Unique options

These are options that only apply to the `vercel usage` command.

### From

The `--from` option specifies the start date for the usage query. The date is interpreted as midnight in Los Angeles (Pacific) time.

```bash filename="terminal"
vercel usage --from 2025-01-01 --to 2025-01-31
```

*Using the vercel usage command with a custom start
date.*

When using `--from`, you must also specify `--to`.

### To

The `--to` option specifies the end date for the usage query. The date is interpreted as end of day (23:59:59) in Los Angeles (Pacific) time.

```bash filename="terminal"
vercel usage --from 2025-01-01 --to 2025-01-31
```

*Using the vercel usage command with a custom end
date.*

When using `--to`, you must also specify `--from`.

### Breakdown

The `--breakdown` option shows usage grouped by time period instead of aggregated totals. Valid values are `daily`, `weekly`, or `monthly`.

```bash filename="terminal"
vercel usage --breakdown daily
```

*Using the vercel usage command to show daily usage
breakdown.*

```bash filename="terminal"
vercel usage --from 2025-01-01 --to 2025-01-31 --breakdown weekly
```

*Combining --breakdown with a custom date range.*

When using the breakdown mode, the output shows:

- Usage grouped by the specified period (day, week, or month)
- Per-service details for each period
- A grand total at the end

The data supports 1-day granularity with a maximum date range of 1 year.

### Format

The `--format` option, shorthand `-F`, specifies the output format. Currently, `json` is the only supported format option.

```bash filename="terminal"
vercel usage --format json
```

*Using the vercel usage command to output usage data
as JSON.*

The JSON output includes:

- `period`: The start and end dates of the query
- `context`: The user or team context
- `services`: An array of services with usage and cost details
- `totals`: Aggregated totals for all services
- `chargeCount`: The number of individual charges processed

When using `--breakdown`, the JSON output includes a `breakdown` array containing usage data for each period, plus a `grandTotal` object with aggregated totals.


---

[View full sitemap](/docs/sitemap)
