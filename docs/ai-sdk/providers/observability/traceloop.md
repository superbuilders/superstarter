
# Traceloop

[Traceloop](https://www.traceloop.com/) is a development platform for building reliable AI applications.
After integrating with the AI SDK, you can use Traceloop to trace, monitor, and experiment with LLM providers, prompts and flows.

## Setup

Traceloop supports [AI SDK telemetry data](/docs/ai-sdk-core/telemetry) through [OpenTelemetry](https://opentelemetry.io/docs/).
You'll need to sign up at https://app.traceloop.com and get an API Key.

### Next.js

To use the AI SDK to send telemetry data to Traceloop, set these environment variables in your Next.js app's `.env` file:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://api.traceloop.com
OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer <Your API Key>"
```

You can then use the `experimental_telemetry` option to enable telemetry on supported AI SDK function calls:

```typescript highlight="7-13"
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o-mini'),
  prompt: 'What is 2 + 2?',
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      query: 'weather',
      location: 'San Francisco',
    },
  },
});
```

## Resources

- [Traceloop demo chatbot](https://www.traceloop.com/docs/demo)
- [Traceloop docs](https://www.traceloop.com/docs)


## Navigation

- [Arize AX](/providers/observability/arize-ax)
- [Axiom](/providers/observability/axiom)
- [Braintrust](/providers/observability/braintrust)
- [Helicone](/providers/observability/helicone)
- [Laminar](/providers/observability/laminar)
- [Langfuse](/providers/observability/langfuse)
- [LangSmith](/providers/observability/langsmith)
- [LangWatch](/providers/observability/langwatch)
- [Maxim](/providers/observability/maxim)
- [MLflow](/providers/observability/mlflow)
- [Patronus](/providers/observability/patronus)
- [Scorecard](/providers/observability/scorecard)
- [SigNoz](/providers/observability/signoz)
- [Traceloop](/providers/observability/traceloop)
- [Weave](/providers/observability/weave)


[Full Sitemap](/sitemap.md)
