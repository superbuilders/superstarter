# Copy a file to another location

This code snippet copies a file to another location on disk.

It uses the fast [`Bun.write()`](/runtime/file-io#writing-files-bun-write) API to efficiently write data to disk. The first argument is a *destination*, like an absolute path or `BunFile` instance. The second argument is the *data* to write.

```ts
const file = Bun.file("/path/to/original.txt");
await Bun.write("/path/to/copy.txt", file);
```

***

See [Docs > API > File I/O](/runtime/file-io#writing-files-bun-write) for complete documentation of `Bun.write()`.
