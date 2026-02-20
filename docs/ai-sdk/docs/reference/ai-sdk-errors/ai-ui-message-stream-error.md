
# AI_UIMessageStreamError

This error occurs when a UI message stream contains invalid or out-of-sequence chunks.

Common causes:

- Receiving a `text-delta` chunk without a preceding `text-start` chunk
- Receiving a `text-end` chunk without a preceding `text-start` chunk
- Receiving a `reasoning-delta` chunk without a preceding `reasoning-start` chunk
- Receiving a `reasoning-end` chunk without a preceding `reasoning-start` chunk
- Receiving a `tool-input-delta` chunk without a preceding `tool-input-start` chunk
- Attempting to access a tool invocation that doesn't exist

This error often surfaces when an upstream request fails **before any tokens are streamed** and a custom transport tries to write an inline error message to the UI stream without the proper start chunk.

## Properties

- `chunkType`: The type of chunk that caused the error (e.g., `text-delta`, `reasoning-end`, `tool-input-delta`)
- `chunkId`: The ID associated with the failing chunk (part ID or toolCallId)
- `message`: The error message with details about what went wrong

## Checking for this Error

You can check if an error is an instance of `AI_UIMessageStreamError` using:

```typescript
import { UIMessageStreamError } from 'ai';

if (UIMessageStreamError.isInstance(error)) {
  console.log('Chunk type:', error.chunkType);
  console.log('Chunk ID:', error.chunkId);
  // Handle the error
}
```

## Common Solutions

1. **Ensure proper chunk ordering**: Always send a `*-start` chunk before any `*-delta` or `*-end` chunks for the same ID:

   ```typescript
   // Correct order
   writer.write({ type: 'text-start', id: 'my-text' });
   writer.write({ type: 'text-delta', id: 'my-text', delta: 'Hello' });
   writer.write({ type: 'text-end', id: 'my-text' });
   ```

2. **Verify IDs match**: Ensure the `id` used in `*-delta` and `*-end` chunks matches the `id` used in the corresponding `*-start` chunk.

3. **Handle error paths correctly**: When writing error messages in custom transports, ensure you emit the full start/delta/end sequence:

   ```typescript
   // When handling errors in custom transports
   writer.write({ type: 'text-start', id: errorId });
   writer.write({
     type: 'text-delta',
     id: errorId,
     delta: 'Request failed...',
   });
   writer.write({ type: 'text-end', id: errorId });
   ```

4. **Check stream producer logic**: Review your streaming implementation to ensure chunks are sent in the correct order, especially when dealing with concurrent operations or merged streams.


## Navigation

- [AI_APICallError](/docs/reference/ai-sdk-errors/ai-api-call-error)
- [AI_DownloadError](/docs/reference/ai-sdk-errors/ai-download-error)
- [AI_EmptyResponseBodyError](/docs/reference/ai-sdk-errors/ai-empty-response-body-error)
- [AI_InvalidArgumentError](/docs/reference/ai-sdk-errors/ai-invalid-argument-error)
- [AI_InvalidDataContentError](/docs/reference/ai-sdk-errors/ai-invalid-data-content-error)
- [AI_InvalidMessageRoleError](/docs/reference/ai-sdk-errors/ai-invalid-message-role-error)
- [AI_InvalidPromptError](/docs/reference/ai-sdk-errors/ai-invalid-prompt-error)
- [AI_InvalidResponseDataError](/docs/reference/ai-sdk-errors/ai-invalid-response-data-error)
- [AI_InvalidToolApprovalError](/docs/reference/ai-sdk-errors/ai-invalid-tool-approval-error)
- [AI_InvalidToolInputError](/docs/reference/ai-sdk-errors/ai-invalid-tool-input-error)
- [AI_JSONParseError](/docs/reference/ai-sdk-errors/ai-json-parse-error)
- [AI_LoadAPIKeyError](/docs/reference/ai-sdk-errors/ai-load-api-key-error)
- [AI_LoadSettingError](/docs/reference/ai-sdk-errors/ai-load-setting-error)
- [AI_MessageConversionError](/docs/reference/ai-sdk-errors/ai-message-conversion-error)
- [AI_NoContentGeneratedError](/docs/reference/ai-sdk-errors/ai-no-content-generated-error)
- [AI_NoImageGeneratedError](/docs/reference/ai-sdk-errors/ai-no-image-generated-error)
- [AI_NoObjectGeneratedError](/docs/reference/ai-sdk-errors/ai-no-object-generated-error)
- [AI_NoOutputGeneratedError](/docs/reference/ai-sdk-errors/ai-no-output-generated-error)
- [AI_NoSpeechGeneratedError](/docs/reference/ai-sdk-errors/ai-no-speech-generated-error)
- [AI_NoSuchModelError](/docs/reference/ai-sdk-errors/ai-no-such-model-error)
- [AI_NoSuchProviderError](/docs/reference/ai-sdk-errors/ai-no-such-provider-error)
- [AI_NoSuchToolError](/docs/reference/ai-sdk-errors/ai-no-such-tool-error)
- [AI_NoTranscriptGeneratedError](/docs/reference/ai-sdk-errors/ai-no-transcript-generated-error)
- [AI_NoVideoGeneratedError](/docs/reference/ai-sdk-errors/ai-no-video-generated-error)
- [AI_RetryError](/docs/reference/ai-sdk-errors/ai-retry-error)
- [AI_TooManyEmbeddingValuesForCallError](/docs/reference/ai-sdk-errors/ai-too-many-embedding-values-for-call-error)
- [AI_ToolCallNotFoundForApprovalError](/docs/reference/ai-sdk-errors/ai-tool-call-not-found-for-approval-error)
- [ToolCallRepairError](/docs/reference/ai-sdk-errors/ai-tool-call-repair-error)
- [AI_TypeValidationError](/docs/reference/ai-sdk-errors/ai-type-validation-error)
- [AI_UIMessageStreamError](/docs/reference/ai-sdk-errors/ai-ui-message-stream-error)
- [AI_UnsupportedFunctionalityError](/docs/reference/ai-sdk-errors/ai-unsupported-functionality-error)


[Full Sitemap](/sitemap.md)
