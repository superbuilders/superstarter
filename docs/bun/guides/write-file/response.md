# Write a Response to a file

This code snippet writes a `Response` to disk at a particular path. Bun will consume the `Response` body according to its `Content-Type` header.

It uses the fast [`Bun.write()`](/runtime/file-io#writing-files-bun-write) API to efficiently write data to disk. The first argument is a *destination*, like an absolute path or `BunFile` instance. The second argument is the *data* to write.

```ts
const result = await fetch("https://bun.com");
const path = "./file.txt";
await Bun.write(path, result);
```

***

See [Docs > API > File I/O](/runtime/file-io#writing-files-bun-write) for complete documentation of `Bun.write()`.
