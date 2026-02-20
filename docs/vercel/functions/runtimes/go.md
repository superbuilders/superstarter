---
title: Using the Go Runtime with Vercel functions
product: vercel
url: /docs/functions/runtimes/go
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/environment-variables
summary: Learn how to use the Go runtime to compile Go Vercel functions on Vercel.
---

# Using the Go Runtime with Vercel functions

> **🔒 Permissions Required**: The Go runtime

The Go runtime is used by Vercel to compile Go Vercel functions that expose a single HTTP handler, from a `.go` file within an `/api` directory at your project's root.

For example, define an `index.go` file inside an `/api` directory as follows:

```go filename="/api/index.go"
package handler

import (
  "fmt"
  "net/http"
)

func Handler(w http.ResponseWriter, r *http.Request) {
  fmt.Fprintf(w, "<h1>Hello from Go!</h1>")
}
```

*An example index.go file inside an
/api directory.*

For advanced usage, such as using private packages with your Go projects, see the [Advanced Go Usage section](#advanced-go-usage).

> **💡 Note:** The exported function needs to include the [
> `HandlerFunc`
> ](https://golang.org/pkg/net/http/#HandlerFunc) signature type, but can use
> any valid Go exported function declaration as the function name.

## Go Version

The Go runtime will automatically detect the `go.mod` file at the root of your Project to determine the version of Go to use.

If `go.mod` is missing or the version is not defined, the default version 1.20 will be used.

The first time the Go version is detected, it will be automatically downloaded and cached. Subsequent deployments using the same Go version will use the cached Go version instead of downloading it again.

## Go Dependencies

The Go runtime will automatically detect the `go.mod` file at the root of your Project to install dependencies.

## Go Build Configuration

You can provide custom build flags by using the `GO_BUILD_FLAGS` [Environment Variable](/docs/environment-variables).

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "build": {
    "env": {
      "GO_BUILD_FLAGS": "-ldflags '-s -w'"
    }
  }
}
```

*An example -ldflags flag with
-s -w. This will remove debug information from the
output file. This is the default value when no
GO\_BUILD\_FLAGS are provided.*

## Advanced Go Usage

In order to use this runtime, no configuration is needed. You only need to create a file inside the `api` directory.

**The entry point of this runtime is a global matching `.go` files** that export a function that implements the `http.HandlerFunc` signature.

### Private Packages for Go

To install private packages with `go get`, add an [Environment Variable](/docs/environment-variables) named `GIT_CREDENTIALS`.

The value should be the URL to the Git repo including credentials, such as `https://username:token@github.com`.

All major Git providers are supported including GitHub, GitLab, Bitbucket, as well as a self-hosted Git server.

With GitHub, you will need to [create a personal token](https://github.com/settings/tokens) with permission to access your private repository.


---

[View full sitemap](/docs/sitemap)
