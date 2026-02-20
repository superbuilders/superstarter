---
title: Debug 500 Errors
product: vercel
url: /docs/observability/debug-production-errors
type: conceptual
prerequisites:
  - /docs/observability
related:
  - /docs/cli/logs
  - /docs/cli/inspect
  - /docs/cli/curl
  - /docs/cli/bisect
  - /docs/cli/rollback
summary: Learn about debug 500 errors on Vercel.
---

# Debugging Production 500 Errors

Use this guide to debug production 500 errors. You'll identify the problem, trace it to a root cause, and deploy a verified fix.

> **💡 Note:** This guide requires a linked Vercel project. Run `vercel link` in your
> project directory if you haven't already.

## Quick reference

Use this block when you already know what you're doing and want the full command sequence. Use the steps below for context and checks.

```bash filename="terminal"
# 1. Find 500 errors in production
vercel logs --environment production --status-code 5xx --since 1h

# 2. Get structured data to filter programmatically
vercel logs --environment production --status-code 500 --json --since 1h \
  | jq '{path: .path, message: .message, timestamp: .timestamp}'

# 3. Narrow the time range once you know when errors started
vercel logs --environment production --status-code 500 --since 2h --until 1h

# 4. Identify the failing deployment
vercel list --prod
vercel inspect <deployment-url>
vercel inspect <deployment-url> --logs    # build logs

# 5. Correlate with source code
git log --oneline -10
git show <commit-sha> --stat

# 6. Fix locally, then deploy a preview
vercel deploy

# 7. Verify the fix against the preview
vercel curl /api/failing-route --deployment <preview-url>
vercel logs --deployment <preview-deployment-id> --level error

# 8. Ship to production
vercel deploy --prod

# 9. Confirm the fix
vercel logs --environment production --status-code 500 --since 5m

# IF you cannot identify the failing deployment from logs:
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url> --path /api/failing-route

# IF errors are severe and you need to restore service before debugging:
vercel rollback
vercel rollback status
```

## 1. Find the 500 errors

Start by pulling production error logs from the last hour. The `--status-code 5xx` filter catches all server errors, not just 500s, so you get the full picture:

```bash filename="terminal"
vercel logs --environment production --status-code 5xx --since 1h
```

If the output is noisy, narrow it down to a specific status code:

```bash filename="terminal"
vercel logs --environment production --status-code 500 --since 1h
```

At this point, you're looking for patterns: are the errors concentrated on one route, or spread across many? Is there a common error message?

## 2. Get structured log data

Switch to JSON output so you can filter and search programmatically. Pipe through `jq` to extract the fields you need:

```bash filename="terminal"
vercel logs --environment production --status-code 500 --json --since 1h \
  | jq '{path: .path, message: .message, timestamp: .timestamp}'
```

If you spot a recurring error message, search for it directly:

```bash filename="terminal"
vercel logs --environment production --query "Cannot read properties of undefined" --since 1h --expand
```

The `--expand` flag shows full log messages instead of truncating them, which is important when error stack traces get cut off.

## 3. Narrow the time range

Once you identify when the errors started, use `--since` and `--until` to zoom into that window. This reduces noise and helps you spot the exact trigger:

```bash filename="terminal"
vercel logs --environment production --status-code 500 --since 2h --until 1h
```

If you have a specific request ID from an error report or alert, pull the full details for that request:

```bash filename="terminal"
vercel logs --request-id req_xxxxx --expand
```

## 4. Identify the failing deployment

Check which deployment is currently serving production traffic. If errors started recently, compare the current deployment against earlier ones:

```bash filename="terminal"
vercel list --prod
```

To see full details about the current production deployment, including the git commit that triggered it:

```bash filename="terminal"
vercel inspect <deployment-url>
```

If you need the build logs to check for warnings or errors during the build:

```bash filename="terminal"
vercel inspect <deployment-url> --logs
```

## 5. Correlate with the source code

At this point, you know the failing route, the error message, and which deployment introduced the problem. Use the git commit from `vercel inspect` to find the relevant code change:

```bash filename="terminal"
git log --oneline -10
git show <commit-sha> --stat
```

Read the source code for the failing route and identify the bug. Common causes of 500 errors include:

- Unhandled null or undefined values from API responses
- Missing environment variables
- Database connection failures
- Type mismatches after a dependency update

## 6. Fix and deploy a preview

After making the fix locally, deploy a preview to test it without affecting production:

```bash filename="terminal"
vercel deploy
```

This outputs a preview URL. Save it for the next step.

## 7. Verify the fix

Test the specific route that was failing using `vercel curl`, which automatically handles deployment protection:

```bash filename="terminal"
vercel curl /api/failing-route --deployment <preview-url>
```

Check the response status and body. If you need timing details to confirm the fix didn't introduce latency:

```bash filename="terminal"
vercel httpstat /api/failing-route --deployment <preview-url>
```

Check the preview deployment's logs to confirm no new errors:

```bash filename="terminal"
vercel logs --deployment <preview-deployment-id> --level error
```

## 8. Ship to production

Once the preview passes verification, deploy to production:

```bash filename="terminal"
vercel deploy --prod
```

## 9. Confirm the fix in production

After the production deployment completes, verify that the errors have stopped:

```bash filename="terminal"
vercel logs --environment production --status-code 500 --since 5m
```

If the output is empty, the fix is working.

## When you can't find the cause

If the error started between two deployments and you can't pinpoint the change, use `vercel bisect` to binary-search through your deployment history:

```bash filename="terminal"
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url> --path /api/failing-route
```

This steps through deployments between the good and bad ones, letting you identify exactly which deployment introduced the regression.

## When you need to restore service immediately

If the errors are severe and you need to restore service while you investigate, roll back to the previous production deployment:

```bash filename="terminal"
vercel rollback
```

This instantly points production traffic to your previous deployment. You can then debug at your own pace and deploy the fix when it's ready.

To check the rollback status:

```bash filename="terminal"
vercel rollback status
```

## Related

- [vercel logs](/docs/cli/logs)
- [vercel inspect](/docs/cli/inspect)
- [vercel curl](/docs/cli/curl)
- [vercel bisect](/docs/cli/bisect)
- [vercel rollback](/docs/cli/rollback)
- [Observability](/docs/observability)


---

[View full sitemap](/docs/sitemap)
