
# Unsupported model version error

## Issue

When migrating to AI SDK 5, you might encounter an error stating that your model uses an unsupported version:

```
AI_UnsupportedModelVersionError: Unsupported model version v1 for provider "ollama.chat" and model "gamma3:4b".
AI SDK 5 only supports models that implement specification version "v2".
```

This error occurs because the version of the provider package you're using implements the older (v1) model specification.

## Background

AI SDK 5 requires all provider packages to implement specification version "v2". When you upgrade to AI SDK 5 but don't update your provider packages to compatible versions, they continue using the older "v1" specification, causing this error.

## Solution

### Update provider packages to AI SDK 5 compatible versions

Update all your `@ai-sdk/*` provider packages to compatible version `2.0.0` or later. These versions implement the v2 specification required by AI SDK 5.

```bash
pnpm install ai@latest @ai-sdk/openai@latest @ai-sdk/anthropic@latest
```

For AI SDK 5 compatibility, you need:

- `ai` package: `5.0.0` or later
- `@ai-sdk/*` packages: `2.0.0` or later (for example, `@ai-sdk/openai`, `@ai-sdk/anthropic`, `@ai-sdk/google`)
- `@ai-sdk/provider` package: `2.0.0` or later
- `zod` package: `4.1.8` or later

### Check provider compatibility

If you're using a third-party or custom provider, verify that it has been updated to support AI SDK 5. Not all providers may have v2-compatible versions available yet.

To check if a provider supports AI SDK 5:

1. Check the provider's package.json for `@ai-sdk/provider` peer dependency version `2.0.0` or later
2. Review the provider's changelog or migration guide
3. Check the provider's repository for AI SDK 5 support

For more information on migrating to AI SDK 5, see the [AI SDK 5.0 migration guide](/docs/migration-guides/migration-guide-5-0).


## Navigation

- [Azure OpenAI Slow to Stream](/docs/troubleshooting/azure-stream-slow)
- [Server Actions in Client Components](/docs/troubleshooting/server-actions-in-client-components)
- [useChat/useCompletion stream output contains 0:... instead of text](/docs/troubleshooting/strange-stream-output)
- [Streamable UI Errors](/docs/troubleshooting/streamable-ui-errors)
- [Tool Invocation Missing Result Error](/docs/troubleshooting/tool-invocation-missing-result)
- [Streaming Not Working When Deployed](/docs/troubleshooting/streaming-not-working-when-deployed)
- [Streaming Not Working When Proxied](/docs/troubleshooting/streaming-not-working-when-proxied)
- [Getting Timeouts When Deploying on Vercel](/docs/troubleshooting/timeout-on-vercel)
- [Unclosed Streams](/docs/troubleshooting/unclosed-streams)
- [useChat Failed to Parse Stream](/docs/troubleshooting/use-chat-failed-to-parse-stream)
- [Server Action Plain Objects Error](/docs/troubleshooting/client-stream-error)
- [useChat No Response](/docs/troubleshooting/use-chat-tools-no-response)
- [Custom headers, body, and credentials not working with useChat](/docs/troubleshooting/use-chat-custom-request-options)
- [TypeScript performance issues with Zod and AI SDK 5](/docs/troubleshooting/typescript-performance-zod)
- [useChat "An error occurred"](/docs/troubleshooting/use-chat-an-error-occurred)
- [Repeated assistant messages in useChat](/docs/troubleshooting/repeated-assistant-messages)
- [onFinish not called when stream is aborted](/docs/troubleshooting/stream-abort-handling)
- [Tool calling with generateObject and streamObject](/docs/troubleshooting/tool-calling-with-structured-outputs)
- [Abort breaks resumable streams](/docs/troubleshooting/abort-breaks-resumable-streams)
- [streamText fails silently](/docs/troubleshooting/stream-text-not-working)
- [Streaming Status Shows But No Text Appears](/docs/troubleshooting/streaming-status-delay)
- [Stale body values with useChat](/docs/troubleshooting/use-chat-stale-body-data)
- [Type Error with onToolCall](/docs/troubleshooting/ontoolcall-type-narrowing)
- [Unsupported model version error](/docs/troubleshooting/unsupported-model-version)
- [Object generation failed with OpenAI](/docs/troubleshooting/no-object-generated-content-filter)
- [Missing Tool Results Error](/docs/troubleshooting/missing-tool-results-error)
- [Model is not assignable to type "LanguageModelV1"](/docs/troubleshooting/model-is-not-assignable-to-type)
- [TypeScript error "Cannot find namespace 'JSX'"](/docs/troubleshooting/typescript-cannot-find-namespace-jsx)
- [React error "Maximum update depth exceeded"](/docs/troubleshooting/react-maximum-update-depth-exceeded)
- [Jest: cannot find module '@ai-sdk/rsc'](/docs/troubleshooting/jest-cannot-find-module-ai-rsc)
- [High memory usage when processing many images](/docs/troubleshooting/high-memory-usage-with-images)


[Full Sitemap](/sitemap.md)
