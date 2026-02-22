# Add a development dependency

To add an npm package as a development dependency, use `bun add --development`.

```sh
bun add zod --dev
bun add zod -d # shorthand
```

***

This will add the package to `devDependencies` in `package.json`.

```json
{
  "devDependencies": {
    "zod": "^3.0.0" // [!code ++]
  }
}
```

***

See [Docs > Package manager](/pm/cli/install) for complete documentation of Bun's package manager.
