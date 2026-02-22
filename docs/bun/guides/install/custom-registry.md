# Override the default npm registry for bun install

The default registry is `registry.npmjs.org`. This can be globally configured in `bunfig.toml`.

```toml
[install]
# set default registry as a string
registry = "https://registry.npmjs.org"

# if needed, set a token
registry = { url = "https://registry.npmjs.org", token = "123456" }

# if needed, set a username/password
registry = "https://usertitle:password@registry.npmjs.org"
```

***

Your `bunfig.toml` can reference environment variables. Bun automatically loads environment variables from `.env.local`, `.env.[NODE_ENV]`, and `.env`. See [Docs > Environment variables](/runtime/environment-variables) for more information.

```toml
[install]
registry = { url = "https://registry.npmjs.org", token = "$npm_token" }
```

***

See [Docs > Package manager](/pm/cli/install) for complete documentation of Bun's package manager.
