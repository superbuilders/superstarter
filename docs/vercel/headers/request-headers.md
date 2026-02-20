---
title: Request headers
product: vercel
url: /docs/headers/request-headers
type: reference
prerequisites:
  - /docs/headers
related:
  - /docs/functions
  - /docs/regions
  - /docs/webhooks
  - /docs/drains
  - /docs/drains/security
summary: Learn about the request headers sent to each Vercel deployment and how to use them to process requests before sending a response.
---

# Request headers

The following headers are sent to each Vercel deployment and can be used to process the request before sending back a response. These headers can be read from the [Request](https://nodejs.org/api/http.html#http_message_headers) object in your [Vercel Function](/docs/functions).

## `host`

This header represents the domain name as it was accessed by the client. If the deployment has been assigned to a preview URL or production domain and the client visits the domain URL, it contains the custom domain instead of the underlying deployment URL.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const host = request.headers.get('host');
  return new Response(`Host: ${host}`);
}
```

## `x-vercel-id`

This header contains a list of [Vercel regions](/docs/regions) your request hit, as well as the region the function was executed in (for both Edge and Serverless).

It also allows Vercel to automatically prevent infinite loops.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const vercelId = request.headers.get('x-vercel-id');
  return new Response(`Vercel ID: ${vercelId}`);
}
```

## `x-forwarded-host`

This header is identical to the `host` header.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const host = request.headers.get('x-forwarded-host');
  return new Response(`Host: ${host}`);
}
```

## `x-forwarded-proto`

This header represents the protocol of the forwarded server, typically `https` in production and `http`in development.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const protocol = request.headers.get('x-forwarded-proto');
  return new Response(`Protocol: ${protocol}`);
}
```

## `x-forwarded-for`

The public IP address of the client that made the request.

If you are trying to use Vercel behind a proxy, we currently overwrite the [`X-Forwarded-For`](https://developer.mozilla.org/docs/Web/HTTP/Headers/X-Forwarded-For) header and **do not forward external IPs**. This restriction is in place to prevent IP spoofing.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const ip = request.headers.get('x-forwarded-for');
  return new Response(`IP: ${ip}`);
}
```

### Custom `X-Forwarded-For` IP

> **🔒 Permissions Required**: Trusted Proxy

**Enterprise customers** can purchase and enable a trusted proxy to allow your custom `X-Forwarded-For` IP. [Contact us](/contact/sales) for more information.

## `x-vercel-forwarded-for`

This header is identical to the `x-forwarded-for` header. However, `x-forwarded-for` could be overwritten if you're using a proxy on top of Vercel.

## `x-real-ip`

This header is identical to the `x-forwarded-for` header.

## `x-vercel-deployment-url`

This header represents the unique deployment, not the preview URL or production domain. For example, `*.vercel.app`.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const deploymentUrl = request.headers.get('x-vercel-deployment-url');
  return new Response(`Deployment URL: ${deploymentUrl}`);
}
```

## `x-vercel-ip-continent`

A two-character [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1) code representing the continent associated with the location of the requester's public IP address. Codes used to identify continents are as follows:

- `AF` for Africa
- `AN` for Antarctica
- `AS` for Asia
- `EU` for Europe
- `NA` for North America
- `OC` for Oceania
- `SA` for South America

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const continent = request.headers.get('x-vercel-ip-continent');
  return new Response(`Continent: ${continent}`);
}
```

## `x-vercel-ip-country`

A two-character [ISO 3166-1](https://en.wikipedia.org/wiki/ISO_3166-1) country code for the country associated with the location of the requester's public IP address.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const country = request.headers.get('x-vercel-ip-country');
  return new Response(`Country: ${country}`);
}
```

## `x-vercel-ip-country-region`

A string of up to three characters containing the region-portion of the [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2) code for the first level region associated with the requester's public IP address. Some countries have two levels of subdivisions, in which case this is the least specific one. For example, in the United Kingdom this will be a country like "England", not a county like "Devon".

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const region = request.headers.get('x-vercel-ip-country-region');
  return new Response(`Region: ${region}`);
}
```

## `x-vercel-ip-city`

The city name for the location of the requester's public IP address. Non-ASCII characters are encoded according to [RFC3986](https://tools.ietf.org/html/rfc3986).

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const city = request.headers.get('x-vercel-ip-city');
  return new Response(`City: ${city}`);
}
```

## `x-vercel-ip-latitude`

The latitude for the location of the requester's public IP address. For example, `37.7749`.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const latitude = request.headers.get('x-vercel-ip-latitude');
  return new Response(`Latitude: ${latitude}`);
}
```

## `x-vercel-ip-longitude`

The longitude for the location of the requester's public IP address. For example, `-122.4194`.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const longitude = request.headers.get('x-vercel-ip-longitude');
  return new Response(`Longitude: ${longitude}`);
}
```

## `x-vercel-ip-timezone`

The name of the time zone for the location of the requester's public IP address in ICANN Time Zone Database name format such as `America/Chicago`.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const timezone = request.headers.get('x-vercel-ip-timezone');
  return new Response(`Timezone: ${timezone}`);
}
```

## `x-vercel-ip-postal-code`

The postal code close to the user's location.

```ts filename="app/api/header/route.ts" framework=nextjs
export function GET(request: Request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs
export function GET(request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

```ts filename="api/header.ts" framework=other
export function GET(request: Request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

```js filename="api/header.js" framework=other
export function GET(request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

```ts filename="app/api/header/route.ts" framework=nextjs-app
export function GET(request: Request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

```js filename="app/api/header/route.js" framework=nextjs-app
export function GET(request) {
  const postalCode = request.headers.get('x-vercel-ip-postal-code');
  return new Response(`Postal Code: ${postalCode}`);
}
```

## `x-vercel-signature`

Vercel sends an `x-vercel-signature` header with requests from [Webhooks](/docs/webhooks), [Log Drains](/docs/drains), and other services. The header contains an HMAC-SHA1 signature that you can use to verify the request came from Vercel.

### 1. Reading the header value

First, let's see how to read the header value from incoming requests:

```ts filename="app/api/webhook/route.ts" framework=nextjs
export function POST(request: Request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

```js filename="app/api/webhook/route.js" framework=nextjs
export function POST(request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

```ts filename="api/webhook.ts" framework=other
export function POST(request: Request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

```js filename="api/webhook.js" framework=other
export function POST(request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

```ts filename="app/api/webhook/route.ts" framework=nextjs-app
export function POST(request: Request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

```js filename="app/api/webhook/route.js" framework=nextjs-app
export function POST(request) {
  const signature = request.headers.get('x-vercel-signature');
  return new Response(`Signature: ${signature}`);
}
```

### 2. Verifying the signature

When your server has a public endpoint, anyone who knows the URL can send requests to it. Verify the signature to confirm the request came from Vercel and wasn't tampered with.

Vercel creates the signature as an HMAC-SHA1 hash of the raw request body using a secret key. To verify it, generate the same hash with your secret (See [Getting your signature secret](#3.-getting-your-signature-secret)) and compare the values:

```ts filename="app/api/webhook/route.ts" framework=nextjs-app
import crypto from 'crypto';

export async function POST(request: Request) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers.get('x-vercel-signature');

  const rawBody = await request.text();
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody);
  return Response.json({ success: true });
}
```

```js filename="app/api/webhook/route.js" framework=nextjs-app
import crypto from 'crypto';

export async function POST(request) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers.get('x-vercel-signature');

  const rawBody = await request.text();
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody);
  return Response.json({ success: true });
}
```

```ts filename="pages/api/webhook.ts" framework=nextjs
import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers['x-vercel-signature'];

  const rawBody = await getRawBody(request);
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    typeof headerSignature !== 'string' ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return response.status(403).json({ error: 'Invalid signature' });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody.toString('utf-8'));
  return response.status(200).json({ success: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```js filename="pages/api/webhook.js" framework=nextjs
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(request, response) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers['x-vercel-signature'];

  const rawBody = await getRawBody(request);
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    typeof headerSignature !== 'string' ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return response.status(403).json({ error: 'Invalid signature' });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody.toString('utf-8'));
  return response.status(200).json({ success: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```ts filename="api/webhook.ts" framework=other
import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers['x-vercel-signature'];

  const rawBody = await getRawBody(request);
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    typeof headerSignature !== 'string' ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return response.status(403).json({ error: 'Invalid signature' });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody.toString('utf-8'));
  return response.status(200).json({ success: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

```js filename="api/webhook.js" framework=other
import crypto from 'crypto';
import getRawBody from 'raw-body';

export default async function handler(request, response) {
  const signatureSecret = process.env.WEBHOOK_SECRET;
  const headerSignature = request.headers['x-vercel-signature'];

  const rawBody = await getRawBody(request);
  const bodySignature = crypto
    .createHmac('sha1', signatureSecret)
    .update(rawBody)
    .digest('hex');

  // Use constant-time comparison to prevent timing attacks
  if (
    !headerSignature ||
    typeof headerSignature !== 'string' ||
    headerSignature.length !== bodySignature.length ||
    !crypto.timingSafeEqual(
      Buffer.from(headerSignature),
      Buffer.from(bodySignature)
    )
  ) {
    return response.status(403).json({ error: 'Invalid signature' });
  }

  // Process the verified request
  const payload = JSON.parse(rawBody.toString('utf-8'));
  return response.status(200).json({ success: true });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
```

### 3. Getting your signature secret

The secret key you need depends on what type of request you're receiving:

- **For account webhooks**: The secret displayed when [creating the webhook](/docs/webhooks#enter-your-endpoint-url)
- **For integration webhooks**: Your Integration Secret (also called Client Secret) from the [Integration Console](https://vercel.com/dashboard/integrations/console)
- **For log drains**: Click **Edit** in the Drains list to find or update your [Drain signature secret](/docs/drains/security)

For complete examples with additional error handling, see [Securing webhooks](/docs/webhooks/webhooks-api#securing-webhooks) and [Drain security](/docs/drains/security).


---

[View full sitemap](/docs/sitemap)
