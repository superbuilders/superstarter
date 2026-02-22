# Add a peer dependency

To add an npm package as a peer dependency, use the `--peer` flag.

```sh
bun add @types/bun --peer
```

***

This will add the package to `peerDependencies` in `package.json`.

```json
{
  "peerDependencies": {
    "@types/bun": "^1.3.3" // [!code ++]
  }
}
```

***

Running `bun install` will install peer dependencies by default, unless marked optional in `peerDependenciesMeta`.

```json
{
  "peerDependencies": {
    "@types/bun": "^1.3.3"
  },
  "peerDependenciesMeta": {
    "@types/bun": { // [!code ++]
      "optional": true // [!code ++]
    } // [!code ++]
  }
}
```

***

See [Docs > Package manager](/pm/cli/install) for complete documentation of Bun's package manager.
