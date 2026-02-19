# Traces

The Inngest DevServer and Cloud offer three levels of tracing to give you visibility into your function executions, each designed for different observability needs:

1. **Built-in Traces** - A quick access to your function and steps timing, retries and logs
2. **AI Traces** - Metadata for [AI Inference steps](/docs-markdown/features/inngest-functions/steps-workflows/step-ai-orchestration), including: tokens count, model input and output
3. **Extended Traces** - OpenTelemetry tracing capturing HTTP requests and third party library traces

## Built-in Traces  &#x20;

Every Inngest function automatically includes built-in tracing without any configuration. These traces track the core execution of your functions:

- **Function execution timeline** - Start and end times for your function runs
- **Step execution** - Individual step timing and status
- **Event data** - The event that triggered the function
- **Logs** - Logger output and errors
- **Retry attempts** - Failed runs and retry history

### Viewing Built-in Traces

Built-in traces are available in the Inngest dashboard and [DevServer](/docs-markdown/dev-server) for every function run:

![Function runs list showing recent executions in the Inngest Dashboard](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-runs.png)

*Traces in the Inngest Dashboard*

Click on any function run to see detailed execution information:

![Function run details showing traces and logs](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-run-logs-timeline-1.png)

The timeline view shows your function's execution path with steps and logs:

![Function run timeline with integrated trace and log information](/assets/docs-markdown/platform/monitor/inspecting-function-runs/function-run-logs-timeline-2.png)

Built-in traces are perfect for:

- **Day-to-day monitoring** - Tracking function executions and debugging basic issues
- **Step-level visibility** - Understanding which steps succeed or fail
- **Quick debugging** - Viewing logs and execution order

## AI Traces &#x20;

[AI Inference steps](/docs-markdown/features/inngest-functions/steps-workflows/step-ai-orchestration) (*`step.ai.*` methods*) enables you to offload LLM requests to the Inngest Platform and capture AI metadata including prompts, responses, token usage, and model parameters.

### What's Included

Each AI Trace display detailed metadata, including:

- Model name and version
- Tokens used (input, output)
- A side-by-side view of the input prompt and output response

### What You'll See

### Get started

AI Traces are automatically enabled when using `step.ai.infer()` from the TypeScript or Python SDK.

[Get started with AI Inference steps]("/docs-markdown/features/inngest-functions/steps-workflows/step-ai-orchestration")

## Extended Traces&#x20;

Extended Traces bring OpenTelemetry-powered distributed tracing to your Inngest functions, providing the most comprehensive visibility into every aspect of your function execution—from individual steps and external API calls to database queries and third-party services.

### What's Included

When you enable Extended Traces, Inngest automatically instruments your functions to capture detailed trace data about:

- **External service calls** - Track API requests, database queries, and third-party integrations
- **Performance bottlenecks** - Identify slow operations and optimize your functions
- **Distributed context** - Full distributed tracing across your entire stack

Extended Traces integrate seamlessly with your existing observability stack through [OpenTelemetry](https://opentelemetry.io/), the industry standard for distributed tracing.

### What You'll See

Every function run includes comprehensive trace spans showing the complete execution timeline.
Each span includes specific metadata from the operation (*`method`, `url` for HTTP requests, `driver`, `query` for SQL requests*):

> **Note:** Extended Traces automatically capture spans from popular libraries including HTTP clients, database drivers, and more. See the full list of automatic instrumentation.

### Get started

Extended Traces are currently available in the TypeScript as an opt-in beta.
Get started in just a few minutes by configuring the Extended Traces middleware.

[Get started with Extended Traces]("/docs-markdown/reference/typescript/extended-traces")