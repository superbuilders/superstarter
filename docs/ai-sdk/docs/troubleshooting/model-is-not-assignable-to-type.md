
# Model is not assignable to type "LanguageModelV1"

## Issue

I have updated the AI SDK and now I get the following error: `Type 'SomeModel' is not assignable to type 'LanguageModelV1'.`

<Note>Similar errors can occur with `EmbeddingModelV3` as well.</Note>

## Background

Sometimes new features are being added to the model specification.
This can cause incompatibilities with older provider versions.

## Solution

Update your provider packages and the AI SDK to the latest version.


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
