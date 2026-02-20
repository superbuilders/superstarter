---
title: System Specifications
product: vercel
url: /docs/vercel-sandbox/system-specifications
type: conceptual
prerequisites:
  - /docs/vercel-sandbox
related:
  []
summary: Detailed specifications for the Vercel Sandbox environment.
---

# System Specifications

Vercel Sandbox provides a secure, isolated environment for running your code. This page details the runtime environments, available packages, and system configuration.

## Runtimes

Sandbox includes `node24`, `node22`, and `python3.13` images. In all of these images:

- User code is executed as the `vercel-sandbox` user.
- The default working directory is `/vercel/sandbox`.
- `sudo` access is available.

|              | Runtime                   | Package managers |
| ------------ | ------------------------- | ---------------- |
| `node24`     | `/vercel/runtimes/node24` | `npm`, `pnpm`    |
| `node22`     | `/vercel/runtimes/node22` | `npm`, `pnpm`    |
| `python3.13` | `/vercel/runtimes/python` | `pip`, `uv`      |

`node24` is the default runtime if the `runtime` property is not specified.

### Available packages

The base system is Amazon Linux 2023 with the following additional packages:

- `bind-utils`
- `bzip2`
- `findutils`
- `git`
- `gzip`
- `iputils`
- `libicu`
- `libjpeg`
- `libpng`
- `ncurses-libs`
- `openssl`
- `openssl-libs`
- `procps`
- `tar`
- `unzip`
- `which`
- `whois`
- `zstd`

You can install additional packages using `dnf`. See [How to install system packages in Vercel Sandbox](/kb/guide/how-to-install-system-packages-in-vercel-sandbox) for examples.

You can find the [list of available packages](https://docs.aws.amazon.com/linux/al2023/release-notes/all-packages-AL2023.7.html) on the Amazon Linux documentation.

### Sudo config

The sandbox sudo configuration is designed to be straightforward:

- `HOME` is set to `/root`. Commands executed with sudo will source root's configuration files (e.g. `.gitconfig`, `.bashrc`, etc).
- `PATH` is left unchanged. Local or project-specific binaries will still be available when running with elevated privileges.
- The executed command inherits all other environment variables that were set.


---

[View full sitemap](/docs/sitemap)
