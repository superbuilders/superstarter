---
title: vercel bisect
product: vercel
url: /docs/cli/bisect
type: reference
prerequisites:
  - /docs/cli
related:
  []
summary: Learn how to perform a binary search on your deployments to help surface issues using the vercel bisect CLI command.
---

# vercel bisect

The `vercel bisect` command can be used to perform a [binary search](https://wikipedia.org/wiki/Binary_search_algorithm "What is a binary search?") upon a set of deployments in a Vercel Project for the purpose of determining when a bug was introduced.

This is similar to [git bisect](https://git-scm.com/docs/git-bisect "What is a git bisect?") but faster because you don't need to wait to rebuild each commit, as long as there is a corresponding Deployment. The command works by specifing both a *bad* Deployment and a *good* Deployment. Then, `vercel bisect` will retrieve all the deployments in between, and step by them one by one. At each step, you will perform your check and specify whether or not the issue you are investigating is present in the Deployment for that step.

Note that if an alias URL is used for either the *good* or *bad* deployment, then the URL will be resolved to the current target of the alias URL. So if your Project is currently in promote/rollback state, then the alias URL may not be the newest chronological Deployment.

> **💡 Note:** The good and bad deployments provided to `vercel bisect` must be
> **production** deployments.

## Usage

```bash filename="terminal"
vercel bisect
```

*Using the vercel bisect command will initiate an
interactive prompt where you specify a good deployment, followed by a bad
deployment and step through the deployments in between to find the first bad
deployment.*

## Unique Options

These are options that only apply to the `vercel bisect` command.

### Good

The `--good` option, shorthand `-g`, can be used to specify the initial "good" deployment from the command line. When this option is present, the prompt will be skipped at the beginning of the bisect session. A production alias URL may be specified for convenience.

```bash filename="terminal"
vercel bisect --good https://example.com
```

*Using the vercel bisect command with the
\--good option.*

### Bad

The `--bad` option, shorthand `-b`, can be used to specify the "bad" deployment from the command line. When this option is present, the prompt will be skipped at the beginning of the bisect session. A production alias URL may be specified for convenience.

```bash filename="terminal"
vercel bisect --bad https://example-s93n1nfa.vercel.app
```

*Using the vercel bisect command with the
\--bad option.*

### Path

The `--path` option, shorthand `-p`, can be used to specify a subpath of the deployment where the issue occurs. The subpath will be appended to each URL during the bisect session.

```bash filename="terminal"
vercel bisect --path /blog/first-post
```

*Using the vercel bisect command with the
\--path option.*

### Open

The `--open` option, shorthand `-o`, will attempt to automatically open each deployment URL in your browser window for convenience.

```bash filename="terminal"
vercel bisect --open
```

*Using the vercel bisect command with the
\--open option.*

### Run

The `--run` option, shorthand `-r`, provides the ability for the bisect session to be automated using a shell script or command that will be invoked for each deployment URL. The shell script can run an automated test (for example, using the `curl` command to check the exit code) which the bisect command will use to determine whether each URL is good (exit code 0), bad (exit code non-0), or should be skipped (exit code 125).

```bash filename="terminal"
vercel bisect --run ./test.sh
```

*Using the vercel bisect command with the
\--run option.*

## Related guides

- [How to determine which Vercel Deployment introduced an issue?](/kb/guide/how-to-determine-which-vercel-deployment-introduced-an-issue)


---

[View full sitemap](/docs/sitemap)
