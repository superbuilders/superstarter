---
title: Flask on Vercel
product: vercel
url: /docs/frameworks/backend/flask
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
summary: Deploy Flask applications to Vercel with zero configuration. Learn about the Python runtime, WSGI, static assets, and Vercel Functions.
---

# Flask on Vercel

Flask is a lightweight WSGI web application framework for Python. It's designed with simplicity and flexibility in mind, making it easy to get started while remaining powerful for building web applications. You can deploy a Flask app to Vercel with zero configuration.

## Get started with Flask on Vercel

You can quickly deploy a Flask application to Vercel by creating a Flask app or using an existing one:

### Get started with Vercel CLI

Get started by initializing a new Flask project using [Vercel CLI init command](/docs/cli/init):

```bash filename="terminal"
vc init flask
```

This will clone the [Flask example repository](https://github.com/vercel/vercel/tree/main/examples/flask) in a directory called `flask`.

## Exporting the Flask application

To run a Flask application on Vercel, define an `app` instance that initializes `Flask` at any of the following entrypoints:

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
from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello_world():
    return {"message": "Hello, World!"}
```

You can also define an application script in `pyproject.toml` to point to your Flask app in a different module:

```toml filename="pyproject.toml"
[project.scripts]
app = "backend.server:app"
```

This script tells Vercel to look for a `Flask` instance named `app` in `./backend/server.py`.

### Build command

The `build` property in `[tool.vercel.scripts]` defines the Build Command for Flask deployments. It runs after dependencies are installed and before your application is deployed.

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

> **💡 Note:** Minimum CLI version required: 48.2.10

### Deploying the application

To deploy, [connect your Git repository](/new) or [use Vercel CLI](/docs/cli/deploy):

```bash filename="terminal"
vc deploy
```

> **💡 Note:** Minimum CLI version required: 48.2.10

## Serving static assets

To serve static assets, place them in the `public/**` directory. They will be served as a part of our [CDN](/docs/cdn) using default [headers](/docs/headers) unless otherwise specified in `vercel.json`.

```py filename="app.py" highlight={5-7}
from flask import Flask, redirect

app = Flask(__name__)

@app.route("/favicon.ico")
def favicon():
    # /vercel.svg is automatically served when included in the public/** directory.
    return redirect("/vercel.svg", code=307)
```

> **💡 Note:** Flask's `app.static_folder` should not be used for static files on Vercel. Use
> the `public/**` directory instead.

## Vercel Functions

When you deploy a Flask app to Vercel, the application becomes a single [Vercel Function](/docs/functions) and uses [Fluid compute](/docs/fluid-compute) by default. This means your Flask app will automatically scale up and down based on traffic.

## Limitations

All [Vercel Functions limitations](/docs/functions/limitations) apply to Flask applications, including:

- **Application size**: The Flask application becomes a single bundle, which must fit within the 250MB limit of Vercel Functions. Our bundling process removes `__pycache__` and `.pyc` files from the deployment's bundle to reduce size, but does not perform application bundling.

## More resources

Learn more about deploying Flask projects on Vercel with the following resources:

- [Flask official documentation](https://flask.palletsprojects.com/)
- [Vercel Functions documentation](/docs/functions)
- [Backend templates on Vercel](https://vercel.com/templates?type=backend)


---

[View full sitemap](/docs/sitemap)
