---
title: Build Queues
product: vercel
url: /docs/builds/build-queues
type: conceptual
prerequisites:
  - /docs/builds
related:
  - /docs/builds/managing-builds
  - /docs/deployments/managing-builds
  - /docs/deployments/concurrent-builds
summary: Understand how concurrency and same branch build queues manage multiple simultaneous deployments.
---

# Build Queues

> **💡 Note:** Turbo build machines are now enabled by default for new Pro projects - [Learn
> more](/docs/builds/managing-builds#larger-build-machines)

Build queueing is when a build must wait for resources to become available before starting. This creates more time between when the code is committed and the deployment being ready.

- [With On-Demand Concurrent Builds](#with-on-demand-concurrent-builds), builds will never queue.
- [Without On-Demand Concurrent Builds](#without-on-demand-concurrent-builds), builds can queue under the conditions specified below.

## With On-Demand Concurrent Builds

[On-Demand Concurrent Builds](/docs/builds/managing-builds#on-demand-concurrent-builds) prevent build queueing so your team can build faster. Vercel dynamically scales the amount of builds that can run simultaneously.

You can choose between two modes:

- **Run all builds immediately**: All builds proceed in parallel without waiting. Your builds will never be queued.
- **Run up to one build per branch**: Limit to one active build per branch. New deployments to the same branch won't be processed while there is an ongoing build, but builds to different branches proceed immediately.

To configure on-demand concurrent builds, see [Project-level on-demand concurrent builds](/docs/builds/managing-builds#project-level-on-demand-concurrent-builds).

**If you're experiencing build queues, we strongly recommend [enabling On-Demand Concurrent Builds](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fbuild-and-deployment%23on-demand-concurrent-builds\&title=Enable+On-Demand+Concurrent+Builds)**. For billing information, [visit the usage and limits section for builds](/docs/builds/managing-builds#usage-and-limits).

## Without On-Demand Concurrent Builds

When multiple deployments are started concurrently from code changes, Vercel's build system places deployments into one of the following queues:

- [Concurrency queue](#concurrency-queue): The basics of build resource management
- [Git branch queue](#git-branch-queue): How builds to the same branch are managed

## Concurrency queue

This queue manages how many builds can run in parallel based on the number of [concurrent build slots](/docs/builds/managing-builds#concurrent-builds) available to the team. If all concurrent build slots are in use, new builds are queued until a slot becomes available unless you have **On-Demand Concurrent Builds** [enabled at the project level](/docs/deployments/managing-builds#project-level-on-demand-concurrent-builds).

### How concurrent build slots work

Concurrent build slots are the key factor in concurrent build queuing. They control how many builds can run at the same time and ensure efficient use of resources while prioritizing the latest changes.

Each account plan comes with a predefined number of build slots:

- Hobby accounts allow one build at a time.
- Pro accounts support up to 12 simultaneous builds.
- Enterprise accounts can have [custom limits](/docs/deployments/concurrent-builds#usage-and-limits) based on their plan.

## Git branch queue

Builds are handled sequentially. If new commits are pushed while a build is in progress:

1. The current build is completed first.
2. Queued builds for earlier commits are skipped.
3. The most recent commit is built and deployed.

This means that commits in between the current build and most recent commit will not produce builds.

> **💡 Note:** Enterprise users can use [Urgent On-Demand
> Concurrency](/docs/deployments/managing-builds#urgent-on-demand-concurrent-builds)
> to skip the Git branch queue for specific builds.


---

[View full sitemap](/docs/sitemap)
