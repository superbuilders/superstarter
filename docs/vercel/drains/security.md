---
title: Drains Security
product: vercel
url: /docs/drains/security
type: how-to
prerequisites:
  - /docs/drains
related:
  - /docs/headers/request-headers
  - /docs/drains/using-drains
  - /docs/drains
  - /docs/drains/reference/logs
summary: Learn how to secure your Drains endpoints with authentication and signature verification.
---

# Drains Security

All Drains support transport-level encryption using HTTPS protocol.

When your server starts receiving payloads, a third party could send data to your server if it knows the URL. Therefore, you should verify the request is coming from Vercel.

## Secure Drains

Vercel sends an `x-vercel-signature` header with each drain, which is a hash of the payload body created using your Drain signature secret. You can find or update this secret by clicking **Edit** in the Drains list.

To verify the request is coming from Vercel, you can generate the hash and compare it with the header value as shown below:

```js filename="server.js" framework=nextjs-app
import crypto from 'crypto';

export async function POST(request) {
  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await request.text();
  const rawBodyBuffer = Buffer.from(rawBody, 'utf-8');
  const bodySignature = sha1(rawBodyBuffer, signatureSecret);

  if (bodySignature !== request.headers.get('x-vercel-signature')) {
    return Response.json(
      {
        code: 'invalid_signature',
        error: "signature didn't match",
      },
      { status: 403 },
    );
  }

  console.log(rawBody);

  return Response.json({ success: true });
}

function sha1(data, secret) {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}
```

```ts filename="server.ts" framework=nextjs-app
import crypto from 'crypto';

export async function POST(request: Request) {
  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await request.text();
  const rawBodyBuffer = Buffer.from(rawBody, 'utf-8');
  const bodySignature = sha1(rawBodyBuffer, signatureSecret);

  if (bodySignature !== request.headers.get('x-vercel-signature')) {
    return Response.json(
      {
        code: 'invalid_signature',
        error: "signature didn't match",
      },
      { status: 403 },
    );
  }

  console.log(rawBody);

  return Response.json({ success: true });
}

function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}
```

```js filename="server.js" framework=nextjs
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request,
  response,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await getRawBody(request);
  const bodySignature = sha1(rawBody, signatureSecret);

  if (bodySignature !== request.headers['x-vercel-signature']) {
    return response.status(403).json({
      code: 'invalid_signature',
      error: "signature didn't match",
    });
  }

  console.log(rawBody);

  response.status(200).json({ success: true });
}

function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```ts filename="server.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await getRawBody(request);
  const bodySignature = sha1(rawBody, signatureSecret);

  if (bodySignature !== request.headers['x-vercel-signature']) {
    return response.status(403).json({
      code: 'invalid_signature',
      error: "signature didn't match",
    });
  }

  console.log(rawBody);

  response.status(200).json({ success: true });
}

async function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```js filename="server.js" framework=other
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request,
  response,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await getRawBody(request);
  const bodySignature = sha1(rawBody, signatureSecret);

  if (bodySignature !== request.headers['x-vercel-signature']) {
    return response.status(403).json({
      code: 'invalid_signature',
      error: "signature didn't match",
    });
  }

  console.log(rawBody);

  response.status(200).json({ success: true });
}

function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```ts filename="server.ts" framework=other
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  // Store the signature secret in environment variables
  const signatureSecret = '<Drain signature secret>';

  const rawBody = await getRawBody(request);
  const bodySignature = sha1(rawBody, signatureSecret);

  if (bodySignature !== request.headers['x-vercel-signature']) {
    return response.status(403).json({
      code: 'invalid_signature',
      error: "signature didn't match",
    });
  }

  console.log(rawBody);

  response.status(200).json({ success: true });
}

function sha1(data: Buffer, secret: string): string {
  return crypto.createHmac('sha1', secret).update(data).digest('hex');
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

> **💡 Note:** For enhanced security against timing attacks, use constant-time comparison when verifying the `x-vercel-signature` header. See [x-vercel-signature in Request Headers](/docs/headers/request-headers#x-vercel-signature).

For additional authentication or identification purposes, you can also add custom headers when [configuring the Drain destination](/docs/drains/using-drains#custom-headers-optional)

## IP Address Visibility

> **🔒 Permissions Required**: Managing IP address visibility

Drains can include public IP addresses in the data, which may be considered personal information under certain data protection laws. To hide IP addresses in your drains:

1. Go to the Vercel [dashboard](/dashboard) and ensure your team is selected in the scope selector
2. Go to the **Settings** tab and navigate to **Security & Privacy**
3. Under **IP Address Visibility**, toggle the switch off so the text reads **IP addresses are hidden in your Drains**

This setting is applied team-wide across all projects and drains.

## More resources

For more information on Drains security and how to use them, check out the following resources:

- [Drains overview](/docs/drains)
- [Configure Drains](/docs/drains/using-drains)
- [Log Drains reference](/docs/drains/reference/logs)


---

[View full sitemap](/docs/sitemap)
