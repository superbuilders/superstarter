---
title: Rollback Production
product: vercel
url: /docs/deployments/rollback-production-deployment
type: conceptual
prerequisites:
  - /docs/deployments
related:
  - /docs/cli/project-linking
  - /docs/cli/rollback
  - /docs/cli/promote
  - /docs/cli/bisect
  - /docs/cli/inspect
summary: Learn about rollback production on Vercel.
---

# Rolling Back a Production Deployment

Use this guide to recover from a bad production deployment. You'll roll back to restore service, investigate the root cause, and deploy a fix.

> **💡 Note:** This guide requires a [linked Vercel project](/docs/cli/project-linking). Run `vercel link` in your
> project directory if you haven't already.

## Quick reference

Use this block when you already know what you're doing and want the full command sequence. Use the steps below for context and checks.

```bash filename="terminal"
# 1. Confirm the problem
vercel logs --environment production --status-code 5xx --since 30m

# 2. Roll back immediately to restore service
vercel rollback
vercel rollback status

# 3. Verify service is restored
vercel logs --environment production --status-code 5xx --since 5m

# 4. Identify the bad deployment
vercel list --prod
vercel inspect <bad-deployment-url>

# 5. Check build logs for clues
vercel inspect <bad-deployment-url> --logs

# 6. Compare error logs between good and bad deployments
vercel logs --deployment <bad-deployment-id> --level error --expand
vercel logs --deployment <good-deployment-id> --level error --expand

# IF the cause spans multiple deployments, binary-search with bisect:
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url>
# OR automate bisect with a test script (exit 0 = good, non-zero = bad, 125 = skip):
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url> --run ./test.sh

# 7. Fix and deploy a preview
vercel deploy
vercel curl /affected-route --deployment <preview-url>
vercel logs --deployment <preview-deployment-id> --level error

# 8. Ship to production
vercel deploy --prod
vercel logs --environment production --status-code 5xx --since 5m

# ALTERNATIVE to redeploying: promote an existing good deployment directly
vercel promote <deployment-url>
vercel promote status
```

## 1. Confirm the problem

Before rolling back, verify that the current production deployment is actually broken. Check for errors in production logs:

```bash filename="terminal"
vercel logs --environment production --status-code 5xx --since 30m
```

If you're seeing a spike in errors or user reports, move to the next step.

## 2. Roll back immediately

When production is broken, restoring service is the priority. Roll back to the previous production deployment:

```bash filename="terminal"
vercel rollback
```

This instantly points production traffic to your previous deployment without rebuilding. The rollback happens at the routing layer, so it takes effect within seconds.

> **💡 Note:** On the Hobby plan, you can only roll back to the immediately previous
> production deployment. Pro and Enterprise plans can roll back to any previous
> production deployment by specifying the deployment URL.

To verify the rollback completed:

```bash filename="terminal"
vercel rollback status
```

## 3. Verify service is restored

Confirm that the rollback resolved the issue by checking production logs again:

```bash filename="terminal"
vercel logs --environment production --status-code 5xx --since 5m
```

If the error count has dropped, service is restored and you can investigate at your own pace.

## 4. Identify the bad deployment

List recent production deployments to find the one that caused the issue:

```bash filename="terminal"
vercel list --prod
```

This shows deployment URLs, timestamps, and the git commits that triggered them. Identify the deployment that was serving traffic when the errors started.

To see full details about that deployment:

```bash filename="terminal"
vercel inspect <bad-deployment-url>
```

This shows the git commit SHA, branch, build time, and other metadata.

## 5. Check the build logs

Sometimes the issue is visible in the build output. Check the build logs for warnings or errors that were missed:

```bash filename="terminal"
vercel inspect <bad-deployment-url> --logs
```

Look for deprecation warnings, missing environment variables, or build-time errors that didn't block the deployment but affected runtime behavior.

## 6. Compare with the last known good deployment

If the cause isn't obvious, compare error logs between the good and bad deployments:

```bash filename="terminal"
vercel logs --deployment <bad-deployment-id> --level error --expand
```

```bash filename="terminal"
vercel logs --deployment <good-deployment-id> --level error --expand
```

The difference in error patterns between the two deployments narrows down what changed.

## 7. Bisect if the cause spans multiple deployments

If several deployments went out between the last known good state and the broken one, use `vercel bisect` to binary-search through them:

```bash filename="terminal"
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url>
```

This walks through deployments one at a time, letting you check each one and mark it as good or bad. It finds the exact deployment that introduced the regression.

To automate the bisect with a test script:

```bash filename="terminal"
vercel bisect --good <good-deployment-url> --bad <bad-deployment-url> --run ./test.sh
```

The script receives the deployment URL as an argument. Exit code 0 means good, non-zero means bad, and 125 means skip.

## 8. Fix and deploy

Once you've identified the root cause, make the fix locally and deploy a preview:

```bash filename="terminal"
vercel deploy
```

Verify the fix against the preview deployment:

```bash filename="terminal"
vercel curl /affected-route --deployment <preview-url>
```

Check that no errors appear in the preview logs:

```bash filename="terminal"
vercel logs --deployment <preview-deployment-id> --level error
```

## 9. Ship to production

When the fix passes verification, deploy to production:

```bash filename="terminal"
vercel deploy --prod
```

Confirm the fix is working in production:

```bash filename="terminal"
vercel logs --environment production --status-code 5xx --since 5m
```

## Rolling back to a specific deployment

If you're on the Pro or Enterprise plan and need to roll back to a specific older deployment rather than just the previous one:

```bash filename="terminal"
vercel rollback <deployment-url>
```

You can also use `vercel promote` to promote any existing deployment to production:

```bash filename="terminal"
vercel promote <deployment-url>
```

To check the promotion status:

```bash filename="terminal"
vercel promote status
```

## Related

- [vercel rollback](/docs/cli/rollback)
- [vercel promote](/docs/cli/promote)
- [vercel bisect](/docs/cli/bisect)
- [vercel inspect](/docs/cli/inspect)
- [Instant Rollback](/docs/instant-rollback)
- [Debugging production 500 errors](/docs/observability/debug-production-errors)


---

[View full sitemap](/docs/sitemap)
