# Serve

The `serve()` API handler is used to serve your application's [functions](/docs-markdown/reference/functions/create) via HTTP. This handler enables Inngest to remotely and securely read your functions' configuration and invoke your function code. This enables you to host your function code on any platform.

```ts {{ title: "v3" }}
import { serve } from "inngest/next"; // or your preferred framework
import { inngest } from "./client";
import {
  importProductImages,
  sendSignupEmail,
  summarizeText,
} from "./functions";

serve({
  client: inngest,
  functions: [sendSignupEmail, summarizeText, importProductImages],
});
```

```ts {{ title: "v2" }}
import { serve } from "inngest/next"; // or your preferred framework
import { inngest } from "./client";
import {
  importProductImages,
  sendSignupEmail,
  summarizeText,
} from "./functions";

serve(inngest, [sendSignupEmail, summarizeText, importProductImages]);
```

`serve` handlers are imported from convenient framework-specific packages like `"inngest/next"`, `"inngest/express"`, or `"inngest/lambda"`. [Click here for a full list of officially supported frameworks](/docs-markdown/learn/serving-inngest-functions). For any framework that is not support, you can [create a custom handler](#custom-frameworks).

***

## `serve(options)`

- `client` (Inngest client): An Inngest client (reference).

* `functions` (InngestFunctions\[]): An array of Inngest functions defined using inngest.createFunction() (reference).

- `signingKey` (string): The Inngest Signing Key for your selected environment. We recommend setting the INNGEST\_SIGNING\_KEY environment variable instead of passing the signingKey option. You can find this in the Inngest dashboard.

* `serveHost` (string): The domain host of your application, including protocol, e.g. https\://myapp.com. The SDK attempts to infer this via HTTP headers at runtime, but this may be required when using platforms like AWS Lambda or when using a reverse proxy. See also INNGEST\_SERVE\_HOST.

- `servePath` (string): The path where your serve handler is hosted. The SDK attempts to infer this via HTTP headers at runtime. We recommend /api/inngest. See also INNGEST\_SERVE\_PATH.

* `streaming` (\`"allow" | "force" | false\`): Enables streaming responses back to Inngest which can enable maximum serverless function timeouts. See reference for more information on the configuration.  See also INNGEST\_SERVE\_HOST.

- `logLevel` (\`"fatal" | "error" | "warn" | "info" | "debug" | "silent"\`): The minimum level to log from the Inngest serve endpoint. Defaults to "info". See also INNGEST\_LOG\_LEVEL.

* `baseUrl` (string): The URL used to communicate with Inngest. This can be useful in testing environments when using the Inngest Dev Server. Defaults to: "https\://api.inngest.com/". See also INNGEST\_BASE\_URL.

- `fetch` (Fetch API compatible interface): Override the default fetch implementation. Defaults to the runtime's native Fetch API.

* `id` (string): The ID to use to represent this application instead of the client's ID. Useful for creating many Inngest endpoints in a single application.

> **Callout:** We always recommend setting the INNGEST\_SIGNING\_KEY over using the signingKey option. As with any secret, it's not a good practice to hard-code the signing key in your codebase.

## How the `serve` API handler works

The API works by exposing a single endpoint at `/api/inngest` which handles different actions utilizing HTTP request methods:

- `GET`: Return function metadata and render a debug page in in **development only**. See [`landingPage`](#landingPage).
- `POST`: Invoke functions with the request body as incoming function state.
- `PUT`: Trigger the SDK to register all functions with Inngest using the signing key.