---
title: vercel cache
product: vercel
url: /docs/cli/cache
type: reference
prerequisites:
  - /docs/cli
related:
  - /docs/cdn-cache
  - /docs/runtime-cache
  - /docs/cdn-cache/purge
summary: Learn how to manage cache for your project using the vercel cache CLI command.
---

# vercel cache

The `vercel cache` command is used to manage the cache for your project, such as [CDN cache](/docs/cdn-cache) and [Runtime cache](/docs/runtime-cache).

Learn more about [purging Vercel cache](/docs/cdn-cache/purge).

## Usage

```bash filename="terminal"
vercel cache purge
```

*Using the vercel cache purge command to purge the CDN
cache and Data cache for the current project.*

## Extended Usage

```bash filename="terminal"
vercel cache purge --type cdn
```

*Using the vercel cache purge --type cdn command to
purge the CDN cache for the currenet project.*

```bash filename="terminal"
vercel cache purge --type data
```

*Using the vercel cache purge --type data command to
purge the Data cache for the current project.*

```bash filename="terminal"
vercel cache invalidate --tag blog-posts
```

*Using the vercel cache invalidate --tag blog-posts command
to invalidate the cached content associated with tag "blog-posts" for the current
project. Subsequent requests for this cached content will serve STALE and
revalidate in the background.*

```bash filename="terminal"
vercel cache dangerously-delete --tag blog-posts
```

*Using the vercel cache dangerously-delete --tag blog-posts
command to dangerously delete the cached content associated with tag "blog-posts" for
the current project. Subsequent requests for this cached content will serve
MISS and therefore block while revalidating.*

```bash filename="terminal"
vercel cache invalidate --srcimg /api/avatar/1
```

*Using the vercel cache invalidate --srcimg /api/avatar/1 command
to invalidate all cached content associated with the source image "/api/avatar/1" for the current
project. Subsequent requests for this cached content will serve STALE and
revalidate in the background.*

```bash filename="terminal"
vercel cache dangerously-delete --srcimg /api/avatar/1
```

*Using the vercel cache dangerously-delete --srcimg /api/avatar/1
command to dangerously delete all cached content associated with the source image "/api/avatar/1" for
the current project. Subsequent requests for this cached content will serve
MISS and therefore block while revalidating.*

```bash filename="terminal"
vercel cache dangerously-delete --srcimg /api/avatar/1 --revalidation-deadline-seconds 604800
```

*Using the vercel cache dangerously-delete --srcimg /api/avatar/1 --revalidation-deadline-seconds 604800
command to dangerously delete all cached content associated with the source image "/api/avatar/1" for
the current project if not accessed in the next 604800 seconds (7 days).*

## Unique Options

These are options that only apply to the `vercel cache` command.

### tag

The `--tag` option specifies which tag to invalidate or delete from the cache. You can provide a single tag or multiple comma-separated tags. This option works with both `invalidate` and `dangerously-delete` subcommands.

```bash filename="terminal"
vercel cache invalidate --tag blog-posts,user-profiles,homepage
```

*Using the vercel cache invalidate command with multiple tags.*

### srcimg

The `--srcimg` option specifies a source image path to invalidate or delete from the cache. This invalidates or deletes all cached transformations of the source image. This option works with both `invalidate` and `dangerously-delete` subcommands.

You can't use both `--tag` and `--srcimg` options together. Choose one based on whether you're invalidating cached content by tag or by source image.

```bash filename="terminal"
vercel cache invalidate --srcimg /api/avatar/1
```

*Using the vercel cache invalidate command with a source image path.*

### revalidation-deadline-seconds

The `--revalidation-deadline-seconds` option specifies the revalidation deadline in seconds. When used with `dangerously-delete`, cached content will only be deleted if it hasn't been accessed within the specified time period.

```bash filename="terminal"
vercel cache dangerously-delete --tag blog-posts --revalidation-deadline-seconds 3600
```

*Using the vercel cache dangerously-delete command with a 1-hour (3600 seconds) revalidation deadline.*

### Yes

The `--yes` option can be used to bypass the confirmation prompt when purging the cache or dangerously deleting cached content.

```bash filename="terminal"
vercel cache purge --yes
```

*Using the vercel cache purge command with the
\--yes option.*


---

[View full sitemap](/docs/sitemap)
