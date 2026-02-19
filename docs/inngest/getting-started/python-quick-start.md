# Python Quick Start

This guide will teach you how to add Inngest to a FastAPI app and run an Inngest function.

> **Callout:** 💡 If you prefer to explore code instead, here are example apps in the frameworks currently supported by Inngest:  FastAPI, Django,  Flask, DigitalOcean Functions, and Tornado.Is your favorite framework missing here? Please open an issue on GitHub!

***

## Create an app

> **Callout:** ⚠️ Use Python 3.10 or higher.

Create and source virtual environment:

```sh
python -m venv .venv && source .venv/bin/activate
```

Install dependencies:

```sh
pip install fastapi inngest uvicorn
```

Create a FastAPI app file:

```py {{ filename: "main.py" }}
from fastapi import FastAPI

app = FastAPI()
```

***

## Add Inngest

Let's add Inngest to the app! We'll do a few things

1. Create an **Inngest client**, which is used to send events to an Inngest server.
2. Create an **Inngest function**, which receives events.
3. Serve the **Inngest endpoint** on the FastAPI app.

```py {{ filename: "main.py" }}
import logging
from fastapi import FastAPI
import inngest
import inngest.fast_api

# Create an Inngest client
inngest_client = inngest.Inngest(
    app_id="fast_api_example",
    logger=logging.getLogger("uvicorn"),
)

# Create an Inngest function
@inngest_client.create_function(
    fn_id="my_function",
    # Event that triggers this function
    trigger=inngest.TriggerEvent(event="app/my_function"),
)
async def my_function(ctx: inngest.Context) -> str:
    ctx.logger.info(ctx.event)
    return "done"

app = FastAPI()

# Serve the Inngest endpoint
inngest.fast_api.serve(app, inngest_client, [my_function])
```

Start your app:

```sh
(INNGEST_DEV=1 uvicorn main:app --reload)
```

> **Callout:** 💡 The INNGEST\_DEV environment variable tells the Inngest SDK to run in "dev mode". By default, the SDK will start in production mode. We made production mode opt-out for security reasons.Always set INNGEST\_DEV when you want to sync with the Dev Server. Never set INNGEST\_DEV when you want to sync with Inngest Cloud.

***

## Run Inngest Dev Server

Inngest functions are run using an **Inngest server**. For this guide we'll use the [Dev Server](https://github.com/inngest/inngest), which is a single-binary version of our [Cloud](https://app.inngest.com) offering. The Dev Server is great for local development and testing, while Cloud is for deployed apps (e.g. production).

Start the Dev Server:

```sh {{ title: "npx (npm)" }}
npx --ignore-scripts=false inngest-cli@latest dev -u http://127.0.0.1:8000/api/inngest --no-discovery
```

```sh {{ title: "Docker" }}
docker run -p 8288:8288 inngest/inngest \
  inngest dev -u http://host.docker.internal:8000/api/inngest --no-discovery
```

After a few seconds, your app and function should now appear in the Dev Server UI:

> **Callout:** 💡 You can sync multiple apps and multiple functions within each app.

***

## Run your function

Click the function's "Trigger" button and a run should appear in the Dev Server stream tab: