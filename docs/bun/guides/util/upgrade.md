# Upgrade Bun to the latest version

Bun can upgrade itself using the built-in `bun upgrade` command. This is the fastest way to get the latest features and bug fixes.

```bash
bun upgrade
```

This downloads and installs the latest stable version of Bun, replacing the currently installed version.

> **Note:** To see the current version of Bun, run `bun --version`.

***

## Verify the upgrade

After upgrading, verify the new version:

```bash
bun --version
# Output: 1.x.y

# See the exact commit of the Bun binary
bun --revision
# Output: 1.x.y+abc123def
```

***

## Upgrade to canary builds

Canary builds are automatically released on every commit to the `main` branch. These are untested but useful for trying new features or verifying bug fixes before they're released.

```bash
bun upgrade --canary
```

> **Warning:** Canary builds are not recommended for production use. They may contain bugs or breaking changes.

***

## Switch back to stable

If you're on a canary build and want to return to the latest stable release:

```bash
bun upgrade --stable
```

***

## Install a specific version

To install a specific version of Bun, use the install script with a version tag:

    ```bash
    curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.3"
    ```

    ```powershell
    iex "& {$(irm https://bun.sh/install.ps1)} -Version 1.3.3"
    ```

***

## Package manager users

If you installed Bun via a package manager, use that package manager to upgrade instead of `bun upgrade` to avoid conflicts.

> **Tip:** **Homebrew users** <br /> To avoid conflicts with Homebrew, use `brew upgrade bun` instead. **Scoop users** <br /> To avoid conflicts with Scoop, use `scoop update bun` instead.

***

## See also

* [Installation](/installation) — Install Bun for the first time
* [Update packages](/pm/cli/update) — Update dependencies to latest versions
