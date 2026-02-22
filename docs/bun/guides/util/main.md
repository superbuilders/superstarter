# Get the absolute path to the current entrypoint

The `Bun.main` property contains the absolute path to the current entrypoint.

  ```ts
  console.log(Bun.main);
  ```

  ```ts
  import "./foo.ts";
  ```

***

The printed path corresponds to the file that is executed with `bun run`.

```sh
bun run index.ts
```

```txt
/path/to/index.ts
```

```sh
bun run foo.ts
```

```txt
/path/to/foo.ts
```

***

See [Docs > API > Utils](/runtime/utils) for more useful utilities.
