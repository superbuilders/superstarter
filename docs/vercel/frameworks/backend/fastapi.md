---
title: FastAPI on Vercel
product: vercel
url: /docs/frameworks/backend/fastapi
type: how-to
prerequisites:
  - /docs/frameworks/backend
  - /docs/frameworks
related:
  - /docs/cli/init
  - /docs/cli/deploy
  - /docs/cdn
  - /docs/headers
  - /docs/functions
summary: Deploy FastAPI applications to Vercel with zero configuration. Learn about the Python runtime, ASGI, static assets, and Vercel Functions.
---

# FastAPI on Vercel

FastAPI is a modern, high-performance, web framework for building APIs with Python based on standard Python type hints. You can deploy a FastAPI app to Vercel with zero configuration.

## Get started with FastAPI on Vercel

You can quickly deploy a FastAPI application to Vercel by creating a FastAPI app or using an existing one:

### Get started with Vercel CLI

Get started by initializing a new FastAPI project using [Vercel CLI init command](/docs/cli/init):

```bash filename="terminal"
vc init fastapi
```

This will clone the [FastAPI example repository](https://github.com/vercel/vercel/tree/main/examples/fastapi) in a directory called `fastapi`.

## Exporting the FastAPI application

To run a FastAPI application on Vercel, define an `app` instance that initializes `FastAPI` at any of the following entrypoints:

- `app.py`
- `index.py`
- `server.py`
- `src/app.py`
- `src/index.py`
- `src/server.py`
- `app/app.py`
- `app/index.py`
- `app/server.py`

For example:

```py filename="src/index.py"
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"Python": "on Vercel"}
```

You can also define an application script in `pyproject.toml` to point to your FastAPI app in a different module:

```toml filename="pyproject.toml"
[project.scripts]
app = "backend.server:app"
```

This script tells Vercel to look for a `FastAPI` instance named `app` in `./backend/server.py`.

### Build command

The `build` property in `[tool.vercel.scripts]` defines the Build Command for FastAPI deployments. It runs after dependencies are installed and before your application is deployed.

```toml filename="pyproject.toml"
[tool.vercel.scripts]
build = "python build.py"
```

For example:

```py filename="build.py"
def main():
    print("Running build command...")
    with open("build.txt", "w") as f:
        f.write("BUILD_COMMAND")

if __name__ == "__main__":
    main()
```

> **💡 Note:** If you define a [Build Command](https://vercel.com/docs/project-configuration#buildcommand) in `vercel.json` or in the Project Settings dashboard, it takes precedence over a build script in `pyproject.toml`.

### Local development

Use `vercel dev` to run your application locally.

```bash filename="terminal"
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
vercel dev
```

> **💡 Note:** Minimum CLI version required: 48.1.8

### Deploying the application

To deploy, [connect your Git repository](/new) or [use Vercel CLI](/docs/cli/deploy):

```bash filename="terminal"
vc deploy
```

> **💡 Note:** Minimum CLI version required: 48.1.8

## Serving static assets

To serve static assets, place them in the `public/**` directory. They will be served as a part of our [CDN](/docs/cdn) using default [headers](/docs/headers) unless otherwise specified in `vercel.json`.

```py filename="app.py" highlight={6}
from fastapi import FastAPI
from fastapi.responses import RedirectResponse

app = FastAPI()

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    # /vercel.svg is automatically served when included in the public/** directory.
    return RedirectResponse("/vercel.svg", status_code=307)
```

> **💡 Note:** `app.mount("/public", ...)` is not needed and should not be used.

## Startup and shutdown

You can use [FastAPI lifespan events](https://fastapi.tiangolo.com/advanced/events/) to manage startup and shutdown logic, such as initializing and closing database connections.

```python filename="main.py"
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    print("Starting up...")
    await startup_tasks()
    yield
    # Shutdown logic
    await cleanup_tasks()

app = FastAPI(lifespan=lifespan)
```

> **💡 Note:** Cleanup logic during shutdown is limited to a maximum of **500ms** after receiving the [SIGTERM signal](https://vercel.com/docs/functions/functions-api-reference#sigterm-signal). Logs printed during the shutdown step will not appear in the Vercel dashboard.

## Vercel Functions

When you deploy a FastAPI app to Vercel, the application becomes a single [Vercel Function](/docs/functions) and uses [Fluid compute](/docs/fluid-compute) by default. This means your FastAPI app will automatically scale up and down based on traffic.

## Limitations

All [Vercel Functions limitations](/docs/functions/limitations) apply to FastAPI applications, including:

- **Application size**: The FastAPI application becomes a single bundle, which must fit within the 250MB limit of Vercel Functions. Our bundling process removes `__pycache__` and `.pyc` files from the deployment's bundle to reduce size, but does not perform application bundling.

## More resources

Learn more about deploying FastAPI projects on Vercel with the following resources:

- [FastAPI official documentation](https://fastapi.tiangolo.com/)
- [Vercel Functions documentation](/docs/functions)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)


---

[View full sitemap](/docs/sitemap)
