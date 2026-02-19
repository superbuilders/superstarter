# Encryption Middleware

Encryption middleware provides end-to-end encryption for events, step output, and function output. **Only encrypted data is sent to Inngest servers**: encryption and decryption happen within your infrastructure.

> **Callout:** Support for Middleware in the Go SDK in planned.

## Installation

The `EncryptionMiddleware` is available as part of the `inngest_encryption` package:

```py
import inngest
from inngest_encryption import EncryptionMiddleware

inngest_client = inngest.Inngest(
    app_id="my-app",
    middleware=[EncryptionMiddleware.factory("my-secret-key")],
)
```

The following data is encrypted by default:

- The `encrypted` field in `event.data`.
- `step.run` return values.
- Function return values.

## Installation

Install the [`@inngest/middleware-encryption` package](https://www.npmjs.com/package/@inngest/middleware-encryption) ([GitHub](https://github.com/inngest/inngest-js/tree/main/packages/middleware-encryption#readme)) and configure it as follows:

```ts
import { encryptionMiddleware } from "@inngest/middleware-encryption";

// Initialize the middleware
const mw = encryptionMiddleware({
  // your encryption key string should not be hard coded
  key: process.env.MY_ENCRYPTION_KEY,
});

// Use the middleware with Inngest
const inngest = new Inngest({
  id: "my-app",
  middleware: [mw],
});
```

By default, the following will be encrypted:

- All step data
- All function output
- Event data placed inside `data.encrypted`

> **Info:** If using encryption middleware in combination with checkpointing, upgrade to 3.51.0 or later.

## Changing the encrypted `event.data` field

By default, `event.data.encrypted` is encrypted. All other fields are sent in plaintext. To encrypt a different field, set the `event_encryption_field` parameter.

## Changing the encrypted `event.data` field

Only select pieces of event data are encrypted. By default, only the data.encrypted field.

This can be customized using the `eventEncryptionField: string` setting.

## Decrypt only mode

To disable encryption but continue decrypting, set `decrypt_only=True`. This is useful when you want to migrate away from encryption but still need to process older events.

## Decrypt only mode

To disable encryption but continue decrypting, set `decryptOnly: true`. This is useful when you want to migrate away from encryption but still need to process older events.

## Fallback decryption keys

To attempt decryption with multiple keys, set the `fallback_decryption_keys` parameter. This is useful when rotating keys, since older events may have been encrypted with a different key.

## Fallback decryption keys

To attempt decryption with multiple keys, set the `fallbackDecryptionKeys` parameter. This is useful when rotating keys, since older events may have been encrypted with a different key:

```ts
// start out with the current key
encryptionMiddleware({
  key: process.env.MY_ENCRYPTION_KEY,
});

// deploy all services with the new key as a decryption fallback
encryptionMiddleware({
  key: process.env.MY_ENCRYPTION_KEY,
  fallbackDecryptionKeys: ["new"],
});

// deploy all services using the new key for encryption
encryptionMiddleware({
  key: process.env.MY_ENCRYPTION_KEY_V2,
  fallbackDecryptionKeys: ["current"],
});

// once you are sure all data using the "current" key has passed, phase it out
encryptionMiddleware({
  key: process.env.MY_ENCRYPTION_KEY_V2,
});
```

## Cross-language support

This middleware is compatible with our encryption middleware in our TypeScript SDK. Encrypted events can be sent from Python and decrypted in TypeScript, and vice versa.