# Add an optional dependency

To add an npm package as an optional dependency, use the `--optional` flag.

```sh
bun add zod --optional
```

***

This will add the package to `optionalDependencies` in `package.json`.

```json
{
  "optionalDependencies": {
    "zod": "^3.0.0" // [!code ++]
  }
}
```

***

See [Docs > Package manager](/pm/cli/install) for complete documentation of Bun's package manager.
