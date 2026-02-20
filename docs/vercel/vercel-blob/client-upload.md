---
title: Client Uploads with Vercel Blob
product: vercel
url: /docs/vercel-blob/client-upload
type: tutorial
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/environment-variables/system-environment-variables
  - /docs/vercel-blob/using-blob-sdk
  - /docs/storage/vercel-blob/using-blob-sdk
summary: Learn how to upload files larger than 4.5 MB directly from the browser to Vercel Blob
---

# Client Uploads with Vercel Blob

> **🔒 Permissions Required**: Vercel Blob

In this guide, you'll learn how to do the following:

- Use the Vercel dashboard to create a Blob store connected to a project
- Upload a file using the Blob SDK from a browser

## Prerequisites

Vercel Blob works with any frontend framework. First, install the package:

<CodeBlock>
  <Code tab="pnpm">
    ```bash
    pnpm i @vercel/blob
    ```
  </Code>
  <Code tab="yarn">
    ```bash
    yarn i @vercel/blob
    ```
  </Code>
  <Code tab="npm">
    ```bash
    npm i @vercel/blob
    ```
  </Code>
  <Code tab="bun">
    ```bash
    bun i @vercel/blob
    ```
  </Code>
</CodeBlock>

- ### Create a Blob store
  1. Go to your project's [**Storage** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fstores\&title=Go+to+Storage)
  2. Select **Create Database**, then choose **Blob**
  3. Select **Continue**, then set the access to **Private** or **Public**
  4. Use the name "Images" and select **Create a new Blob store**
  5. Select the environments where you would like the read-write token to be included. You can also update the prefix of the Environment Variable in Advanced Options
  Once created, you are taken to the Vercel Blob store page.

- ### Prepare your local project
  Since you created the Blob store in a project, we automatically created and added the following Environment Variable to the project for you.
  - `BLOB_READ_WRITE_TOKEN`
  To use this Environment Variable locally, we recommend pulling it with the Vercel CLI:
  ```bash
  vercel env pull
  ```

When you need to upload files larger than 4.5 MB, you can use client uploads. In this case, the file is sent directly from the client (a browser in this example) to Vercel Blob. This transfer is done securely as to not expose your Vercel Blob store to anonymous uploads. The security mechanism is based on a token exchange between your server and Vercel Blob.

- ### Create a client upload page
  This page allows you to upload files to Vercel Blob. The files will go directly from the browser to Vercel Blob without going through your server.

  Behind the scenes, the upload is done securely by exchanging a token with your server before uploading the file.
  ```tsx filename="src/app/avatar/upload/page.tsx" framework=nextjs-app
  'use client';

  import { type PutBlobResult } from '@vercel/blob';
  import { upload } from '@vercel/blob/client';
  import { useState, useRef } from 'react';

  export default function AvatarUploadPage() {
    const inputFileRef = useRef<HTMLInputElement>(null);
    const [blob, setBlob] = useState<PutBlobResult | null>(null);
    return (
      <>
        <h1>Upload Your Avatar</h1>

        <form
          onSubmit={async (event) => {
            event.preventDefault();

            if (!inputFileRef.current?.files) {
              throw new Error('No file selected');
            }

            const file = inputFileRef.current.files[0];

            const newBlob = await upload(file.name, file, {
              access: 'private' /* or 'public' */,
              handleUploadUrl: '/api/avatar/upload',
            });

            setBlob(newBlob);
          }}
        >
          <input name="file" ref={inputFileRef} type="file" required />
          <button type="submit">Upload</button>
        </form>
        {blob && (
          <div>
            Blob url: <a href={blob.url}>{blob.url}</a>
          </div>
        )}
      </>
    );
  }
  ```
  ```jsx filename="app/avatar/upload/page.jsx" framework=nextjs-app
  'use client';

  import { upload } from '@vercel/blob/client';
  import { useState, useRef } from 'react';

  export default function AvatarUploadPage() {
    const inputFileRef = useRef(null);
    const [blob, setBlob] = useState(null);
    return (
      <>
        <h1>Upload Your Avatar</h1>

        <form
          onSubmit={async (event) => {
            event.preventDefault();

            const file = inputFileRef.current.files[0];

            const newBlob = await upload(file.name, file, {
              access: 'private' /* or 'public' */,
              handleUploadUrl: '/api/avatar/upload',
            });

            setBlob(newBlob);
          }}
        >
          <input
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            required
          />
          <button type="submit">Upload</button>
        </form>
        {blob && (
          <div>
            Blob url: <a href={blob.url}>{blob.url}</a>
          </div>
        )}
      </>
    );
  }
  ```
  ```tsx filename="pages/avatar/upload.tsx" framework=nextjs
  import { type PutBlobResult } from '@vercel/blob';
  import { upload } from '@vercel/blob/client';
  import { useState, useRef } from 'react';

  export default function AvatarUploadPage() {
    const inputFileRef = useRef<HTMLInputElement>(null);
    const [blob, setBlob] = useState<PutBlobResult | null>(null);
    return (
      <>
        <h1>Upload Your Avatar</h1>

        <form
          onSubmit={async (event) => {
            event.preventDefault();

            if (!inputFileRef.current?.files) {
              throw new Error('No file selected');
            }

            const file = inputFileRef.current.files[0];

            const newBlob = await upload(file.name, file, {
              access: 'private' /* or 'public' */,
              handleUploadUrl: '/api/avatar/upload',
            });

            setBlob(newBlob);
          }}
        >
          <input
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            required
          />
          <button type="submit">Upload</button>
        </form>
        {blob && (
          <div>
            Blob url: <a href={blob.url}>{blob.url}</a>
          </div>
        )}
      </>
    );
  }
  ```
  ```jsx filename="pages/avatar/upload.jsx" framework=nextjs
  import { upload } from '@vercel/blob/client';
  import { useState, useRef } from 'react';

  export default function AvatarUploadPage() {
    const inputFileRef = useRef(null);
    const [blob, setBlob] = useState(null);
    return (
      <>
        <h1>Upload Your Avatar</h1>

        <form
          onSubmit={async (event) => {
            event.preventDefault();

            const file = inputFileRef.current.files[0];

            const newBlob = await upload(file.name, file, {
              access: 'private' /* or 'public' */,
              handleUploadUrl: '/api/avatar/upload',
            });

            setBlob(newBlob);
          }}
        >
          <input
            name="file"
            ref={inputFileRef}
            type="file"
            accept="image/jpeg, image/png, image/webp"
            required
          />
          <button type="submit">Upload</button>
        </form>
        {blob && (
          <div>
            Blob url: <a href={blob.url}>{blob.url}</a>
          </div>
        )}
      </>
    );
  }
  ```

- ### Create a client upload route
  The responsibility of this client upload route is to:
  1. Generate tokens for client uploads
  2. Listen for completed client uploads, so you can update your database with the URL of the uploaded file for example
  The `@vercel/blob` npm package exposes a helper to implement said responsibilities.
  ```ts filename="src/app/api/avatar/upload/route.ts" framework=nextjs-app
  import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
  import { NextResponse } from 'next/server';

  export async function POST(request: Request): Promise<NextResponse> {
    const body = (await request.json()) as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (
          pathname,
          /* clientPayload */
        ) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }, // The webhook will retry 5 times waiting for a 200
      );
    }
  }
  ```
  ```js filename="src/app/api/avatar/upload/route.js" framework=nextjs-app
  import { handleUpload } from '@vercel/blob/client';
  import { NextResponse } from 'next/server';

  export async function POST(request) {
    const body = await request.json();

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return NextResponse.json(jsonResponse);
    } catch (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }, // The webhook will retry 5 times waiting for a status 200
      );
    }
  }
  ```
  ```ts filename="pages/api/avatar/upload.ts" framework=nextjs
  import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
  import type { NextApiResponse, NextApiRequest } from 'next';

  export default async function handler(
    request: NextApiRequest,
    response: NextApiResponse,
  ) {
    const body = request.body as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (
          pathname,
          /* clientPayload */
        ) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return response.status(200).json(jsonResponse);
    } catch (error) {
      // The webhook will retry 5 times waiting for a 200
      return response.status(400).json({ error: (error as Error).message });
    }
  }
  ```
  ```js filename="pages/api/avatar/upload.js" framework=nextjs
  import { handleUpload } from '@vercel/blob/client';

  export default async function handler(request, response) {
    const body = await request.json();

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return response.status(200).json(jsonResponse);
    } catch (error) {
      // The webhook will retry 5 times waiting for a 200
      return response.status(400).json({ error: error.message });
    }
  }
  ```
  ```ts filename="api/avatar/upload.ts" framework=other
  import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

  export default async function handler(request: Request) {
    const body = (await request.json()) as HandleUploadBody;

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (
          pathname,
          /* clientPayload */
        ) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return Response.json(jsonResponse);
    } catch (error) {
      return Response.json(
        { error: (error as Error).message },
        { status: 400 }, // The webhook will retry 5 times waiting for a 200
      );
    }
  }
  ```
  ```js filename="api/avatar/upload.js" framework=other
  import { handleUpload } from '@vercel/blob/client';

  export default async function handler(request) {
    const body = await request.json();

    try {
      const jsonResponse = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname /*, clientPayload */) => {
          // Generate a client token for the browser to upload the file
          // Make sure to authenticate and authorize users before generating the token.
          // Otherwise, you're allowing anonymous uploads.

          return {
            allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
            addRandomSuffix: true,
            // callbackUrl: 'https://example.com/api/avatar/upload',
            // optional, `callbackUrl` is automatically computed when hosted on Vercel
            tokenPayload: JSON.stringify({
              // optional, sent to your server on upload completion
              // you could pass a user id from auth, or a value from clientPayload
            }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Called by Vercel API on client upload completion
          // Use tools like ngrok if you want this to work locally

          console.log('blob upload completed', blob, tokenPayload);

          try {
            // Run any logic after the file upload completed
            // const { userId } = JSON.parse(tokenPayload);
            // await db.update({ avatar: blob.url, userId });
          } catch (error) {
            throw new Error('Could not update user');
          }
        },
      });

      return Response.json(jsonResponse);
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }, // The webhook will retry 5 times waiting for a 200
      );
    }
  }
  ```

## Testing your page

- ### Run your application locally
  Run your application locally and visit `/avatar/upload` to upload the file to your store. The browser will display the unique URL created for the file.

- ### Review the Blob object metadata
  - Go to the Vercel Project where you created the store
  - Select the **Storage** tab and select your new store
  - Paste the blob object URL returned in the previous step in the **Blob URL** input box in the **Browser** section and select **Lookup**
  - The following blob object metadata will be displayed: file name, path, size, uploaded date, content type and HTTP headers
  - You also have the option to download and delete the file from this page

You have successfully uploaded an object to your Vercel Blob store and are able to review its metadata, download, and delete it from your Vercel Storage Dashboard.

### `onUploadCompleted` callback behavior

The `onUploadCompleted` callback is called by Vercel API when a client upload completes. For this to work, `@vercel/blob` computes the correct callback URL to call based on the environment variables of your project.

We use the following environment variables to compute the callback URL:

- `VERCEL_BRANCH_URL` in preview environments
- `VERCEL_URL` in preview environments where `VERCEL_BRANCH_URL` is not set
- `VERCEL_PROJECT_PRODUCTION_URL` in production environments

These variables are automatically set by Vercel through [System Environment Variables](/docs/environment-variables/system-environment-variables).
If you're not using System Environment Variables, use the `callbackUrl` option at the [`onBeforeGenerateToken`](/docs/vercel-blob/using-blob-sdk#onbeforegeneratetoken) step in `handleUpload`.

#### Local development

When running your application locally, the `onUploadCompleted` callback will not work as Vercel Blob cannot contact your localhost. Instead, we recommend you run your local application through a tunneling service like [ngrok](https://ngrok.com/), so you can experience the full Vercel Blob development flow locally.

When using ngrok in local development, you can configure the domain to call for onUploadCompleted by using the `VERCEL_BLOB_CALLBACK_URL` environment variable in your [`.env.local` file](https://nextjs.org/docs/pages/guides/environment-variables) when using Next.js:

```bash
VERCEL_BLOB_CALLBACK_URL=https://abc123.ngrok-free.app
```

## Next steps

- Learn how to [use the methods](/docs/storage/vercel-blob/using-blob-sdk) available with the `@vercel/blob` package


---

[View full sitemap](/docs/sitemap)
