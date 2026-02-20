---
title: Using the Python Runtime with Vercel Functions
product: vercel
url: /docs/functions/runtimes/python
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/frameworks/backend/fastapi
  - /docs/frameworks/backend/flask
summary: Learn how to use the Python runtime to compile Python Vercel Functions on Vercel.
---

# Using the Python Runtime with Vercel Functions

> **🔒 Permissions Required**: The Python runtime

The Python runtime enables you to write Python code, including using [FastAPI](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/python/fastapi), [Django](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/python/django), and [Flask](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/python/flask), with Vercel Functions.

You can create your first function, available at the `/api` route, as follows:

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

*A hello world Python API using Vercel functions.*

## Python version

The Python runtime will respect the Python version requirements of any `pyproject.toml`, `.python-version` or `Pipfile.lock` at the root of your project.

If the required Python version is not defined or not supported, the default version will be used.

The current available versions are:

- **3.12** (default)
- **3.13**
- **3.14**

## Dependencies

You can install dependencies for your Python projects by defining them in a `pyproject.toml` with or without a corresponding `uv.lock`, `requirements.txt`, or a `Pipfile` with corresponding `Pipfile.lock`.

```python filename="requirements.txt"
fastapi==0.117.1
```

*An example requirements.txt file that defines
FastAPI as a dependency.*

```toml filename="pyproject.toml"
[project]
name = "my-python-api"
version = "0.1.0"
description = "Add your description here"
readme = "README.md"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.117.1",
]
```

*An example pyproject.toml file that defines
FastAPI as a dependency.*

## Streaming Python functions

Vercel Functions support streaming responses when using the Python runtime. This allows you to render parts of the UI as they become ready, letting users interact with your app before the entire page finishes loading.

## Controlling what gets bundled

By default, Python Vercel Functions include all files from your project that are reachable at build time. Unlike the Node.js runtime, there is no automatic tree-shaking to remove dead code or unused dependencies.

You should make sure your `pyproject.toml` or `requirements.txt` only lists packages necessary for runtime and you should also explicitly exclude files you don't need in your functions to keep bundles small and avoid hitting size limits.

> **💡 Note:** Python functions have a maximum uncompressed bundle size of . See the
> .

To exclude unnecessary files (for example: tests, static assets, and test data), configure `excludeFiles` in `vercel.json` under the `functions` key. The pattern is a [glob](https://github.com/isaacs/node-glob#glob-primer) relative to your project root.

```json filename="vercel.json"
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/**/*.py": {
      "excludeFiles": "{tests/**,__tests__/**,**/*.test.py,**/test_*.py,fixtures/**,__fixtures__/**,testdata/**,sample-data/**,static/**,assets/**}"
    }
  }
}
```

*Exclude common development and static folders from all Python functions to
stay under the 250 MB bundle limit.*

## Using FastAPI with Vercel

FastAPI is a modern, high-performance, web framework for building APIs with Python. For information on how to use FastAPI with Vercel, review this [guide](/docs/frameworks/backend/fastapi).

## Using Flask with Vercel

Flask is a lightweight WSGI web application framework. For information on how to use Flask with Vercel, review this [guide](/docs/frameworks/backend/flask).

## Other Python Frameworks

For FastAPI, Flask, or basic usage of the Python runtime, no configuration is required. Usage of the Python runtime with other frameworks, including Django, requires some configuration.

**The entry point of this runtime is a glob matching `.py` source files** with one of the following variables defined:

- `handler` that inherits from the `BaseHTTPRequestHandler` class
- `app` that exposes a WSGI or ASGI Application

### Reading Relative Files in Python

Python uses the current working directory when a relative file is passed to [open()](https://docs.python.org/3/library/functions.html#open).

The current working directory is the base of your project, not the `api/` directory.

For example, the following directory structure:

```py filename="directory"
├── README.md
├── api
|  ├── user.py
├── data
|  └── file.txt
└── requirements.txt
```

With the above directory structure, your function in `api/user.py` can read the contents of `data/file.txt` in a couple different ways.

You can use the path relative to the project's base directory.

```py filename="api/user.py"

from http.server import BaseHTTPRequestHandler
from os.path import join

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        with open(join('data', 'file.txt'), 'r') as file:
          for line in file:
            self.wfile.write(line.encode())
        return
```

Or you can use the path relative to the current file's directory.

```py filename="api/user.py"

from http.server import BaseHTTPRequestHandler
from os.path import dirname, abspath, join
dir = dirname(abspath(__file__))

class handler(BaseHTTPRequestHandler):

    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type','text/plain')
        self.end_headers()
        with open(join(dir, '..', 'data', 'file.txt'), 'r') as file:
          for line in file:
            self.wfile.write(line.encode())
        return
```

### Web Server Gateway Interface

The Web Server Gateway Interface (WSGI) is a calling convention for web servers to forward requests to web applications written in Python. You can use WSGI with frameworks such as Flask or Django.

- [Deploy an example with Flask](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/python/flask)
- [Deploy an example with Django](https://vercel.com/new/git/external?repository-url=https://github.com/vercel/examples/tree/main/python/django)

### Asynchronous Server Gateway Interface

The Asynchronous Server Gateway Interface (ASGI) is a calling convention for web servers to forward requests to asynchronous web applications written in Python. You can use ASGI with frameworks such as [Sanic](https://sanic.readthedocs.io).

Instead of defining a `handler`, define an `app` variable in your Python file.

For example, define a `api/index.py` file as follows:

```python filename="api/index.py"
from sanic import Sanic
from sanic.response import json
app = Sanic()


@app.route('/')
@app.route('/<path:path>')
async def index(request, path=""):
    return json({'hello': path})
```

*An example api/index.py file, using Sanic for a ASGI
application.*

Inside `requirements.txt` define:

```py filename="requirements.txt"
sanic==19.6.0
```

*An example requirements.txt file, listing
sanic as a dependency.*


---

[View full sitemap](/docs/sitemap)
