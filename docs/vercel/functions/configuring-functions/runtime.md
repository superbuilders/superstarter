---
title: Configuring the Runtime for Vercel Functions
product: vercel
url: /docs/functions/configuring-functions/runtime
type: how-to
prerequisites:
  - /docs/functions/configuring-functions
  - /docs/functions
related:
  - /docs/functions/runtimes
summary: Learn how to configure the runtime for Vercel Functions.
---

# Configuring the Runtime for Vercel Functions

The runtime of your function determines the environment in which your function will execute. Vercel supports various runtimes including Node.js, Python, Ruby, and Go. You can also configure [other runtimes](/docs/functions/runtimes#community-runtimes) using the `vercel.json` file. Here's how to set up each:

## Node.js

By default, a function with no additional configuration will be deployed as a Vercel Function on the Node.js runtime.

> For \['nextjs']:

```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="app/api/hello/route.js" framework=nextjs
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts filename="api/hello.ts" framework=other
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js filename="api/hello.js" framework=other
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

```ts v0="build" filename="app/api/hello/route.ts" framework=nextjs-app
export function GET(request: Request) {
  return new Response('Hello from Vercel!');
}
```

```js v0="build" filename="app/api/hello/route.js" framework=nextjs-app
export function GET(request) {
  return new Response('Hello from Vercel!');
}
```

> **💡 Note:** If you're not using a framework, you must either add
> `"type": "module"` to your
> `package.json` or change your JavaScript Functions'
> file extensions from `.js` to
> `.mjs`

## Go

For Go, expose a single HTTP handler from a `.go` file within an `/api` directory at your project's root. For example:

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

## Python

For Python, create a function by adding the following code to `api/index.py`:

```py filename="api/index.py"
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        self.wfile.write('Hello, world!'.encode('utf-8'))
        return
```

## Ruby

For Ruby, define an HTTP handler from `.rb` files within an `/api` directory at your project's root. Ruby files must have one of the following variables defined:

- `Handler` proc that matches the `do |request, response|` signature
- `Handler` class that inherits from the `WEBrick::HTTPServlet::AbstractServlet` class

For example:

```ruby filename="api/index.rb"
require 'cowsay'

Handler = Proc.new do |request, response|
  name = request.query['name'] || 'World'

  response.status = 200
  response['Content-Type'] = 'text/text; charset=utf-8'
  response.body = Cowsay.say("Hello #{name}", 'cow')
end
```

Don't forget to define your dependencies inside a `Gemfile`:

```ruby filename="Gemfile"
source "https://rubygems.org"

gem "cowsay", "~> 0.3.0"
```

## Other runtimes

You can configure other runtimes by using the `functions` property in your `vercel.json` file. For example:

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/test.php": {
      "runtime": "vercel-php@0.5.2"
    }
  }
}
```

In this case, the function at `api/hello.ts` would use the custom runtime specified.

For more information, see [Community runtimes](/docs/functions/runtimes#community-runtimes)


---

[View full sitemap](/docs/sitemap)
